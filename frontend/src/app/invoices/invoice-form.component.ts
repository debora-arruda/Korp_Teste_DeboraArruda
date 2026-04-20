import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ProductService } from '../core/services/product.service';
import { InvoiceService } from '../core/services/invoice.service';
import { Product } from '../core/models/product.model';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <mat-card class="page-card">
      <mat-card-header>
        <mat-card-title>Nova Nota Fiscal</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <div *ngIf="loadingProducts" class="loading-wrapper">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Carregando produtos...</p>
        </div>

        <div *ngIf="productError" class="error-banner">
          <mat-icon>error</mat-icon> {{ productError }}
        </div>

        <form [formGroup]="form" (ngSubmit)="save()" *ngIf="!loadingProducts && !productError">
          <h3>Itens da Nota</h3>

          <div formArrayName="items">
            <div *ngFor="let item of items.controls; let i = index" [formGroupName]="i" class="item-row">
              <mat-form-field appearance="outline" class="product-field">
                <mat-label>Produto</mat-label>
                <mat-select formControlName="productId" (selectionChange)="onProductChange(i)">
                  <mat-option *ngFor="let p of products" [value]="p.id">
                    {{ p.code }} - {{ p.description }} (Saldo: {{ p.balance }})
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="item.get('productId')?.hasError('required')">Selecione um produto</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="qty-field">
                <mat-label>Quantidade</mat-label>
                <input matInput type="number" formControlName="quantity" min="1" [max]="getMaxQty(i)">
                <mat-error *ngIf="item.get('quantity')?.hasError('required')">Obrigatório</mat-error>
                <mat-error *ngIf="item.get('quantity')?.hasError('min')">Mín. 1</mat-error>
                <mat-error *ngIf="item.get('quantity')?.hasError('max')">Excede saldo</mat-error>
              </mat-form-field>

              <button mat-icon-button color="warn" type="button" (click)="removeItem(i)" *ngIf="items.length > 1">
                <mat-icon>remove_circle</mat-icon>
              </button>
            </div>
          </div>

          <button mat-stroked-button type="button" (click)="addItem()" class="add-item-btn">
            <mat-icon>add</mat-icon> Adicionar Produto
          </button>

          <mat-divider class="divider"></mat-divider>

          <div class="form-actions">
            <button mat-button type="button" routerLink="/invoices">Cancelar</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
              <mat-spinner *ngIf="saving" diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
              {{ saving ? 'Salvando...' : 'Criar Nota Fiscal' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-card { margin: 24px; max-width: 800px; }
    .loading-wrapper { display: flex; align-items: center; gap: 16px; padding: 24px; }
    .error-banner { display: flex; align-items: center; gap: 8px; color: #f44336; padding: 16px; }
    .item-row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 8px; }
    .product-field { flex: 2; }
    .qty-field { flex: 1; }
    .add-item-btn { margin-top: 8px; }
    .divider { margin: 24px 0; }
    .form-actions { display: flex; gap: 16px; justify-content: flex-end; }
  `]
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  products: Product[] = [];
  loadingProducts = false;
  productError = '';
  saving = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private invoiceService: InvoiceService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.form = this.fb.group({ items: this.fb.array([this.createItemGroup()]) });
    this.loadProducts();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  createItemGroup() {
    return this.fb.group({
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addItem() { this.items.push(this.createItemGroup()); }

  removeItem(i: number) { this.items.removeAt(i); }

  getMaxQty(i: number): number {
    const pid = this.items.at(i).get('productId')?.value;
    const p = this.products.find(x => x.id === pid);
    return p?.balance ?? 9999;
  }

  onProductChange(i: number) {
    const ctrl = this.items.at(i).get('quantity');
    ctrl?.setValidators([Validators.required, Validators.min(1), Validators.max(this.getMaxQty(i))]);
    ctrl?.updateValueAndValidity();
  }

  loadProducts() {
    this.loadingProducts = true;
    this.productService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.products = data; this.loadingProducts = false; },
        error: (err) => { this.productError = err.message; this.loadingProducts = false; }
      });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    this.invoiceService.create({ items: this.form.value.items })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inv) => {
          this.snack.open('Nota fiscal criada!', 'OK', { duration: 3000 });
          this.router.navigate(['/invoices', inv.id]);
        },
        error: (err) => {
          this.snack.open(err.message, 'Fechar', { duration: 5000 });
          this.saving = false;
        }
      });
  }
}
