<template>
  <div class="abonados-container">
    <div class="equipos-header">
      <h4>Abonados <span class="result-count">{{ total }} registros</span></h4>
      <button class="btn-new" @click="openModal()">+ Nuevo</button>
    </div>

    <div class="search-bar">
      <div class="search-group">
        <div class="search-input-wrapper">
          <span class="search-icon">&#128269;</span>
          <input type="text" class="search-input" v-model="search" @input="debouncedLoad" placeholder="Buscar por nombre, codigo, calle...">
        </div>
        <select class="search-select" v-model="filterZone" @change="page=1; loadData()">
          <option value="">Todas las zonas</option>
          <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
        </select>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('client_code')">Codigo <span v-html="sortIcon('client_code')"></span></th>
            <th class="sortable" @click="toggleSort('name')">Nombre <span v-html="sortIcon('name')"></span></th>
            <th class="sortable" @click="toggleSort('zone')">Zona <span v-html="sortIcon('zone')"></span></th>
            <th class="sortable" @click="toggleSort('street')">Calle <span v-html="sortIcon('street')"></span></th>
            <th class="sortable" @click="toggleSort('instalaciones_count')">Instalaciones <span v-html="sortIcon('instalaciones_count')"></span></th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center loading-text">Cargando...</td></tr>
          <tr v-for="a in items" :key="a.id">
            <td><code class="client-code">{{ a.client_code }}</code></td>
            <td>{{ a.name }}</td>
            <td><small>{{ a.zone }}</small></td>
            <td><small>{{ truncate(a.street, 35) }}</small></td>
            <td><span class="count-badge">{{ a.instalaciones_count }}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn-action-edit" @click="openModal(a)" title="Editar">&#9998; Editar</button>
                <button class="btn-action-info" @click="viewDetail(a)" title="Ver detalle">&#128065; Ver</button>
              </div>
            </td>
          </tr>
          <tr v-if="items.length === 0 && !loading"><td colspan="6" class="text-center empty-text">No hay abonados</td></tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="total > limit">
      <span class="pagination-info">Mostrando {{ items.length }} de {{ total }}</span>
      <div class="pagination-buttons">
        <button class="btn-page" :disabled="page<=1" @click="page--; loadData()">&#9664; Anterior</button>
        <span class="page-num">{{ page }}</span>
        <button class="btn-page" :disabled="items.length < limit" @click="page++; loadData()">Siguiente &#9654;</button>
      </div>
    </div>

    <!-- MODAL FORM -->
    <div class="modal-overlay" tabindex="-1" v-if="showForm" @click.self="showForm = false">
      <div class="modal-content-box">
        <div class="modal-header-box">
          <h5 class="modal-title-box">{{ editing ? 'Editar' : 'Nuevo' }} Abonado</h5>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <div class="modal-body-box">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Codigo *</label>
              <input type="text" class="form-input" v-model="form.client_code">
            </div>
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input class="form-input" v-model="form.name">
            </div>
            <div class="form-group">
              <label class="form-label">Zona</label>
              <input class="form-input" v-model="form.zone">
            </div>
            <div class="form-group">
              <label class="form-label">Calle</label>
              <input class="form-input" v-model="form.street">
            </div>
          </div>
          <div v-if="error" class="alert-error">{{ error }}</div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showForm = false">Cancelar</button>
          <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL DETAIL -->
    <div class="modal-overlay" tabindex="-1" v-if="detailAbonado" @click.self="detailAbonado = null">
      <div class="modal-content-box modal-lg">
        <div class="modal-header-box">
          <div>
            <h5 class="modal-title-box">Abonado: {{ detailAbonado.name }}</h5>
            <span class="modal-subtitle">{{ detailAbonado.client_code }}</span>
          </div>
          <button class="modal-close" @click="detailAbonado = null">&times;</button>
        </div>
        <div class="modal-body-box">
          <div class="detail-info">
            <div class="detail-item">
              <span class="detail-label">Codigo:</span>
              <span class="detail-value">{{ detailAbonado.client_code }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Zona:</span>
              <span class="detail-value">{{ detailAbonado.zone }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Calle:</span>
              <span class="detail-value">{{ detailAbonado.street }}</span>
            </div>
          </div>

          <h6 class="section-title">Instalaciones:</h6>
          <div class="history-table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Modelo</th>
                  <th>Fecha</th>
                  <th>Tecnico</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in detailInstalaciones" :key="i.id">
                  <td><code class="asset-code">{{ i.asset_code }}</code></td>
                  <td><small>{{ truncate(i.description, 30) }}</small></td>
                  <td>{{ i.modelo }}</td>
                  <td>{{ $formatDate(i.fecha) }}</td>
                  <td>{{ i.tecnico }}</td>
                </tr>
                <tr v-if="detailInstalaciones.length === 0"><td colspan="5" class="text-center empty-text">Sin instalaciones</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="detailAbonado = null">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api.js';
export default {
  data() {
    return {
      items: [], total: 0, page: 1, limit: 15, search: '', filterZone: '', zones: [], loading: false,
      sortBy: 'name', sortDir: 'ASC',
      showForm: false, editing: null, saving: false, error: '',
      form: { client_code: '', name: '', zone: '', street: '' },
      detailAbonado: null, detailInstalaciones: [], debounceTimer: null
    };
  },
  async mounted() {
    const z = await api.get('/abonados/zones'); this.zones = z.data;
    this.loadData();
  },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s },
    debouncedLoad() { clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => { this.page = 1; this.loadData() }, 300) },
    toggleSort(col) {
      if (this.sortBy === col) { this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC' }
      else { this.sortBy = col; this.sortDir = 'ASC' }
      this.page = 1; this.loadData()
    },
    sortIcon(col) {
      if (this.sortBy !== col) return '<small style="opacity:0.4">&#8597;</small>';
      return this.sortDir === 'ASC' ? '<small>&#9650;</small>' : '<small>&#9660;</small>';
    },
    async loadData() {
      this.loading = true;
      const res = await api.get('/abonados', { params: { page: this.page, limit: this.limit, search: this.search, zone: this.filterZone, sortBy: this.sortBy, sortDir: this.sortDir } });
      this.items = res.data.data; this.total = res.data.total; this.loading = false;
    },
    openModal(a = null) {
      this.editing = a;
      this.form = a ? { client_code: a.client_code, name: a.name, zone: a.zone, street: a.street } : { client_code: '', name: '', zone: '', street: '' };
      this.error = ''; this.showForm = true;
    },
    async save() {
      if (!this.form.client_code || !this.form.name) { this.error = 'Codigo y nombre requeridos'; return }
      this.saving = true;
      try {
        if (this.editing) await api.put(`/abonados/${this.editing.id}`, this.form);
        else await api.post('/abonados', this.form);
        this.showForm = false; this.loadData();
      } catch (e) { this.error = e.response?.data?.error || 'Error' }
      this.saving = false;
    },
    async viewDetail(a) {
      this.detailAbonado = a;
      const r = await api.get(`/abonados/${a.id}/instalaciones`);
      this.detailInstalaciones = r.data;
    }
  }
};
</script>

