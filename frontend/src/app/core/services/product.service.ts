import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Product, CreateProductDto } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly url = `${environment.inventoryApi}/products`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.url).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(this.url, dto).pipe(
      catchError(this.handleError)
    );
  }

  update(id: number, dto: CreateProductDto): Observable<Product> {
    return this.http.put<Product>(`${this.url}/${id}`, dto).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Erro desconhecido';
    if (error.status === 0) {
      message = 'Serviço de estoque indisponível. Tente novamente.';
    } else if (error.error?.message) {
      message = error.error.message;
    } else {
      message = `Erro ${error.status}: ${error.statusText}`;
    }
    return throwError(() => new Error(message));
  }
}
