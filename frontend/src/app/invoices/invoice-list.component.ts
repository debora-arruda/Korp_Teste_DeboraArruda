import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoiceService } from '../core/services/invoice.service';
import { Invoice } from '../core/models/invoice.model';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatProgressSpinnerModule, MatChipsModule, MatSnackBarModule,
  ],
  template: `
    <mat-card class="page-card">
      <mat-card-header>
        <mat-card-title>Notas Fiscais</mat-card-title>
        <span class="spacer"></span>
        <button mat-raised-button color="primary" [routerLink]="['/invoices/new']">
          <mat-icon>add</mat-icon> Nova Nota
        </button>
      </mat-card-header>

      <mat-card-content>
        <div *ngIf="loading()" class="loading-wrapper">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="error()" class="error-banner">
          <mat-icon>error</mat-icon> {{ error() }}
          <button mat-button (click)="load()">Tentar novamente</button>
        </div>

        <table mat-table [dataSource]="invoices()" *ngIf="!loading() && !error()">
          <ng-container matColumnDef="number">
            <th mat-header-cell *matHeaderCellDef>Número</th>
            <td mat-cell *matCellDef="let inv">#{{ inv.number }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let inv">
              <mat-chip [color]="inv.status === 'open' ? 'primary' : 'accent'" highlighted>
                {{ inv.status === 'open' ? 'Aberta' : 'Fechada' }}
              </mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="items">
            <th mat-header-cell *matHeaderCellDef>Itens</th>
            <td mat-cell *matCellDef="let inv">{{ inv.items?.length ?? 0 }}</td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Data</th>
            <td mat-cell *matCellDef="let inv">{{ inv.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Ações</th>
            <td mat-cell *matCellDef="let inv">
              <button mat-icon-button color="primary" [routerLink]="['/invoices', inv.id]" title="Ver detalhes">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="columns.length">Nenhuma nota fiscal cadastrada</td>
          </tr>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-card { margin: 24px; }
    mat-card-header { display: flex; align-items: center; margin-bottom: 16px; }
    .spacer { flex: 1; }
    .loading-wrapper { display: flex; justify-content: center; padding: 40px; }
    .error-banner { display: flex; align-items: center; gap: 8px; color: #f44336; padding: 16px; }
    table { width: 100%; }
    .no-data { text-align: center; padding: 24px; color: #888; }
  `]
})
export class InvoiceListComponent implements OnInit {
  invoices = signal<Invoice[]>([]);
  loading = signal(false);
  error = signal('');
  columns = ['number', 'status', 'items', 'createdAt', 'actions'];

  constructor(private invoiceService: InvoiceService, private snack: MatSnackBar, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.invoiceService.getAll().subscribe({
      next: (data) => { this.invoices.set(data ?? []); this.loading.set(false); },
      error: (err) => { this.error.set(err.message); this.loading.set(false); }
    });
  }
}
