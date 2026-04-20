import { Routes } from '@angular/router';
import { ProductListComponent } from './products/product-list.component';
import { InvoiceListComponent } from './invoices/invoice-list.component';
import { InvoiceFormComponent } from './invoices/invoice-form.component';
import { InvoiceDetailComponent } from './invoices/invoice-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductListComponent },
  { path: 'invoices', component: InvoiceListComponent },
  { path: 'invoices/new', component: InvoiceFormComponent },
  { path: 'invoices/:id', component: InvoiceDetailComponent },
];
