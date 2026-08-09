<template>
  <div class="app-layout" :class="{'sidebar-collapsed': collapsed}">
    <nav class="app-sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo">&#128225;</div>
        <div class="sidebar-brand-text" v-show="!collapsed">Gestion ONTs</div>
        <div class="sidebar-brand-sub" v-show="!collapsed">Coop. Telecom. Potosi</div>
      </div>
      <ul class="sidebar-nav">
        <li v-for="link in links" :key="link.path">
          <router-link :to="link.path" class="sidebar-link" :class="{'active': $route.path === link.path}" :title="collapsed ? link.name : ''">
            <span class="sidebar-link-icon" v-html="link.icon"></span>
            <span class="sidebar-link-text" v-show="!collapsed">{{ link.name }}</span>
          </router-link>
        </li>
      </ul>
      <div class="sidebar-footer" v-show="!collapsed">
        <small>Unidad de Bienes</small>
      </div>
    </nav>
    <main class="app-main">
      <header class="app-topbar">
        <button class="hamburger-btn" @click="collapsed = !collapsed" :title="collapsed ? 'Expandir menu' : 'Contraer menu'">
          <span class="hamburger-line" :class="{'open': collapsed}"></span>
        </button>
        <span class="topbar-title">Sistema de Gestion de ONTs - Cooperativa de Telecomunicaciones Potosi R.L.</span>
        <div class="topbar-actions">
          <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'">
            <span v-if="theme === 'dark'">&#9788;</span>
            <span v-else>&#9790;</span>
          </button>
        </div>
      </header>
      <div class="app-content">
        <router-view />
      </div>
    </main>
  </div>
</template>
<script>
export default {
  data() {
    return {
      collapsed: false,
      theme: 'dark',
      links: [
        { path: '/', name: 'Dashboard', icon: '&#9632;' },
        { path: '/equipos', name: 'Equipos', icon: '&#9638;' },
        { path: '/abonados', name: 'Abonados', icon: '&#9787;' },
        { path: '/instalaciones', name: 'Instalaciones', icon: '&#9881;' },
        { path: '/vales', name: 'Vales de Salida', icon: '&#9998;' },
        { path: '/devoluciones', name: 'Devoluciones', icon: '&#8634;' },
        { path: '/importar', name: 'Importar Excel', icon: '&#8681;' }
      ]
    }
  },
  mounted() {
    const saved = localStorage.getItem('ont-theme') || 'dark'
    this.applyTheme(saved)
  },
  methods: {
    toggleTheme() {
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark')
    },
    applyTheme(t) {
      this.theme = t
      document.documentElement.setAttribute('data-theme', t)
      localStorage.setItem('ont-theme', t)
    }
  }
}
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

:root,
[data-theme="dark"] {
  --c-bg: #0b0f19;
  --c-sidebar: #0f172a;
  --c-surface: #141c2f;
  --c-surface2: #1a2438;
  --c-border: rgba(255, 255, 255, 0.08);
  --c-border-light: rgba(255, 255, 255, 0.12);
  --c-text: #f3f4f6;
  --c-text-muted: #9ca3af;
  --c-accent: #06b6d4;
  --c-accent-dim: rgba(6, 182, 212, 0.15);
  --c-accent-hover: #0891b2;
  --c-primary: #06b6d4;
  --c-success: #10b981;
  --c-danger: #f43f5e;
  --c-warning: #f59e0b;
  --c-info: #3b82f6;
  --c-radius: 8px;
  --c-radius-lg: 12px;
}

[data-theme="light"] {
  --c-bg: #f8f9fb;
  --c-sidebar: #ffffff;
  --c-surface: #ffffff;
  --c-surface2: #eef1f5;
  --c-border: rgba(0, 0, 0, 0.07);
  --c-border-light: rgba(0, 0, 0, 0.04);
  --c-text: #1e293b;
  --c-text-muted: #64748b;
  --c-accent: #0891b2;
  --c-accent-dim: rgba(6, 182, 212, 0.12);
  --c-accent-hover: #0e7490;
  --c-primary: #0891b2;
  --c-success: #10b981;
  --c-danger: #ef4444;
  --c-warning: #f59e0b;
  --c-info: #3b82f6;
  --c-radius: 8px;
  --c-radius-lg: 12px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--c-bg); }
body { font-family: 'DM Sans', sans-serif; background: var(--c-bg); color: var(--c-text); overflow-x: hidden; }
a { color: var(--c-accent); text-decoration: none; }

.app-layout { display: flex; min-height: 100vh; }

/* Sidebar */
.app-sidebar {
  width: 240px;
  background: var(--c-sidebar);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  transition: width 0.25s ease;
}

