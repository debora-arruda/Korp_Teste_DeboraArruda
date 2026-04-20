import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar class="app-toolbar">
      <mat-icon>receipt_long</mat-icon>
      <span style="margin-left:8px">Sistema de Notas Fiscais</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/products" routerLinkActive="active-link">
        <mat-icon>inventory_2</mat-icon> Produtos
      </a>
      <a mat-button routerLink="/invoices" routerLinkActive="active-link">
        <mat-icon>description</mat-icon> Notas Fiscais
      </a>
    </mat-toolbar>

    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-toolbar { background: #1976d2 !important; color: white !important; }
    .app-toolbar mat-icon { color: white; }
    .spacer { flex: 1; }
    a[mat-button] { color: white !important; text-decoration: none; margin-left: 8px; }
    .active-link { background: rgba(255,255,255,0.15) !important; border-radius: 4px; }
    main { background: #f5f5f5; min-height: calc(100vh - 64px); }
  `]
})
export class App {}
