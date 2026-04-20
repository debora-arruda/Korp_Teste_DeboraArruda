package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"inventory-service/models"

	"github.com/jmoiron/sqlx"
)

type ProductRepository struct {
	db *sqlx.DB
}

func NewProductRepository(db *sqlx.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) Migrate() error {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS products (
			id          SERIAL PRIMARY KEY,
			code        VARCHAR(50) UNIQUE NOT NULL,
			description VARCHAR(255) NOT NULL,
			balance     INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
			created_at  TIMESTAMPTZ DEFAULT NOW(),
			updated_at  TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
		CREATE INDEX IF NOT EXISTS idx_products_id ON products(id);
	`)
	return err
}

func (r *ProductRepository) FindAll() ([]models.Product, error) {
	var products []models.Product
	err := r.db.Select(&products, `SELECT * FROM products ORDER BY id`)
	return products, err
}

func (r *ProductRepository) FindByID(id int64) (*models.Product, error) {
	var p models.Product
	err := r.db.Get(&p, `SELECT * FROM products WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}

func (r *ProductRepository) Create(req models.CreateProductRequest) (*models.Product, error) {
	var p models.Product
	err := r.db.QueryRowx(
		`INSERT INTO products (code, description, balance) VALUES ($1, $2, $3)
		 RETURNING *`,
		req.Code, req.Description, req.Balance,
	).StructScan(&p)
	return &p, err
}

func (r *ProductRepository) Update(id int64, req models.CreateProductRequest) (*models.Product, error) {
	var p models.Product
	err := r.db.QueryRowx(
		`UPDATE products SET code=$1, description=$2, balance=$3, updated_at=NOW()
		 WHERE id=$4 RETURNING *`,
		req.Code, req.Description, req.Balance, id,
	).StructScan(&p)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}

func (r *ProductRepository) Delete(id int64) error {
	result, err := r.db.Exec(`DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeductStock deducts quantities atomically within a transaction.
// Uses SELECT FOR UPDATE to prevent race conditions (concurrency handling).
func (r *ProductRepository) DeductStock(items []models.DeductItem) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		var balance int
		err := tx.QueryRow(
			`SELECT balance FROM products WHERE id = $1 FOR UPDATE`,
			item.ProductID,
		).Scan(&balance)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("produto %d não encontrado", item.ProductID)
		}
		if err != nil {
			return err
		}
		if balance < item.Quantity {
			return fmt.Errorf("saldo insuficiente para o produto %d (disponível: %d, solicitado: %d)",
				item.ProductID, balance, item.Quantity)
		}
		_, err = tx.Exec(
			`UPDATE products SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
			item.Quantity, item.ProductID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