.sidebar-collapsed .app-sidebar {
  width: 60px;
}

.sidebar-brand {
  padding: 24px 18px 16px;
  text-align: center;
  border-bottom: 1px solid var(--c-border);
}
.sidebar-logo { font-size: 28px; margin-bottom: 6px; }
.sidebar-brand-text { font-size: 0.95rem; font-weight: 700; color: var(--c-text); }
.sidebar-brand-sub { font-size: 0.65rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

.sidebar-nav { list-style: none; padding: 12px 8px; flex: 1; }
.sidebar-nav li { margin-bottom: 2px; }

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--c-radius);
  color: var(--c-text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  transition: all 0.2s;
}
.sidebar-link:hover { background: rgba(6,182,212,0.10); color: var(--c-text); }
.sidebar-link.active {
  background: var(--c-accent-dim);
  color: var(--c-accent);
  font-weight: 700;
  border-left: 3px solid var(--c-accent);
}
.sidebar-link-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
.sidebar-link-text { white-space: nowrap; }

.sidebar-collapsed .sidebar-link { justify-content: center; padding: 10px; }
.sidebar-collapsed .sidebar-link.active { border-left: none; border-bottom: 3px solid var(--c-accent); }

[data-theme="light"] .app-sidebar { box-shadow: 2px 0 12px rgba(0,0,0,0.06); }

.sidebar-footer {
  padding: 14px 18px;
  border-top: 1px solid var(--c-border);
  text-align: center;
  color: var(--c-text-muted);
  font-size: 0.65rem;
}

/* Hamburger */
.hamburger-btn {
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.hamburger-btn:hover { border-color: var(--c-accent); background: var(--c-border); }

.hamburger-line, .hamburger-line::before, .hamburger-line::after {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--c-accent);
  border-radius: 2px;
  transition: all 0.25s ease;
}
.hamburger-line { position: relative; }
.hamburger-line::before, .hamburger-line::after {
  content: '';
  position: absolute;
}
.hamburger-line::before { top: -6px; }
.hamburger-line::after { top: 6px; }

.hamburger-line.open { background: transparent; }
.hamburger-line.open::before { top: 0; transform: rotate(45deg); }
.hamburger-line.open::after { top: 0; transform: rotate(-45deg); }

/* Topbar */
.app-topbar {
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  padding: 12px 24px;
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 16px;
}
.topbar-title { font-size: 0.78rem; font-weight: 600; color: var(--c-accent); letter-spacing: 0.3px; flex: 1; }
.topbar-actions { display: flex; align-items: center; gap: 8px; }

.theme-toggle {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  color: var(--c-accent);
  font-size: 18px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s;
}
.theme-toggle:hover {
  background: var(--c-accent-dim);
  border-color: var(--c-accent);
  transform: rotate(20deg);
}

/* Main */
.app-main { flex: 1; margin-left: 240px; min-height: 100vh; transition: margin-left 0.25s ease; }
.sidebar-collapsed .app-main { margin-left: 60px; }

.app-content { padding: 20px 24px; background: var(--c-bg); min-height: calc(100vh - 56px); }

