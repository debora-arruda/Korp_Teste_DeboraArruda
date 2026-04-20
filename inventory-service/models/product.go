package models

import "time"

type Product struct {
	ID          int64     `db:"id" json:"id"`
	Code        string    `db:"code" json:"code"`
	Description string    `db:"description" json:"description"`
	Balance     int       `db:"balance" json:"balance"`
	CreatedAt   time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `db:"updated_at" json:"updatedAt"`
}

type CreateProductRequest struct {
	Code        string `json:"code" binding:"required"`
	Description string `json:"description" binding:"required"`
	Balance     int    `json:"balance" binding:"min=0"`
}

type DeductStockRequest struct {
	Items []DeductItem `json:"items" binding:"required"`
}

type DeductItem struct {
	ProductID int64 `json:"productId" binding:"required"`
	Quantity  int   `json:"quantity" binding:"required,min=1"`
}
