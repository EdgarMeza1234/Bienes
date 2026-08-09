<template>
  <div class="devoluciones-container">
    <div class="equipos-header">
      <h4>Devoluciones <span class="result-count">{{ total }} registros</span></h4>
      <button class="btn-new" @click="openNew">+ Nueva Devolucion</button>
    </div>

    <div class="search-bar">
      <div class="search-group">
        <div class="search-input-wrapper">
          <span class="search-icon">&#128269;</span>
          <input v-model="filters.search" @input="debouncedLoad" class="search-input" placeholder="Buscar por codigo, motivo, informe, persona...">
        </div>
        <select v-model="filters.return_type" @change="page=1; loadData()" class="search-select">
          <option value="">Todos los tipos</option>
          <option value="cambio">Cambio</option>
          <option value="defecto">Defecto/Mal Estado</option>
          <option value="retiro">Retiro</option>
          <option value="recogido">Recogido</option>
        </select>
        <input type="date" v-model="filters.date_from" @change="page=1; loadData()" class="search-select" style="max-width:140px" placeholder="Desde">
        <input type="date" v-model="filters.date_to" @change="page=1; loadData()" class="search-select" style="max-width:140px" placeholder="Hasta">
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('asset_code')">Codigo Bien <span v-html="sortIcon('asset_code')"></span></th>
            <th class="sortable" @click="toggleSort('description')">Descripcion <span v-html="sortIcon('description')"></span></th>
            <th class="sortable" @click="toggleSort('return_type')">Tipo <span v-html="sortIcon('return_type')"></span></th>
            <th class="sortable" @click="toggleSort('nro_informe')">Nro Informe <span v-html="sortIcon('nro_informe')"></span></th>
            <th class="sortable" @click="toggleSort('stt_number')">STT <span v-html="sortIcon('stt_number')"></span></th>
            <th class="sortable" @click="toggleSort('motivo')">Motivo <span v-html="sortIcon('motivo')"></span></th>
            <th class="sortable" @click="toggleSort('devuelto_por')">Devuelto Por <span v-html="sortIcon('devuelto_por')"></span></th>
            <th class="sortable" @click="toggleSort('return_date')">Fecha <span v-html="sortIcon('return_date')"></span></th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="9" class="text-center loading-text">Cargando...</td></tr>
          <tr v-for="r in items" :key="r.id">
            <td><code class="asset-code">{{ r.asset_code }}</code></td>
            <td><small>{{ truncate(r.description, 30) || '-' }}</small></td>
            <td><span :class="['status-badge', returnBadge(r.return_type)]">{{ r.return_type || '-' }}</span></td>
            <td>{{ r.nro_informe || '-' }}</td>
            <td><small>{{ r.stt_number || '-' }}</small></td>
            <td><small>{{ truncate(r.motivo, 35) || '-' }}</small></td>
            <td>{{ truncate(r.devuelto_por, 20) || '-' }}</td>
            <td>{{ $formatDate(r.return_date) }}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-edit" @click="editItem(r)" title="Editar">&#9998;</button>
                <button class="btn-icon-delete" @click="deleteItem(r)" title="Eliminar">&#128465;</button>
              </div>
            </td>
          </tr>
          <tr v-if="items.length === 0 && !loading"><td colspan="9" class="text-center empty-text">No hay devoluciones</td></tr>
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

    <!-- MODAL NUEVA / EDITAR DEVOLUCION -->
    <div class="modal-overlay" tabindex="-1" v-if="showForm" @click.self="showForm = false">
      <div class="modal-content-box">
        <div class="modal-header-box">
          <div>
            <h5 class="modal-title-box">{{ editing ? 'Editar Devolucion' : 'Nueva Devolucion' }}</h5>
            <span class="modal-subtitle">{{ form.asset_code || 'Registro de devolucion' }}</span>
          </div>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <div class="modal-body-box">
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label">Codigo Bien *</label>
              <input type="text" class="form-input" v-model="form.asset_code" @blur="lookupEquipo" placeholder="CTP-...">
              <small v-if="foundEquipo" class="form-success">&#10003; {{ foundEquipo.asset_code }} - {{ foundEquipo.description }}</small>
              <small v-else-if="form.asset_code && !foundEquipo" class="form-muted">Equipo no encontrado en BD (igual se registra)</small>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select class="form-input" v-model="form.return_type">
                <option value="">Seleccione...</option>
                <option value="cambio">Cambio de Equipo/Plan</option>
                <option value="defecto">Defecto/Mal Estado</option>
                <option value="retiro">Retiro de Servicio</option>
                <option value="recogido">Recogido</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" class="form-input" v-model="form.return_date" />
            </div>
            <div class="form-group">
              <label class="form-label">Nro Informe</label>
              <input type="text" class="form-input" v-model="form.nro_informe" placeholder="N&deg; 010/2024">
            </div>
            <div class="form-group">
              <label class="form-label">Cite Referencia</label>
              <input type="text" class="form-input" v-model="form.cite_ref" placeholder="cite 012/2024, UUM 103/2023">
            </div>
            <div class="form-group">
              <label class="form-label">Nro STT</label>
              <input type="text" class="form-input" v-model="form.stt_number" placeholder="S.T.T. 3069">
            </div>
            <div class="form-group">
              <label class="form-label">Devuelto Por</label>
              <input type="text" class="form-input" v-model="form.devuelto_por" placeholder="Nombre de quien devuelve">
            </div>
            <div class="form-group full-width">
              <label class="form-label">Motivo</label>
              <textarea class="form-input" rows="2" v-model="form.motivo" placeholder="Descripcion del motivo"></textarea>
            </div>
          </div>
          <div v-if="error" class="alert-error">{{ error }}</div>
          <div v-if="success" class="alert-success">{{ success }}</div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showForm = false">Cancelar</button>
          <button class="btn-primary" :disabled="submitting" @click="submit">{{ submitting ? 'Guardando...' : 'Guardar' }}</button>
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
      items: [], total: 0, loading: false,
      page: 1, limit: 15, sortBy: 'id', sortDir: 'DESC',
      filters: { search: '', return_type: '', date_from: '', date_to: '' },
      showForm: false, submitting: false, editing: false, error: '', success: '', foundEquipo: null,
      form: { asset_code: '', return_type: '', return_date: '', nro_informe: '', stt_number: '', cite_ref: '', motivo: '', devuelto_por: '' },
      debounceTimer: null
    };
  },
  mounted() { this.loadData(); },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s; },
    returnBadge(t) {
      const m = { cambio: 'status-cambio', defecto: 'status-defecto', retiro: 'status-retiro', recogido: 'status-recogido' };
      return m[t] || 'status-otro';
    },
    debouncedLoad() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => { this.page = 1; this.loadData(); }, 400);
    },
    toggleSort(col) {
      if (this.sortBy === col) { this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC'; }
      else { this.sortBy = col; this.sortDir = 'ASC'; }
      this.page = 1; this.loadData();
    },
    sortIcon(col) {
      if (this.sortBy !== col) return '<small style="opacity:0.4">&#8597;</small>';
      return this.sortDir === 'ASC' ? '<small>&#9650;</small>' : '<small>&#9660;</small>';
    },
    async loadData() {
      this.loading = true;
      const params = { page: this.page, limit: this.limit, sortBy: this.sortBy, sortDir: this.sortDir };
      if (this.filters.search) params.search = this.filters.search;
      if (this.filters.return_type) params.return_type = this.filters.return_type;
      if (this.filters.date_from) params.date_from = this.filters.date_from;
      if (this.filters.date_to) params.date_to = this.filters.date_to;
      const res = await api.get('/devueltos', { params });
      this.items = res.data.data || [];
      this.total = res.data.total || 0;
      this.loading = false;
    },
    openNew() {
      this.editing = false;
      this.form = { asset_code: '', return_type: '', return_date: new Date().toISOString().split('T')[0], nro_informe: '', stt_number: '', cite_ref: '', motivo: '', devuelto_por: '' };
      this.foundEquipo = null; this.error = ''; this.success = ''; this.showForm = true;
    },
    editItem(r) {
      this.editing = true;
      this.form = {
        id: r.id,
        asset_code: r.asset_code,
        return_type: r.return_type || '',
        return_date: r.return_date ? r.return_date.slice(0, 10) : '',
        nro_informe: r.nro_informe || '',
        stt_number: r.stt_number || '',
        cite_ref: r.cite_ref || '',
        motivo: r.motivo || '',
        devuelto_por: r.devuelto_por || ''
      };
      this.foundEquipo = r.equipo_id ? { asset_code: r.asset_code, description: r.description } : null;
      this.error = ''; this.success = ''; this.showForm = true;
    },
    async deleteItem(r) {
      if (!confirm('Eliminar devolucion de ' + r.asset_code + '?')) return;
      try {
        await api.delete('/devueltos/' + r.id);
        this.loadData();
      } catch (e) { alert(e.response?.data?.error || 'Error al eliminar'); }
    },
    async lookupEquipo() {
      if (!this.form.asset_code) { this.foundEquipo = null; return; }
      const res = await api.get('/equipos', { params: { search: this.form.asset_code, limit: 1 } });
      this.foundEquipo = res.data.data?.find(e => e.asset_code === this.form.asset_code) || null;
    },
    async submit() {
      if (!this.form.asset_code) { this.error = 'Codigo Bien requerido'; return; }
      if (!this.form.return_type || !this.form.return_date) { this.error = 'Tipo y fecha requeridos'; return; }
      this.submitting = true;
      try {
        const payload = {
          asset_code: this.form.asset_code,
          return_type: this.form.return_type,
          return_date: this.form.return_date,
          nro_informe: this.form.nro_informe,
          stt_number: this.form.stt_number,
          cite_ref: this.form.cite_ref,
          motivo: this.form.motivo,
          devuelto_por: this.form.devuelto_por,
          equipo_id: this.foundEquipo?.id || null
        };
        if (this.editing) {
          await api.put('/devueltos/' + this.form.id, payload);
        } else {
          await api.post('/devueltos', payload);
        }
        this.success = this.editing ? 'Devolucion actualizada' : 'Devolucion registrada';
        setTimeout(() => { this.showForm = false; this.success = ''; this.loadData(); }, 1000);
      } catch (e) { this.error = e.response?.data?.error || 'Error al guardar'; }
      this.submitting = false;
    }
  }
};
</script>

