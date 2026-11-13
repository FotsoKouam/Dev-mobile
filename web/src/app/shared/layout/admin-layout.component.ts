import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { AuthService } from '../../core/auth.service';
import { I18N_FR } from '../i18n/fr';
import { ToastComponent } from '../ui/toast/toast.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ToastComponent],
  template: `
    <div class="admin-layout">
      <!-- Barre latérale -->
      <aside class="sidebar">
        <!-- Logo -->
        <div class="sidebar-brand">
          <svg class="brand-logo" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <path d="M8 38C8 36.5 9 35.5 10.5 35C17 33 22 35 28 35C34 35 39 33 45.5 35C47 35.5 48 36.5 48 38V46C48 47.5 47 48 45.5 47.5C39 45.5 34 47.5 28 47.5C22 47.5 17 45.5 10.5 47.5C9 48 8 47.5 8 46V38Z" fill="#FFFFFF" fill-opacity="0.9"/>
            <path d="M28 12L8 22L28 32L48 22L28 12Z" fill="#FFFFFF"/>
            <path d="M44 25V32" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
            <circle cx="44" cy="33.5" r="2.5" fill="#FFFFFF"/>
          </svg>
          <div class="brand-text">
            <span class="brand-name">{{ i18n.layout.brandName }}</span>
            <span class="brand-sub">{{ i18n.layout.brandSubtitle }}</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <!-- Tableau de bord -->
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>{{ i18n.layout.nav.dashboard }}</span>
          </a>

          <!-- Écoles (manage_schools ou manage_programs) -->
          @if (canAccessSchools) {
            <a class="nav-item" routerLink="/schools" routerLinkActive="active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M3 7v14M21 7v14M6 21V11M18 21V11M12 21V11M3 7l9-4 9 4"></path>
              </svg>
              <span>{{ i18n.layout.nav.schools }}</span>
            </a>
          }

          <!-- Utilisateurs (manage_users) -->
          @if (canAccessUsers) {
            <a class="nav-item" routerLink="/users" routerLinkActive="active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                <path d="M16 3.13a4 4 0 010 7.75"></path>
              </svg>
              <span>{{ i18n.layout.nav.users }}</span>
            </a>
          }

          <!-- Rôles (manage_roles) -->
          @if (canAccessRoles) {
            <a class="nav-item" routerLink="/roles" routerLinkActive="active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>{{ i18n.layout.nav.roles }}</span>
            </a>
          }

          <!-- Affectations (manage_assignments) -->
          @if (canAccessAssignments) {
            <a class="nav-item" routerLink="/assignments" routerLinkActive="active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              <span>{{ i18n.layout.nav.assignments }}</span>
            </a>
          }

          <!-- Documents -->
          @if (canAccessDocuments) {
            <a class="nav-item" routerLink="/documents" routerLinkActive="active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>{{ i18n.layout.nav.documents }}</span>
            </a>
          }

          <!-- Audit -->
          @if (canAccessAudit) {
            <a class="nav-item" routerLink="/audit" routerLinkActive="active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{{ i18n.layout.nav.audit }}</span>
            </a>
          }
        </nav>

        <!-- Bas de sidebar : Profil & Déconnexion -->
        <div class="sidebar-footer">
          <div class="user-profile-row">
            <div class="user-avatar">
              {{ userInitials }}
            </div>
            <div class="user-info">
              <div class="user-name-row">
                <span class="user-name">{{ userName }}</span>
                <svg class="chevron-down-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="user-role">{{ userRole }}</div>
            </div>
          </div>
          <div class="footer-links">
            <a class="footer-link" routerLink="/profile" title="Voir mon profil">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profil</span>
            </a>
            <button class="footer-link logout-link-btn" (click)="logout()" title="Se déconnecter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>{{ i18n.layout.userMenu.logout }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Zone principale -->
      <div class="main-wrapper">
        <!-- En-tête -->
        <header class="app-header">
          <div class="header-left">
            <div class="page-title-group">
              <div class="header-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18M3 7v14M21 7v14M6 21V11M18 21V11M12 21V11M3 7l9-4 9 4"></path>
                </svg>
              </div>
              <div class="header-titles">
                <h1 class="page-title">{{ pageTitle }}</h1>
                @if (pageSubtitle) {
                  <div class="page-subtitle">{{ pageSubtitle }}</div>
                }
              </div>
            </div>
          </div>

          <div class="header-right">
            <!-- Recherche globale stylée -->
            <div class="search-box">
              <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher une école, une filière, un utilisateur…"
              />
            </div>

            <!-- Cloche notifications avec point d'alerte rouge -->
            <button class="icon-circle-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 01-3.46 0"></path>
              </svg>
              <span class="notification-dot"></span>
            </button>

            <!-- Icône météo / soleil -->
            <button class="icon-circle-btn" title="Mode d'affichage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </button>

            <!-- Date et heure du jour -->
            <div class="current-datetime">
              <span class="date-part">{{ currentDate }}</span>
              <span class="separator">|</span>
              <span class="time-part">{{ currentTime }}</span>
            </div>
          </div>
        </header>

        <!-- Contenu de la page -->
        <main class="page-content">
          <div class="content-container">
            <ng-content></ng-content>
          </div>
        </main>
      </div>

      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg-page, #F7F9FC);
    }
    .sidebar {
      width: 240px;
      background: var(--color-primary, #1B2A4A);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 50;
    }
    .sidebar-brand {
      padding: 24px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-family: 'Manrope', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--color-text-light, #9AA5B8);
    }
    .sidebar-nav {
      flex: 1;
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      color: #CAD5E8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      position: relative;
      transition: all 0.15s;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }
    .nav-item.active {
      background: var(--color-primary-light, #2E3F6B);
      color: #ffffff;
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #F0B429;
    }
    .nav-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .sidebar-footer {
      padding: 18px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: rgba(0, 0, 0, 0.15);
    }
    .user-profile-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #FFFFFF;
      color: var(--color-primary, #1B2A4A);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .user-info {
      flex: 1;
      min-width: 0;
    }
    .user-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .user-name {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chevron-down-icon {
      width: 16px;
      height: 16px;
      color: #9AA5B8;
      flex-shrink: 0;
    }
    .user-role {
      font-size: 12px;
      color: #9AA5B8;
      margin-top: 2px;
    }
    .footer-links {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .footer-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      color: #CAD5E8;
      text-decoration: none;
      font-size: 13px;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s;
    }
    .footer-link:hover {
      color: #FFFFFF;
    }
    .footer-link svg {
      width: 16px;
      height: 16px;
    }
    .main-wrapper {
      flex: 1;
      margin-left: 240px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .app-header {
      height: 76px;
      background: #ffffff;
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .page-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #F0F4FA;
      color: var(--color-primary, #1B2A4A);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon-badge svg {
      width: 24px;
      height: 24px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .page-title {
      font-family: var(--font-family-serif, 'Newsreader', Georgia, serif);
      font-size: 26px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
      margin: 0;
      line-height: 1.1;
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--color-text-muted, #7A8499);
      margin-top: 4px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      padding: 0 14px;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 20px;
      background: #F8FAFD;
      width: 320px;
    }
    .search-box input {
      border: none;
      background: none;
      outline: none;
      font-size: 13px;
      color: var(--color-text-dark, #1B2A4A);
      width: 100%;
    }
    .search-box input::placeholder {
      color: #9AA5B8;
    }
    .search-icon { width: 16px; height: 16px; color: #7A8499; flex-shrink: 0; }
    .icon-circle-btn {
      position: relative;
      background: #F8FAFD;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary, #1B2A4A);
      cursor: pointer;
      transition: background 0.15s;
    }
    .icon-circle-btn:hover {
      background: #EDF2F9;
    }
    .icon-circle-btn svg { width: 18px; height: 18px; }
    .notification-dot {
      position: absolute;
      top: 9px;
      right: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #E53E3E;
      border: 1.5px solid #FFFFFF;
    }
    .current-datetime {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-muted, #7A8499);
      margin-left: 8px;
    }
    .current-datetime .date-part {
      text-transform: capitalize;
    }
    .current-datetime .separator {
      color: #CAD5E8;
    }
    .current-datetime .time-part {
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .page-content {
      flex: 1;
      padding: 32px;
    }
    .content-container {
      max-width: 1440px;
      margin: 0 auto;
    }
  `],
})
export class AdminLayoutComponent {
  @Input() pageTitle = '';
  @Input() pageSubtitle = '';

