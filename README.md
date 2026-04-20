# Sistema de Notas Fiscais — Korp Teste Dev

A full-stack invoice and inventory management system built with Angular, Go microservices, and PostgreSQL, featuring AI-powered product description generation via Claude.

---

## Architecture

```
Korp_Teste_Dev/
├── frontend/            # Angular 21 (port 4200)
├── inventory-service/   # Go + Gin (port 8081)
├── billing-service/     # Go + Gin (port 8082)
└── docker-compose.yml
```

**Frontend** — Angular 21, TypeScript, Angular Material, RxJS, SCSS  
**Backend** — Go 1.22, Gin, sqlx, PostgreSQL 16  
**Infrastructure** — Docker Compose, Nginx  
**AI** — Anthropic Claude (product description suggestions)

---

## Features

- **Product management** — CRUD for products with stock balance tracking
- **Invoice lifecycle** — Create and close invoices (Open → Closed), with automatic stock deduction on print
- **Cross-service communication** — Billing service queries Inventory service for product validation and stock deduction
- **AI descriptions** — Generate product descriptions from a product code using Claude API
- **Idempotency** — Duplicate invoice creation is protected via idempotency keys

---

## Getting Started

### Docker Compose (recommended)

```bash
docker-compose up
```

This starts all services:

| Service           | URL                       |
|-------------------|---------------------------|
| Frontend          | http://localhost:4200      |
| Inventory API     | http://localhost:8081/api  |
| Billing API       | http://localhost:8082/api  |

### Local Development

**Frontend**
```bash
cd frontend
npm install
npm start       # Angular dev server on port 4200
npm test        # Run tests with Vitest
npm run build   # Production build → dist/frontend/browser
```

**Backend services** (requires PostgreSQL running locally)
```bash
cd inventory-service   # or billing-service
go mod tidy
go run main.go
```

---

## Environment Variables

| Variable           | Default                                                              | Used by           |
|--------------------|----------------------------------------------------------------------|-------------------|
| `DATABASE_URL`     | `host=localhost port=5432 user=postgres password=postgres dbname=<service> sslmode=disable` | Both services |
| `PORT`             | `8081` (inventory) / `8082` (billing)                                | Both services     |
| `INVENTORY_URL`    | `http://localhost:8081`                                              | Billing service   |
| `ANTHROPIC_API_KEY`| —                                                                    | Inventory service |

`ANTHROPIC_API_KEY` is optional. If not set, the description suggestion endpoint will not work.

---

## API Reference

### Inventory Service (`:8081`)

| Method | Path                              | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/health`                         | Health check                         |
| GET    | `/api/products`                   | List all products                    |
| GET    | `/api/products/:id`               | Get product by ID                    |
| POST   | `/api/products`                   | Create product                       |
| PUT    | `/api/products/:id`               | Update product                       |
| DELETE | `/api/products/:id`               | Delete product                       |
| POST   | `/api/products/deduct`            | Batch stock deduction                |
| POST   | `/api/products/suggest-description` | AI-generated description           |

### Billing Service (`:8082`)

| Method | Path                        | Description                               |
|--------|-----------------------------|-------------------------------------------|
| GET    | `/health`                   | Health check                              |
| GET    | `/api/invoices`             | List all invoices                         |
| GET    | `/api/invoices/:id`         | Get invoice by ID                         |
| POST   | `/api/invoices`             | Create invoice                            |
| POST   | `/api/invoices/:id/print`   | Close invoice and deduct stock            |

---

## Frontend Proxy (Development)

In development, Angular proxies API calls:

| Prefix              | Target                    |
|---------------------|---------------------------|
| `/api/inventory/*`  | `http://localhost:8081/api` |
| `/api/billing/*`    | `http://localhost:8082/api` |

Configuration: [frontend/proxy.conf.json](frontend/proxy.conf.json)
