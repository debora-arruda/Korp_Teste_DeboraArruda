package main

import (
	"billing-service/handlers"
	"billing-service/repository"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	dsn := getenv("DATABASE_URL", "host=localhost port=5432 user=postgres password=postgres dbname=billing sslmode=disable")

	db, err := connectWithRetry(dsn, 10)
	if err != nil {
		log.Fatalf("Falha ao conectar ao banco: %v", err)
	}
	defer db.Close()

	repo := repository.NewInvoiceRepository(db)
	if err := repo.Migrate(); err != nil {
		log.Fatalf("Falha na migração: %v", err)
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4200"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok", "service": "billing"}) })

	api := r.Group("/api")
	handler := handlers.NewInvoiceHandler(repo)
	handler.RegisterRoutes(api)

	port := getenv("PORT", "8082")
	log.Printf("Billing Service rodando na porta %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func connectWithRetry(dsn string, attempts int) (*sqlx.DB, error) {
	for i := 0; i < attempts; i++ {
		db, err := sqlx.Connect("postgres", dsn)
		if err == nil {
			log.Println("Conectado ao banco de dados!")
			return db, nil
		}
		log.Printf("Tentativa %d/%d falhou: %v. Aguardando 3s...", i+1, attempts, err)
		time.Sleep(3 * time.Second)
	}
	return nil, fmt.Errorf("não foi possível conectar após %d tentativas", attempts)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