<style scoped>
.devoluciones-container {
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

.asset-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--c-accent);
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.btn-icon-edit, .btn-icon-delete {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon-edit { color: var(--c-warning); }
.btn-icon-edit:hover { background: rgba(251,191,36,0.1); }
.btn-icon-delete { color: var(--c-danger); }
.btn-icon-delete:hover { background: rgba(251,113,133,0.1); }

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-cambio { background: rgba(251,191,36,0.12); color: var(--c-warning); }
.status-defecto { background: rgba(251,113,133,0.12); color: var(--c-danger); }
.status-retiro { background: rgba(129,140,248,0.12); color: var(--c-accent); }
.status-recogido { background: rgba(96,165,250,0.12); color: var(--c-info); }
.status-otro { background: var(--c-surface2); color: var(--c-text-muted); }

[data-theme="light"] .status-cambio { color: #b45309; }
[data-theme="light"] .status-defecto { color: #dc2626; }
[data-theme="light"] .status-retiro { color: #4f46e5; }
[data-theme="light"] .status-recogido { color: #2563eb; }

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
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

[data-theme="light"] .modal-content-box {
  box-shadow: 0 10px 40px rgba(0,0,0,0.12);
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

.form-group.full-width {
  grid-column: span 2;
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

.form-success {
  color: var(--c-success);
  font-size: 0.8rem;
}

.form-error {
  color: var(--c-danger);
  font-size: 0.8rem;
}

.form-muted {
  color: var(--c-text-muted);
  font-size: 0.8rem;
}

.alert-error {
  background: rgba(210, 34, 41, 0.1);
  border: 1px solid rgba(210, 34, 41, 0.3);
  color: var(--c-danger);
  padding: 12px 16px;
  border-radius: var(--c-radius);
  margin-top: 16px;
}

.alert-success {
  background: rgba(0, 166, 90, 0.1);
  border: 1px solid rgba(0, 166, 90, 0.3);
  color: var(--c-success);
  padding: 12px 16px;
  border-radius: var(--c-radius);
  margin-top: 16px;
}

[data-theme="light"] .alert-error {
  background: rgba(239,68,68,0.05);
  border-color: rgba(239,68,68,0.18);
}

[data-theme="light"] .alert-success {
  background: rgba(16,185,129,0.05);
  border-color: rgba(16,185,129,0.18);
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

  .form-group.full-width {
    grid-column: span 1;
  }
}
</style>
