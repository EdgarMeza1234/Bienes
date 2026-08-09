<template>
  <div class="siat-container">
    <div class="equipos-header">
      <h4>Vales de Salida <span class="result-count">{{ total }} registros</span></h4>
      <button class="siat-btn siat-btn-primary" @click="openNew">
        <span class="siat-btn-icon">+</span> Nuevo Vale
      </button>
    </div>

    <div class="siat-card siat-search-card">
      <div class="d-flex align-items-center gap-3">
        <div class="flex-grow-1 position-relative">
          <span class="siat-search-icon">&#128269;</span>
          <input type="text" class="siat-input siat-search-input" v-model="search" @input="debouncedLoad"
            placeholder="Buscar por codigo, solicitado, destino...">
        </div>
      </div>
    </div>

    <div class="siat-card">
      <div class="table-responsive">
        <table class="siat-table">
          <thead>
            <tr>
              <th class="siat-th sortable" @click="toggleSort('asset_code')">
                <div class="d-flex align-items-center gap-1">
                  Codigo Bien
                  <span class="siat-sort" v-html="sortIcon('asset_code')"></span>
                </div>
              </th>
              <th class="siat-th sortable" @click="toggleSort('description')">
                <div class="d-flex align-items-center gap-1">
                  Descripcion
                  <span class="siat-sort" v-html="sortIcon('description')"></span>
                </div>
              </th>
              <th class="siat-th sortable" @click="toggleSort('modelo')">
                <div class="d-flex align-items-center gap-1">
                  Modelo
                  <span class="siat-sort" v-html="sortIcon('modelo')"></span>
                </div>
              </th>
              <th class="siat-th sortable" @click="toggleSort('solicitado')">
                <div class="d-flex align-items-center gap-1">
                  Solicitado
                  <span class="siat-sort" v-html="sortIcon('solicitado')"></span>
                </div>
              </th>
              <th class="siat-th sortable" @click="toggleSort('salida_materiales')">
                <div class="d-flex align-items-center gap-1">
                  Salida Materiales
                  <span class="siat-sort" v-html="sortIcon('salida_materiales')"></span>
                </div>
              </th>
              <th class="siat-th sortable" @click="toggleSort('fecha')">
                <div class="d-flex align-items-center gap-1">
                  Fecha
                  <span class="siat-sort" v-html="sortIcon('fecha')"></span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center siat-loading">
                <div class="siat-spinner"></div>
                <span>Cargando datos...</span>
              </td>
            </tr>
            <tr v-for="v in items" :key="v.id" class="siat-tr-hover">
              <td><span class="siat-badge siat-badge-info">{{ v.asset_code }}</span></td>
              <td><small class="siat-text-muted">{{ truncate(v.description, 40) }}</small></td>
              <td><span class="siat-badge siat-badge-outline">{{ v.modelo }}</span></td>
              <td>{{ v.solicitado }}</td>
              <td>{{ v.salida_materiales }}</td>
              <td><span class="siat-date">{{ $formatDate(v.fecha) }}</span></td>
            </tr>
            <tr v-if="items.length === 0 && !loading">
              <td colspan="6" class="text-center siat-empty">No se encontraron vales de salida</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center siat-pagination" v-if="total > limit">
      <small class="siat-text-muted">Mostrando {{ items.length }} de {{ total }}</small>
      <div class="siat-pagination-btns">
        <button class="siat-btn siat-btn-outline" :disabled="page<=1" @click="page--; loadData()">Anterior</button>
        <span class="siat-page-num">{{ page }}</span>
        <button class="siat-btn siat-btn-outline" :disabled="items.length < limit" @click="page++; loadData()">Siguiente</button>
      </div>
    </div>

    <!-- MODAL NUEVO VALE - ESTILO SIAT -->
    <div class="siat-modal-overlay" v-if="showNew" @click.self="showNew = false">
      <div class="siat-modal">
        <div class="siat-modal-header">
          <div>
            <h5 class="siat-modal-title">Nuevo Vale de Salida</h5>
            <small class="siat-text-muted">Complete los datos para generar el vale</small>
          </div>
          <button class="siat-modal-close" @click="showNew = false">&times;</button>
        </div>

        <div class="siat-modal-body">
          <div v-if="error" class="siat-alert siat-alert-danger">
            <span class="siat-alert-icon">&#9888;</span> {{ error }}
          </div>
          <div v-if="success" class="siat-alert siat-alert-success">
            <span class="siat-alert-icon">&#10003;</span> {{ success }}
          </div>

          <div class="siat-form-row">
            <div class="siat-form-group">
              <label class="siat-label">Solicitado por</label>
              <input v-model="form.solicitado" class="siat-input" placeholder="Nombre del solicitante">
            </div>
            <div class="siat-form-group">
              <label class="siat-label">Salida Materiales</label>
              <input v-model="form.salida_materiales" class="siat-input" placeholder="Ej: COTAP">
            </div>
            <div class="siat-form-group">
              <label class="siat-label">Fecha</label>
              <input v-model="form.fecha" type="date" class="siat-input">
            </div>
            <div class="siat-form-group">
              <label class="siat-label">Cantidad de equipos</label>
              <div class="siat-input-group">
                <input v-model.number="cantidad" type="number" min="1" max="200" class="siat-input" @keyup.enter="generarTabla">
                <button class="siat-btn siat-btn-outline" @click="generarTabla">Generar tabla</button>
              </div>
            </div>
          </div>

          <div v-if="form.equipos.length > 0" class="siat-equipos-section">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="siat-section-title mb-0">Equipos a despachar</h6>
              <span class="siat-badge siat-badge-success">{{ selectedCount }} / {{ form.equipos.length }}</span>
            </div>

            <div class="siat-table-wrapper" style="max-height:380px; overflow-y:auto">
              <table class="siat-table siat-table-sm">
                <thead>
                  <tr>
                    <th class="siat-th" style="width:35px">#</th>
                    <th class="siat-th" style="width:200px">Codigo Bien</th>
                    <th class="siat-th">Descripcion</th>
                    <th class="siat-th" style="width:120px">Modelo</th>
                    <th class="siat-th" style="width:140px">Serie Adapt.</th>
                    <th class="siat-th" style="width:130px">MAC</th>
                    <th class="siat-th" style="width:100px">FSAN</th>
                    <th class="siat-th" style="width:40px">Ok</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(eq, idx) in form.equipos" :key="idx" :class="{'siat-row-selected': eq.selected}">
                    <td class="text-center siat-idx">{{ idx + 1 }}</td>
                    <td>
                      <div class="siat-autocomplete-wrapper">
                        <input v-model="eq.query" class="siat-input siat-input-sm"
                          :placeholder="'Buscar equipo ' + (idx+1)" @input="buscarEquipo(idx)" @focus="buscarEquipo(idx)" autocomplete="off">
                        <div v-if="eq.showDropdown && eq.results.length > 0" class="siat-dropdown">
                          <div v-for="r in eq.results" :key="r.id" class="siat-dropdown-item" @click="seleccionarEquipo(idx, r)">
                            <strong class="siat-dropdown-code">{{ r.asset_code }}</strong>
                            <span class="siat-dropdown-model">{{ r.modelo || '-' }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><small class="siat-text-muted">{{ eq.selected ? truncate(eq.selected.description, 50) : '-' }}</small></td>
                    <td><small>{{ eq.selected ? eq.selected.modelo : '-' }}</small></td>
                    <td><small>{{ eq.selected ? eq.selected.adapter_serial : '-' }}</small></td>
                    <td><small>{{ eq.selected ? eq.selected.mac_address : '-' }}</small></td>
                    <td><small>{{ eq.selected ? eq.selected.fsan : '-' }}</small></td>
                    <td class="text-center">
                      <span v-if="eq.selected" class="siat-check">&#10003;</span>
                      <span v-else class="siat-pending">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="siat-modal-footer">
          <button class="siat-btn siat-btn-ghost" @click="showNew = false">Cancelar</button>
          <button class="siat-btn siat-btn-primary" @click="saveVale" :disabled="saving || selectedCount === 0">
            <span v-if="saving" class="siat-btn-spinner"></span>
            {{ saving ? 'Guardando...' : 'Guardar vale (' + selectedCount + ' equipos)' }}
          </button>
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
      items: [], total: 0, page: 1, limit: 15, search: '', loading: false, debounceTimer: null, sortBy: 'fecha', sortDir: 'DESC',
      showNew: false, saving: false, error: '', success: '', cantidad: 10,
      form: { solicitado: '', salida_materiales: '', fecha: new Date().toISOString().split('T')[0], equipos: [] }
    };
  },
  computed: {
    selectedCount() { return this.form.equipos.filter(e => e.selected).length; }
  },
  mounted() { this.loadData(); },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s },
    debouncedLoad() { clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => { this.page = 1; this.loadData() }, 300) },
    toggleSort(col) {
      if (this.sortBy === col) { this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC' }
      else { this.sortBy = col; this.sortDir = 'ASC' }
      this.page = 1; this.loadData()
    },
    sortIcon(col) {
      if (this.sortBy !== col) return '<span class="siat-sort-idle">&#8597;</span>';
      return this.sortDir === 'ASC' ? '<span class="siat-sort-active">&#9650;</span>' : '<span class="siat-sort-active">&#9660;</span>';
    },
    async loadData() {
      this.loading = true;
      const res = await api.get('/vales', { params: { page: this.page, limit: this.limit, search: this.search, sortBy: this.sortBy, sortDir: this.sortDir } });
      this.items = res.data.data; this.total = res.data.total; this.loading = false;
    },
    openNew() {
      this.form = { solicitado: '', salida_materiales: '', fecha: new Date().toISOString().split('T')[0], equipos: [] };
      this.cantidad = 10;
      this.error = ''; this.success = ''; this.showNew = true;
    },
    generarTabla() {
      const n = Math.min(Math.max(parseInt(this.cantidad) || 1, 1), 200);
      this.form.equipos = [];
      for (let i = 0; i < n; i++) {
        this.form.equipos.push({ query: '', selected: null, results: [], showDropdown: false });
      }
    },
    async buscarEquipo(idx) {
      const q = this.form.equipos[idx].query;
      if (!q || q.length < 2) { this.form.equipos[idx].results = []; this.form.equipos[idx].showDropdown = false; return; }
      try {
        const res = await api.get('/equipos', { params: { search: q, status: 'en_bines', limit: 20 } });
        const selectedCodes = this.form.equipos.filter(e => e.selected).map(e => e.selected.asset_code);
        this.form.equipos[idx].results = (res.data.data || []).filter(r => !selectedCodes.includes(r.asset_code));
        this.form.equipos[idx].showDropdown = true;
      } catch(e) { this.form.equipos[idx].results = []; }
    },
    seleccionarEquipo(idx, equipo) {
      this.form.equipos[idx].query = equipo.asset_code;
      this.form.equipos[idx].selected = equipo;
      this.form.equipos[idx].showDropdown = false;
      this.form.equipos[idx].results = [];
    },
    async saveVale() {
      this.error = ''; this.success = '';
      if (!this.form.solicitado) { this.error = 'El campo Solicitado es obligatorio'; return; }
      const selected = this.form.equipos.filter(e => e.selected);
      if (selected.length === 0) { this.error = 'Seleccione al menos un equipo'; return; }
      this.saving = true;
      try {
        const res = await api.post('/vales/batch', {
          equipo_ids: selected.map(e => e.selected.id),
          solicitado: this.form.solicitado,
          salida_materiales: this.form.salida_materiales,
          fecha: this.form.fecha
        });
        this.success = `Vale generado exitosamente con ${res.data.created} equipos`;
        await this.loadData();
        setTimeout(() => { this.showNew = false; }, 1500);
      } catch(e) { this.error = e.response?.data?.error || 'Error al guardar el vale'; }
      this.saving = false;
    }
  }
};
</script>

