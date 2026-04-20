export interface Product {
  id: number;
  code: string;
  description: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductDto {
  code: string;
  description: string;
  balance: number;
}
