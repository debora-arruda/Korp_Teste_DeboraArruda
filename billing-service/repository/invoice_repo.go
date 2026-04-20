package repository

import (
	"billing-service/models"
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
)

type InvoiceRepository struct {
	db *sqlx.DB
}

func NewInvoiceRepository(db *sqlx.DB) *InvoiceRepository {
	return &InvoiceRepository{db: db}
}

func (r *InvoiceRepository) Migrate() error {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS invoices (
			id              SERIAL PRIMARY KEY,
			number          BIGINT UNIQUE NOT NULL,
			status          VARCHAR(10) NOT NULL DEFAULT 'open',
			idempotency_key VARCHAR(100) UNIQUE,
			created_at      TIMESTAMPTZ DEFAULT NOW(),
			updated_at      TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS invoice_items (
			id                  SERIAL PRIMARY KEY,
			invoice_id          INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
			product_id          BIGINT NOT NULL,
			product_code        VARCHAR(50) NOT NULL,
			product_description VARCHAR(255) NOT NULL,
			quantity            INT NOT NULL CHECK (quantity > 0)
		);
		CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
		CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
		CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
		ALTER TABLE invoices ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE;
	`)
	return err
}

func (r *InvoiceRepository) FindAll() ([]models.Invoice, error) {
	var invoices []models.Invoice
	err := r.db.Select(&invoices, `SELECT * FROM invoices ORDER BY number DESC`)
	if err != nil {
		return nil, err
	}
	for i := range invoices {
		items, err := r.findItems(invoices[i].ID)
		if err != nil {
			return nil, err
		}
		invoices[i].Items = items
	}
	return invoices, nil
}

func (r *InvoiceRepository) FindByID(id int64) (*models.Invoice, error) {
	var inv models.Invoice
	err := r.db.Get(&inv, `SELECT * FROM invoices WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	items, err := r.findItems(id)
	if err != nil {
		return nil, err
	}
	inv.Items = items
	return &inv, nil
}

func (r *InvoiceRepository) findItems(invoiceID int64) ([]models.InvoiceItem, error) {
	var items []models.InvoiceItem
	err := r.db.Select(&items, `SELECT * FROM invoice_items WHERE invoice_id = $1`, invoiceID)
	if items == nil {
		items = []models.InvoiceItem{}
	}
	return items, err
}

func (r *InvoiceRepository) Create(req models.CreateInvoiceRequest, productDetails map[int64]struct{ Code, Description string }) (*models.Invoice, error) {
	if req.IdempotencyKey != "" {
		var existing models.Invoice
		err := r.db.Get(&existing, `SELECT * FROM invoices WHERE idempotency_key = $1`, req.IdempotencyKey)
		if err == nil {
			items, _ := r.findItems(existing.ID)
			existing.Items = items
			return &existing, nil
		}
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var number int64
	err = tx.QueryRow(`SELECT nextval('invoice_number_seq')`).Scan(&number)
	if err != nil {
		return nil, err
	}

	var inv models.Invoice
	if req.IdempotencyKey != "" {
		err = tx.QueryRowx(
			`INSERT INTO invoices (number, status, idempotency_key) VALUES ($1, 'open', $2) RETURNING *`,
			number, req.IdempotencyKey,
		).StructScan(&inv)
	} else {
		err = tx.QueryRowx(
			`INSERT INTO invoices (number, status) VALUES ($1, 'open') RETURNING *`,
			number,
		).StructScan(&inv)
	}
	if err != nil {
		return nil, err
	}

	for _, item := range req.Items {
		detail := productDetails[item.ProductID]
		_, err := tx.Exec(
			`INSERT INTO invoice_items (invoice_id, product_id, product_code, product_description, quantity)
			 VALUES ($1, $2, $3, $4, $5)`,
			inv.ID, item.ProductID, detail.Code, detail.Description, item.Quantity,
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.FindByID(inv.ID)
}

func (r *InvoiceRepository) ReopenInvoice(id int64) error {
	_, err := r.db.Exec(`UPDATE invoices SET status = 'open', updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *InvoiceRepository) CloseInvoice(id int64) (*models.Invoice, error) {
	var inv models.Invoice
	err := r.db.QueryRowx(
		`UPDATE invoices SET status = 'closed', updated_at = NOW() WHERE id = $1 AND status = 'open' RETURNING *`,
		id,
	).StructScan(&inv)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	items, _ := r.findItems(id)
	inv.Items = items
	return &inv, nil
}