<style>
.siat-container { max-width: 1200px; }

[data-theme="light"] .result-count {
  color: #fff;
}

.siat-subtitle { color: var(--c-text-muted); font-size: 0.78rem; }

.result-count {
  background: var(--c-accent);
  color: var(--c-bg);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
}

[data-theme="light"] .result-count {
  color: #fff;
}

.siat-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  padding: 14px 16px;
  margin-bottom: 12px;
}
.siat-search-card { padding: 10px 16px; }
.siat-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--c-text-muted); }
.siat-search-input { padding-left: 36px !important; }

.siat-input {
  width: 100%; padding: 8px 12px;
  background: var(--c-surface2); border: 1px solid var(--c-border);
  border-radius: var(--c-radius); font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem; color: var(--c-text); transition: border-color 0.2s;
}
.siat-input:focus { outline: none; border-color: var(--c-accent); box-shadow: 0 0 0 2px var(--c-accent-dim); }
.siat-input::placeholder { color: var(--c-text-muted); }
.siat-input-sm { padding: 5px 8px; font-size: 0.8rem; }

.siat-label {
  display: block; font-size: 0.72rem; font-weight: 700;
  color: var(--c-accent); margin-bottom: 4px;
  text-transform: uppercase; letter-spacing: 0.5px;
}

