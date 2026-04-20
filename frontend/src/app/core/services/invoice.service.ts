import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Invoice, CreateInvoiceDto } from '../models/invoice.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly url = `${environment.billingApi}/invoices`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.url).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.url}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  create(dto: CreateInvoiceDto): Observable<Invoice> {
    return this.http.post<Invoice>(this.url, dto).pipe(
      catchError(this.handleError)
    );
  }

  print(id: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.url}/${id}/print`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Erro desconhecido';
    if (error.status === 0) {
      message = 'Serviço de faturamento indisponível. Tente novamente.';
    } else if (error.error?.message) {
      message = error.error.message;
    } else {
      message = `Erro ${error.status}: ${error.statusText}`;
    }
    return throwError(() => new Error(message));
  }
}
