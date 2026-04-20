package handlers

import (
	"billing-service/models"
	"billing-service/repository"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type InvoiceHandler struct {
	repo            *repository.InvoiceRepository
	inventoryClient *http.Client
	inventoryURL    string
}

func NewInvoiceHandler(repo *repository.InvoiceRepository) *InvoiceHandler {
	return &InvoiceHandler{
		repo:            repo,
		inventoryClient: &http.Client{Timeout: 5 * time.Second},
		inventoryURL:    getenv("INVENTORY_URL", "http://localhost:8081"),
	}
}

func (h *InvoiceHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/invoices", h.List)
	r.GET("/invoices/:id", h.GetByID)
	r.POST("/invoices", h.Create)
	r.POST("/invoices/:id/print", h.Print)
}

func (h *InvoiceHandler) List(c *gin.Context) {
	invoices, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao buscar notas: " + err.Error()})
		return
	}
	if invoices == nil {
		invoices = []models.Invoice{}
	}
	c.JSON(http.StatusOK, invoices)
}

func (h *InvoiceHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID inválido"})
		return
	}
	inv, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if inv == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Nota não encontrada"})
		return
	}
	c.JSON(http.StatusOK, inv)
}

func (h *InvoiceHandler) Create(c *gin.Context) {
	var req models.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos: " + err.Error()})
		return
	}

	productDetails, err := h.fetchProductDetails(req.Items)
	if err != nil {
		log.Printf("Inventory service error: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"message": "Serviço de estoque indisponível. Tente novamente em instantes.",
		})
		return
	}

	inv, err := h.repo.Create(req, productDetails)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao criar nota: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, inv)
}

func (h *InvoiceHandler) Print(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID inválido"})
		return
	}

	inv, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if inv == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Nota não encontrada"})
		return
	}
	if inv.Status != models.StatusOpen {
		c.JSON(http.StatusConflict, gin.H{"message": "Somente notas com status 'Aberta' podem ser impressas"})
		return
	}

	updated, err := h.repo.CloseInvoice(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao fechar nota: " + err.Error()})
		return
	}
	if updated == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Esta nota já foi fechada por outra operação"})
		return
	}

	if err := h.deductStock(inv); err != nil {
		log.Printf("Stock deduction error, reopening invoice %d: %v", id, err)
		_ = h.repo.ReopenInvoice(id)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"message": "Falha ao atualizar estoque: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *InvoiceHandler) fetchProductDetails(items []models.CreateInvoiceItemRequest) (map[int64]struct{ Code, Description string }, error) {
	type fetchResult struct {
		id   int64
		code string
		desc string
		err  error
	}

	ch := make(chan fetchResult, len(items))
	for _, item := range items {
		go func(id int64) {
			resp, err := h.inventoryClient.Get(fmt.Sprintf("%s/api/products/%d", h.inventoryURL, id))
			if err != nil {
				ch <- fetchResult{err: fmt.Errorf("serviço de estoque inacessível: %w", err)}
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				ch <- fetchResult{err: fmt.Errorf("produto %d não encontrado no estoque", id)}
				return
			}
			var p struct {
				Code        string `json:"code"`
				Description string `json:"description"`
			}
			body, _ := io.ReadAll(resp.Body)
			if err := json.Unmarshal(body, &p); err != nil {
				ch <- fetchResult{err: err}
				return
			}
			ch <- fetchResult{id: id, code: p.Code, desc: p.Description}
		}(item.ProductID)
	}

	result := make(map[int64]struct{ Code, Description string }, len(items))
	for range items {
		r := <-ch
		if r.err != nil {
			return nil, r.err
		}
		result[r.id] = struct{ Code, Description string }{r.code, r.desc}
	}
	return result, nil
}

func (h *InvoiceHandler) deductStock(inv *models.Invoice) error {
	type DeductItem struct {
		ProductID int64 `json:"productId"`
		Quantity  int   `json:"quantity"`
	}
	type DeductRequest struct {
		Items []DeductItem `json:"items"`
	}

	var deductItems []DeductItem
	for _, item := range inv.Items {
		deductItems = append(deductItems, DeductItem{ProductID: item.ProductID, Quantity: item.Quantity})
	}

	bodyBytes, _ := json.Marshal(DeductRequest{Items: deductItems})
	req, err := http.NewRequest(http.MethodPost,
		fmt.Sprintf("%s/api/products/deduct", h.inventoryURL),
		bytes.NewReader(bodyBytes),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.inventoryClient.Do(req)
	if err != nil {
		return fmt.Errorf("serviço de estoque inacessível: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		var errResp struct {
			Message string `json:"message"`
		}
		json.Unmarshal(body, &errResp)
		return fmt.Errorf("%s", errResp.Message)
	}
	return nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