.siat-table { width: 100%; border-collapse: collapse; }
.siat-table .siat-th {
  background: var(--c-surface2); padding: 10px 12px;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--c-accent);
  border-bottom: 1px solid var(--c-border); white-space: nowrap; user-select: none;
}
.siat-table .siat-th.sortable { cursor: pointer; }
.siat-table .siat-th.sortable:hover { background: var(--c-border); }
.siat-table td {
  padding: 10px 12px; border-bottom: 1px solid var(--c-border);
  font-size: 0.82rem; vertical-align: middle; color: var(--c-text);
}
.siat-tr-hover:hover td { background: rgba(129,140,248,0.03); }
[data-theme="light"] .siat-tr-hover:hover td { background: rgba(99,102,241,0.03); }

.siat-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; }
.siat-badge-info { background: var(--c-accent-dim); color: var(--c-accent); }
.siat-badge-success { background: rgba(52,211,153,0.12); color: var(--c-success); }
[data-theme="light"] .siat-badge-success { background: rgba(16,185,129,0.08); color: #059669; }
.siat-badge-outline { border: 1px solid var(--c-border); color: var(--c-text-muted); }

.siat-text-muted { color: var(--c-text-muted); font-size: 0.8rem; }
.siat-loading { padding: 40px 0 !important; color: var(--c-text-muted); }
.siat-empty { padding: 40px 0 !important; color: var(--c-text-muted); font-style: italic; }

.siat-spinner {
  width: 24px; height: 24px;
  border: 3px solid var(--c-border); border-top-color: var(--c-accent);
  border-radius: 50%; animation: siat-spin 0.8s linear infinite; margin: 0 auto 8px;
}
@keyframes siat-spin { to { transform: rotate(360deg); } }

.siat-pagination { padding: 8px 0; }
.siat-pagination-btns { display: flex; align-items: center; gap: 8px; }
.siat-page-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  background: var(--c-accent); color: #1a1a2e;
  border-radius: var(--c-radius); font-size: 0.8rem; font-weight: 700;
}
[data-theme="light"] .siat-page-num { color: #fff; }
.siat-sort-idle { opacity: 0.3; font-size: 11px; }
.siat-sort-active { color: var(--c-accent); font-size: 11px; }
.siat-sort { cursor: pointer; }

/* Buttons */
.siat-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
  font-weight: 600; cursor: pointer; transition: all 0.2s;
  border: none; white-space: nowrap;
}
.siat-btn-primary { background: var(--c-accent); color: #1a1a2e; }
[data-theme="light"] .siat-btn-primary { color: #fff; }
.siat-btn-primary:hover { background: var(--c-accent-hover); }
.siat-btn-primary:disabled { background: var(--c-border); color: var(--c-text-muted); cursor: not-allowed; }
.siat-btn-outline { background: var(--c-surface2); border: 1px solid var(--c-border); color: var(--c-text); }
.siat-btn-outline:hover { border-color: var(--c-accent); color: var(--c-accent); }
.siat-btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
.siat-btn-ghost { background: transparent; color: var(--c-text-muted); }
.siat-btn-ghost:hover { background: var(--c-surface2); color: var(--c-text); }
.siat-btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(26,26,46,0.3); font-size: 14px; line-height: 1;
}
.siat-btn-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(26,26,46,0.3); border-top-color: #1a1a2e;
  border-radius: 50%; animation: siat-spin 0.7s linear infinite;
}

