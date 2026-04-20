export interface Product {
  id: number;
  code: string;
  description: string;
  balance: number;
}

export interface CreateProductDto {
  code: string;
  description: string;
  balance: number;
}
