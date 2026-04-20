import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../core/services/product.service';
import { Product } from '../core/models/product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar' : 'Novo' }} Produto</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Código</mat-label>
          <input matInput formControlName="code" placeholder="Ex: PROD001">
          <mat-error *ngIf="form.get('code')?.hasError('required')">Campo obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="description" placeholder="Nome do produto">
          <mat-error *ngIf="form.get('description')?.hasError('required')">Campo obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Saldo em Estoque</mat-label>
          <input matInput type="number" formControlName="balance" min="0">
          <mat-error *ngIf="form.get('balance')?.hasError('required')">Campo obrigatório</mat-error>
          <mat-error *ngIf="form.get('balance')?.hasError('min')">Mínimo 0</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="false">Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
          <mat-spinner *ngIf="saving" diameter="20" style="display:inline-block"></mat-spinner>
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 8px; }`]
})
export class ProductFormComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private dialogRef: MatDialogRef<ProductFormComponent>,
    private snack: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: Product | null
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data;
    this.form = this.fb.group({
      code: [this.data?.code ?? '', Validators.required],
      description: [this.data?.description ?? '', Validators.required],
      balance: [this.data?.balance ?? 0, [Validators.required, Validators.min(0)]]
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const dto = this.form.value;
    const op = this.isEdit
      ? this.productService.update(this.data!.id, dto)
      : this.productService.create(dto);

    op.subscribe({
      next: () => {
        this.snack.open(`Produto ${this.isEdit ? 'atualizado' : 'criado'}!`, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.snack.open(err.message, 'Fechar', { duration: 5000 });
        this.saving = false;
      }
    });
  }
}