.siat-input-group { display: flex; gap: 6px; }
.siat-input-group .siat-input { flex: 1; }
.siat-input-group .siat-btn { flex-shrink: 0; }

/* Modal */
.siat-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,10,0.6); display: flex;
  align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(3px);
}

[data-theme="light"] .siat-modal-overlay {
  background: rgba(0,0,0,0.35);
}

.siat-modal {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--c-radius-lg); width: 95%; max-width: 1100px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

[data-theme="light"] .siat-modal {
  box-shadow: 0 10px 40px rgba(0,0,0,0.12);
}

.siat-modal-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 24px; border-bottom: 1px solid var(--c-border);
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%);
  color: var(--c-text); border-radius: var(--c-radius-lg) var(--c-radius-lg) 0 0;
}

[data-theme="light"] .siat-modal-header {
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%);
}
.siat-modal-title { font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--c-accent); }
.siat-modal-header .siat-text-muted { color: var(--c-text-muted); }
.siat-modal-close {
  background: var(--c-border); border: none; color: var(--c-text-muted);
  font-size: 20px; width: 32px; height: 32px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.siat-modal-close:hover { background: var(--c-accent); color: #1a1a2e; }
[data-theme="light"] .siat-modal-close:hover { color: #fff; }

.siat-modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.siat-modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid var(--c-border);
  background: var(--c-surface2); border-radius: 0 0 var(--c-radius-lg) var(--c-radius-lg);
}

.siat-form-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.siat-form-group { display: flex; flex-direction: column; }

/* Alerts */
.siat-alert {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: var(--c-radius); font-size: 0.82rem; margin-bottom: 14px;
}
.siat-alert-danger { background: rgba(251,113,133,0.08); color: var(--c-danger); border: 1px solid rgba(251,113,133,0.2); }
.siat-alert-success { background: rgba(52,211,153,0.08); color: var(--c-success); border: 1px solid rgba(52,211,153,0.2); }

[data-theme="light"] .siat-alert-danger { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.18); }
[data-theme="light"] .siat-alert-success { background: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.18); }