<style scoped>
.abonados-container {
  padding: 0;
}

.btn-new {
  background: var(--c-accent);
  color: var(--c-bg);
  border: none;
  padding: 10px 20px;
  border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

[data-theme="light"] .btn-new {
  color: #fff;
}

.btn-new:hover {
  background: var(--c-accent-hover);
  transform: translateY(-1px);
}

.search-bar {
  margin-bottom: 16px;
}

.search-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  color: var(--c-text);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px var(--c-accent-dim);
}

.search-select {
  padding: 10px 12px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  color: var(--c-text);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  min-width: 180px;
}

.search-select:focus {
  outline: none;
  border-color: var(--c-accent);
}

.result-count {
  background: var(--c-accent);
  color: var(--c-bg);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
}

[data-theme="light"] .result-count {
  color: #fff;
}

.data-table-wrapper {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: var(--c-surface2);
}

.data-table th {
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--c-accent);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  background: var(--c-border);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
  font-size: 0.9rem;
  color: var(--c-text);
}

.data-table tbody tr:hover {
  background: var(--c-surface2);
}

.client-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--c-accent);
}

.count-badge {
  background: var(--c-accent-dim);
  color: var(--c-accent);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-action-edit, .btn-action-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  color: var(--c-text-muted);
  padding: 5px 10px;
  border-radius: var(--c-radius);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-action-edit {
  border-color: rgba(255,152,0,0.4);
  color: #ff9800;
}

.btn-action-edit:hover {
  background: rgba(255,152,0,0.12);
  border-color: #ff9800;
}

.btn-action-info {
  border-color: rgba(66,165,245,0.4);
  color: #42a5f5;
}

.btn-action-info:hover {
  background: rgba(66,165,245,0.12);
  border-color: #42a5f5;
}

[data-theme="light"] .btn-action-edit:hover {
  background: rgba(217,119,6,0.08);
}
[data-theme="light"] .btn-action-info:hover {
  background: rgba(59,130,246,0.08);
}

.loading-text, .empty-text {
  text-align: center;
  color: var(--c-text-muted);
  padding: 20px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.pagination-info {
  color: var(--c-text-muted);
  font-size: 0.9rem;
}

.pagination-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-page {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  padding: 8px 16px;
  border-radius: var(--c-radius);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  border-color: var(--c-accent);
  color: var(--c-accent);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-num {
  background: var(--c-accent);
  color: var(--c-bg);
  padding: 6px 12px;
  border-radius: var(--c-radius);
  font-weight: 700;
  font-size: 0.9rem;
}

[data-theme="light"] .page-num {
  color: #fff;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,10,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

[data-theme="light"] .modal-overlay {
  background: rgba(0,0,0,0.35);
}

.modal-content-box {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius-lg);
  width: 95%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-content-box.modal-lg {
  max-width: 900px;
}

.modal-header-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--c-primary) 0%, var(--c-surface2) 100%);
  border-bottom: 1px solid var(--c-border);
  border-radius: var(--c-radius-lg) var(--c-radius-lg) 0 0;
}

[data-theme="light"] .modal-header-box {
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%);
}

