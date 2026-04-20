import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoiceService } from '../core/services/invoice.service';
import { Invoice } from '../core/models/invoice.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule, MatTableModule,
    MatDividerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-wrapper">
      <div *ngIf="loading" class="loading-wrapper">
        <mat-spinner diameter="60"></mat-spinner>
      </div>

      <div *ngIf="error" class="error-banner">
        <mat-icon>error</mat-icon> {{ error }}
        <button mat-button (click)="load()">Tentar novamente</button>
      </div>

      <mat-card *ngIf="invoice && !loading" class="invoice-card">
        <mat-card-header>
          <mat-card-title>Nota Fiscal #{{ invoice.number }}</mat-card-title>
          <span class="spacer"></span>
          <mat-chip [color]="invoice.status === 'open' ? 'primary' : 'accent'" highlighted>
            {{ invoice.status === 'open' ? 'Aberta' : 'Fechada' }}
          </mat-chip>
        </mat-card-header>

        <mat-card-content>
          <p class="date">Emitida em: {{ invoice.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>

          <mat-divider></mat-divider>

          <h3>Produtos</h3>
          <table mat-table [dataSource]="invoice.items" class="items-table">
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Código</th>
              <td mat-cell *matCellDef="let item">{{ item.productCode }}</td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let item">{{ item.productDescription }}</td>
            </ng-container>
            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>Quantidade</th>
              <td mat-cell *matCellDef="let item">{{ item.quantity }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </mat-card-content>

        <mat-card-actions>
          <button mat-button routerLink="/invoices">
            <mat-icon>arrow_back</mat-icon> Voltar
          </button>
          <span class="spacer"></span>
          <button
            mat-raised-button
            color="primary"
            (click)="print()"
            [disabled]="invoice.status !== 'open' || printing"
            class="print-btn">
            <mat-spinner *ngIf="printing" diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
            <mat-icon *ngIf="!printing">print</mat-icon>
            {{ printing ? 'Processando...' : 'Imprimir Nota' }}
          </button>
        </mat-card-actions>

        <div *ngIf="invoice.status === 'closed'" class="closed-notice">
          <mat-icon>lock</mat-icon> Esta nota já foi impressa e está fechada.
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 24px; }
    .loading-wrapper { display: flex; justify-content: center; padding: 80px; }
    .error-banner { display: flex; align-items: center; gap: 8px; color: #f44336; padding: 16px; }
    .invoice-card { max-width: 800px; }
    mat-card-header { display: flex; align-items: center; margin-bottom: 16px; }
    .spacer { flex: 1; }
    .date { color: #666; margin: 16px 0; }
    .items-table { width: 100%; margin-top: 16px; }
    mat-card-actions { display: flex; align-items: center; padding: 16px; }
    .print-btn { min-width: 180px; }
    .closed-notice {
      display: flex; align-items: center; gap: 8px;
      background: #fff3e0; color: #e65100;
      padding: 12px 16px; border-radius: 4px; margin: 0 16px 16px;
    }
  `]
})
export class InvoiceDetailComponent implements OnInit, OnDestroy {
  invoice: Invoice | null = null;
  columns = ['code', 'description', 'quantity'];
  loading = false;
  printing = false;
  error = '';
  private destroy$ = new Subject<void>();

  constructor(
    private invoiceService: InvoiceService,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {}

  ngOnInit() { this.load(); }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true;
    this.error = '';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.invoiceService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inv) => { this.invoice = inv; this.loading = false; },
        error: (err) => { this.error = err.message; this.loading = false; }
      });
  }

  print() {
    if (!this.invoice || this.invoice.status !== 'open') return;
    this.printing = true;
    this.invoiceService.print(this.invoice.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.invoice = updated;
          this.printing = false;
          this.snack.open('Nota fiscal impressa e fechada com sucesso!', 'OK', { duration: 4000 });
        },
        error: (err) => {
          this.printing = false;
          this.snack.open(err.message, 'Fechar', { duration: 6000 });
        }
      });
  }
}
