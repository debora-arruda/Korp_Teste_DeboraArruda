package models

import "time"

type InvoiceStatus string

const (
	StatusOpen   InvoiceStatus = "open"
	StatusClosed InvoiceStatus = "closed"
)

type InvoiceItem struct {
	ID                 int64  `db:"id" json:"id"`
	InvoiceID          int64  `db:"invoice_id" json:"invoiceId"`
	ProductID          int64  `db:"product_id" json:"productId"`
	ProductCode        string `db:"product_code" json:"productCode"`
	ProductDescription string `db:"product_description" json:"productDescription"`
	Quantity           int    `db:"quantity" json:"quantity"`
}

type Invoice struct {
	ID        int64         `db:"id" json:"id"`
	Number    int64         `db:"number" json:"number"`
	Status    InvoiceStatus `db:"status" json:"status"`
	CreatedAt time.Time     `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time     `db:"updated_at" json:"updatedAt"`
	Items     []InvoiceItem `db:"-" json:"items"`
}

type CreateInvoiceItemRequest struct {
	ProductID int64 `json:"productId" binding:"required"`
	Quantity  int   `json:"quantity" binding:"required,min=1"`
}

type CreateInvoiceRequest struct {
	Items []CreateInvoiceItemRequest `json:"items" binding:"required,min=1"`
}