.modal-title-box {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--c-accent);
}

.modal-subtitle {
  color: var(--c-text-muted);
  font-size: 0.85rem;
}

.modal-close {
  background: var(--c-border);
  border: none;
  color: var(--c-text);
  font-size: 24px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--c-accent);
  color: var(--c-bg);
}

[data-theme="light"] .modal-close:hover {
  color: #fff;
}

.modal-body-box {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer-box {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--c-surface2);
  border-top: 1px solid var(--c-border);
  border-radius: 0 0 var(--c-radius-lg) var(--c-radius-lg);
}

.btn-primary {
  background: var(--c-accent);
  color: var(--c-bg);
  border: none;
  padding: 10px 20px;
  border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

[data-theme="light"] .btn-primary {
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--c-accent-hover);
}

.btn-primary:disabled {
  background: var(--c-border);
  color: var(--c-text-muted);
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  padding: 10px 20px;
  border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
}

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 10px 12px;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  color: var(--c-text);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px var(--c-accent-dim);
}

.alert-error {
  background: rgba(210, 34, 41, 0.1);
  border: 1px solid rgba(210, 34, 41, 0.3);
  color: var(--c-danger);
  padding: 12px 16px;
  border-radius: var(--c-radius);
  margin-top: 16px;
}

[data-theme="light"] .alert-error {
  background: rgba(239,68,68,0.05);
  border-color: rgba(239,68,68,0.18);
}

/* Detail */
.detail-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  padding: 16px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  color: var(--c-text);
  font-size: 0.95rem;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-accent);
}

.history-table-wrapper {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  overflow: hidden;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.history-table th {
  background: var(--c-surface2);
  padding: 10px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--c-accent);
  border-bottom: 1px solid var(--c-border);
}

.history-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text);
}

.history-table tbody tr:hover {
  background: var(--c-surface2);
}

.asset-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--c-accent);
}

@media (max-width: 768px) {
  .search-group {
    flex-direction: column;
  }
  
  .search-select {
    width: 100%;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-info {
    grid-template-columns: 1fr;
  }
}
</style>
