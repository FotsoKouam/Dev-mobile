import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Form fields
  identifier = '';
  password = '';

  // UI state
  showPassword = false;
  isLoading = signal(false);
  activeTab = signal<'login' | 'institutional'>('login');
  institutionalTooltip = signal(false);
  forgotPasswordTooltip = signal(false);

  // Error messages
  identifierError = signal<string | null>(null);
  passwordError = signal<string | null>(null);
  globalError = signal<string | null>(null);

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onTabClick(tab: 'login' | 'institutional'): void {
    if (tab === 'institutional') {
      this.institutionalTooltip.set(true);
      setTimeout(() => this.institutionalTooltip.set(false), 2500);
      return;
    }
    this.activeTab.set('login');
  }

  onForgotPasswordClick(event: Event): void {
    event.preventDefault();
    this.forgotPasswordTooltip.set(true);
    setTimeout(() => this.forgotPasswordTooltip.set(false), 2500);
  }

  validate(): boolean {
    let isValid = true;
    this.identifierError.set(null);
    this.passwordError.set(null);
    this.globalError.set(null);

    const trimmedIdentifier = this.identifier.trim();

    if (!trimmedIdentifier) {
      this.identifierError.set('Saisissez votre identifiant ou votre email.');
      isValid = false;
    } else if (trimmedIdentifier.includes('@')) {
      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedIdentifier)) {
        this.identifierError.set('Adresse email invalide.');
        isValid = false;
      }
    }

    if (!this.password) {
      this.passwordError.set('Saisissez votre mot de passe.');
      isValid = false;
    }

    return isValid;
  }

  onSubmit(): void {
    if (!this.validate() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.globalError.set(null);

    this.authService
      .login({
        email: this.identifier.trim(),
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigateByUrl('/schools');
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.password = ''; // Effacer le mot de passe après échec

          if (error instanceof HttpErrorResponse) {
            if (error.status === 401) {
              this.globalError.set('Identifiant ou mot de passe incorrect.');
            } else if (error.status === 429) {
              this.globalError.set('Trop de tentatives. Réessayez dans quelques minutes.');
            } else {
              this.globalError.set('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
            }
          } else {
            this.globalError.set('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
          }
        },
      });
  }
}

