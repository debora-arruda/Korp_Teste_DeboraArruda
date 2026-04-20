export type InvoiceStatus = 'open' | 'closed';

export interface InvoiceItem {
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
}

export interface CreateInvoiceDto {
  items: { productId: number; quantity: number }[];
}