  private readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);

  readonly i18n = I18N_FR;

  get canAccessSchools(): boolean {
    return (
      this.sessionService.hasPermission('manage_schools') ||
      this.sessionService.hasPermission('manage_programs')
    );
  }

  get canAccessUsers(): boolean {
    return (
      this.sessionService.hasPermission('manage_users') ||
      this.sessionService.hasPermission('manage_assignments')
    );
  }

  get canAccessRoles(): boolean {
    return this.sessionService.hasPermission('manage_roles');
  }

  get canAccessAssignments(): boolean {
    return this.sessionService.hasPermission('manage_assignments');
  }

  get canAccessDocuments(): boolean {
    return (
      this.sessionService.hasPermission('manage_programs') ||
      this.sessionService.hasPermission('add_document') ||
      this.sessionService.hasPermission('create_institutional_space')
    );
  }

  get canAccessAudit(): boolean {
    return this.sessionService.hasPermission('view_audit_logs');
  }

  get userName(): string {
    const user = this.sessionService.user();
    if (!user) return 'Admin Fatso';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || 'Admin Fatso';
  }

  get userInitials(): string {
    const name = this.userName;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'AF').toUpperCase();
  }

  get userRole(): string {
    return 'Administrateur';
  }

  get currentDate(): string {
    const d = new Date();
    const str = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    // ex: "jeu. 12 sept. 2025"
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  get currentTime(): string {
    const d = new Date();
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}

