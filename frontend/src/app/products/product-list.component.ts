import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../core/services/product.service';
import { Product } from '../core/models/product.model';
import { ProductFormComponent } from './product-form.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <mat-card class="page-card">
      <mat-card-header>
        <mat-card-title>Produtos</mat-card-title>
        <span class="spacer"></span>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> Novo Produto
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

        <table mat-table [dataSource]="products()" *ngIf="!loading() && !error()">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let p">{{ p.code }}</td>
          </ng-container>
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Descrição</th>
            <td mat-cell *matCellDef="let p">{{ p.description }}</td>
          </ng-container>
          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef>Saldo</th>
            <td mat-cell *matCellDef="let p">
              <span [class.low-stock]="p.balance <= 5">{{ p.balance }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Ações</th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button color="primary" (click)="openForm(p)" title="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="delete(p)" title="Excluir">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="columns.length">Nenhum produto cadastrado</td>
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
    .low-stock { color: #f44336; font-weight: bold; }
    .no-data { text-align: center; padding: 24px; color: #888; }
  `]
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal('');
  columns = ['code', 'description', 'balance', 'actions'];

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.productService.getAll().subscribe({
      next: (data) => { this.products.set(data ?? []); this.loading.set(false); },
      error: (err) => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  openForm(product?: Product) {
    const ref = this.dialog.open(ProductFormComponent, { width: '500px', data: product ?? null });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  delete(product: Product) {
    if (!confirm(`Excluir "${product.description}"?`)) return;
    this.productService.delete(product.id).subscribe({
      next: () => { this.snack.open('Produto excluído', 'OK', { duration: 3000 }); this.load(); },
      error: (err) => this.snack.open(err.message, 'Fechar', { duration: 5000 })
    });
  }
}