/* Shared module header */
.equipos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.equipos-header h4 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--c-accent);
  display: flex;
  align-items: center;
  gap: 10px;
}
.result-count {
  background: var(--c-accent);
  color: var(--c-bg);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
}
[data-theme="light"] .result-count { color: #fff; }

/* Global card/table overrides */
.card, .card-stat {
  background: var(--c-surface) !important;
  border: 1px solid var(--c-border) !important;
  color: var(--c-text) !important;
  border-radius: var(--c-radius) !important;
}

.table { color: var(--c-text) !important; }
.table th { background: var(--c-surface2) !important; color: var(--c-text-muted) !important; border-color: var(--c-border) !important; font-size: 0.78rem !important; text-transform: uppercase; letter-spacing: 0.3px; }
.table td { border-color: var(--c-border) !important; font-size: 0.82rem !important; }
.table-striped > tbody > tr:nth-of-type(odd) > td { background-color: rgba(6,182,212,0.05) !important; }
.table-hover > tbody > tr:hover > td { background-color: rgba(6,182,212,0.08) !important; }

.table-dark { background: var(--c-surface2) !important; }
.table-dark th { background: var(--c-surface2) !important; color: var(--c-accent) !important; border-color: var(--c-border) !important; }

.form-control, .form-select {
  background: var(--c-surface2) !important;
  border-color: var(--c-border) !important;
  color: var(--c-text) !important;
}
.form-control:focus, .form-select:focus {
  background: var(--c-surface) !important;
  border-color: var(--c-accent) !important;
  color: var(--c-text) !important;
  box-shadow: 0 0 0 2px var(--c-accent-dim) !important;
}
.form-control::placeholder { color: var(--c-text-muted) !important; }
.form-label { color: var(--c-text-muted) !important; font-size: 0.75rem !important; font-weight: 700 !important; text-transform: uppercase; letter-spacing: 0.3px; }

.btn-primary { background: var(--c-accent) !important; border-color: var(--c-accent) !important; color: #fff !important; font-weight: 700; }
[data-theme="light"] .btn-primary { color: #fff !important; }
.btn-primary:hover { background: var(--c-accent-hover) !important; }
.btn-success { background: var(--c-success) !important; border-color: var(--c-success) !important; }
.btn-danger { background: var(--c-danger) !important; border-color: var(--c-danger) !important; }
.btn-outline-secondary { border-color: var(--c-border) !important; color: var(--c-text-muted) !important; background: transparent !important; }
.btn-outline-secondary:hover { border-color: var(--c-accent) !important; color: var(--c-accent) !important; }
.btn-outline-success { border-color: var(--c-success) !important; color: var(--c-success) !important; background: transparent !important; }
.btn-outline-success:hover { background: var(--c-success) !important; color: white !important; }
.btn-outline-danger { border-color: var(--c-danger) !important; color: var(--c-danger) !important; background: transparent !important; }
.btn-outline-danger:hover { background: var(--c-danger) !important; color: white !important; }
.btn-outline-info { border-color: var(--c-info) !important; color: var(--c-info) !important; background: transparent !important; }
.btn-outline-primary { border-color: var(--c-accent) !important; color: var(--c-accent) !important; background: transparent !important; }

.badge { font-weight: 600; }
.badge-secondary { background: var(--c-surface2) !important; color: var(--c-text-muted) !important; }
.bg-dark { background: var(--c-surface2) !important; }
.bg-primary { background: var(--c-accent) !important; color: #0a0e0a !important; }
.bg-light { background: var(--c-bg) !important; }
.bg-white { background: var(--c-surface) !important; }
.text-primary { color: var(--c-accent) !important; }
.text-muted { color: var(--c-text-muted) !important; }
.text-success { color: var(--c-success) !important; }
.text-danger { color: var(--c-danger) !important; }
.text-warning { color: var(--c-warning) !important; }
.text-info { color: var(--c-info) !important; }

.shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important; }
[data-theme="light"] .shadow-sm { box-shadow: 0 1px 4px rgba(0,0,0,0.08) !important; }
.card-header { background: var(--c-surface2) !important; border-color: var(--c-border) !important; color: var(--c-text) !important; }

.list-group-item { background: var(--c-surface) !important; border-color: var(--c-border) !important; color: var(--c-text) !important; }
.list-group-item:hover { background: var(--c-surface2) !important; }

.modal-content { background: var(--c-surface) !important; color: var(--c-text) !important; }
.modal-header { border-color: var(--c-border) !important; }
.modal-footer { border-color: var(--c-border) !important; }

.alert-info { background: rgba(66,165,245,0.1) !important; border-color: var(--c-info) !important; color: var(--c-info) !important; }

h4, h5, h6 { color: var(--c-text) !important; }
small { color: var(--c-text-muted); }
code { color: var(--c-accent); background: var(--c-accent-dim); padding: 1px 6px; border-radius: 4px; font-size: 0.8em; }

/* Kill ALL Bootstrap white backgrounds */
.modal-content, .modal-body, .modal-header, .modal-footer,
.form-control, .form-select, .form-check-input,
.card, .card-body, .card-header,
.table, .table td, .table th,
.dropdown-menu, .dropdown-item,
.btn, .badge, .alert,
.input-group-text, .form-control-lg, .form-control-sm,
.list-group, .list-group-item,
.navbar, .navbar-light, .breadcrumb,
.popover, .tooltip-inner,
.jumbotron, .carousel-caption,
.toast, .toast-body,
.tab-content, .tab-pane,
.accordion, .accordion-item, .accordion-button,
.offcanvas, .offcanvas-body,
.select, select, input[type="text"], input[type="number"],
input[type="date"], input[type="email"], input[type="search"],
textarea, option, .page-link, .page-item, .pagination,
.nav-link, .nav-tabs, .nav-pills, .nav-item,
.breadcrumb-item, .form-floating, .form-floating > .form-control,
.form-floating > .form-select, .form-floating > label,
.was-validated .form-control:valid, .form-control.is-valid,
.form-control.is-invalid, .btn-close,
.container, .container-fluid, .row, .col, .col-auto,
.modal-dialog-scrollable .modal-content {
  background-color: var(--c-surface2) !important;
  color: var(--c-text) !important;
  border-color: var(--c-border) !important;
}

.modal-content { background-color: var(--c-surface) !important; }
.modal-header, .modal-footer { background-color: var(--c-surface2) !important; }
.modal-body { background-color: var(--c-surface) !important; }

select option { background-color: var(--c-surface2) !important; color: var(--c-text) !important; }

.modal-backdrop.show { background: rgba(0,10,0,0.7) !important; }
[data-theme="light"] .modal-backdrop.show { background: rgba(0,0,0,0.4) !important; }

.form-check-input:checked { background-color: var(--c-accent) !important; border-color: var(--c-accent) !important; }
.form-check-input:focus { border-color: var(--c-accent) !important; box-shadow: 0 0 0 2px var(--c-accent-dim) !important; }

.table-striped > tbody > tr:nth-of-type(odd) > td { background-color: rgba(6,182,212,0.05) !important; }
.table-striped > tbody > tr:nth-of-type(even) > td { background-color: transparent !important; }

/* Extra: kill Bootstrap table-bg and form white leaks */
.table { --bs-table-bg: transparent !important; --bs-table-accent-bg: transparent !important; }
.table > :not(caption) > * > * { background-color: transparent !important; }
.table-striped > tbody > tr:nth-of-type(odd) > * { --bs-table-accent-bg: rgba(6,182,212,0.05) !important; }
.form-control:focus, .form-select:focus { background-color: var(--c-surface) !important; }
.form-control::placeholder, .form-select::placeholder { color: var(--c-text-muted) !important; opacity: 1; }
.input-group > .form-control, .input-group > .form-select { background-color: var(--c-surface2) !important; }
.input-group-text { background-color: var(--c-surface) !important; }
.card-body { background-color: var(--c-surface) !important; }
.btn-close { filter: invert(1); }
[data-theme="light"] .btn-close { filter: none; }
.form-check-label { color: var(--c-text) !important; }
.form-check-input { background-color: var(--c-surface) !important; border-color: var(--c-border) !important; }
.table-bordered td, .table-bordered th { border-color: var(--c-border) !important; }
.table > thead { background: var(--c-surface2) !important; }
.table-dark { --bs-table-bg: var(--c-surface2) !important; --bs-table-border-color: var(--c-border) !important; }

/* Light theme modal overlays and scoped view fixes */
[data-theme="light"] .modal-overlay { background: rgba(0,0,0,0.25) !important; }
[data-theme="light"] .modal-content-box { box-shadow: 0 8px 32px rgba(0,0,0,0.08) !important; }
[data-theme="light"] .dash-header { background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%) !important; }
[data-theme="light"] .sidebar-brand { background: var(--c-surface) !important; }
[data-theme="light"] .app-topbar { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

/* Status badges light theme readability */
[data-theme="light"] .status-en_bines { color: #059669 !important; }
[data-theme="light"] .status-despachada { color: #d97706 !important; }
[data-theme="light"] .status-instalada { color: #3b82f6 !important; }
[data-theme="light"] .status-devuelta { color: #6366f1 !important; }
[data-theme="light"] .status-en_bines_mal_estado { color: #ef4444 !important; }

/* Override inline modal backdrop styles for light theme */
[data-theme="light"] .modal.d-block[style*="rgba(0,0,0"] {
  background: rgba(0,0,0,0.28) !important;
}

/* Light table stripe softer */
[data-theme="light"] .table-striped > tbody > tr:nth-of-type(odd) > td { background-color: rgba(6,182,212,0.06) !important; }
[data-theme="light"] .table-striped > tbody > tr:nth-of-type(odd) > * { --bs-table-accent-bg: rgba(6,182,212,0.06) !important; }

/* Extra white-leak killers */
.accordion-button { background: var(--c-surface) !important; color: var(--c-text) !important; }
.accordion-button:not(.collapsed) { background: var(--c-surface2) !important; color: var(--c-accent) !important; }
.accordion-button::after { filter: invert(1); }
[data-theme="light"] .accordion-button::after { filter: none; }
.table-bordered { border-color: var(--c-border) !important; }
.table-group-divider { border-color: var(--c-border) !important; }
.card > .list-group:last-child { border-bottom: 1px solid var(--c-border) !important; }
.card > .list-group:first-child { border-top: 1px solid var(--c-border) !important; }
#app { background: var(--c-bg) !important; }
#root { background: var(--c-bg) !important; }
</style>
