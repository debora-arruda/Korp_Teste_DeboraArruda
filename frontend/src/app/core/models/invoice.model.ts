export type InvoiceStatus = 'open' | 'closed';

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  productId: number;
  productCode: string;
  productDescription: string;
  quantity: number;
}

export interface Invoice {
  id: number;
  number: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceDto {
  idempotencyKey: string;
  items: { productId: number; quantity: number }[];
}