.siat-equipos-section {
  background: var(--c-surface2); border: 1px solid var(--c-border);
  border-radius: var(--c-radius); padding: 14px;
}
.siat-section-title {
  font-size: 0.82rem; font-weight: 700; color: var(--c-accent);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.siat-table-wrapper {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
}
.siat-table-sm .siat-th { padding: 7px 8px; font-size: 0.68rem; }
.siat-table-sm td { padding: 6px 8px; }

.siat-row-selected td { background: rgba(129,140,248,0.06) !important; }
[data-theme="light"] .siat-row-selected td { background: rgba(99,102,241,0.06) !important; }
.siat-idx { font-size: 0.75rem; font-weight: 700; color: var(--c-text-muted); }
.siat-check { color: var(--c-success); font-weight: 700; font-size: 14px; }
.siat-pending { color: var(--c-border); }

/* Autocomplete */
.siat-autocomplete-wrapper { position: relative; }
.siat-dropdown {
  position: absolute; top: 100%; left: 0; right: 0;
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: 0 0 var(--c-radius) var(--c-radius);
  max-height: 140px; overflow-y: auto; z-index: 50;
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);
}
.siat-dropdown-item {
  padding: 7px 10px; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--c-border); transition: background 0.15s;
}
.siat-dropdown-item:hover { background: var(--c-accent-dim); }
.siat-dropdown-item:last-child { border-bottom: none; }
.siat-dropdown-code { font-size: 0.78rem; color: var(--c-accent); }
.siat-dropdown-model { font-size: 0.72rem; color: var(--c-text-muted); }

@media (max-width: 768px) {
  .siat-form-row { grid-template-columns: 1fr; }
  .siat-modal { width: 100%; max-height: 100vh; border-radius: 0; }
  .siat-modal-header, .siat-modal-footer { border-radius: 0; }
}
</style>
