<template>
  <div class="equipos-container">
    <div class="equipos-header">
      <h4>Equipos (ONTs) <span class="result-count">{{ total }} registros</span></h4>
      <button class="btn-new" @click="openNew()">+ Nuevo Lote</button>
    </div>

    <div class="search-bar">
      <div class="search-group">
        <div class="search-input-wrapper">
          <span class="search-icon">&#128269;</span>
          <input v-model="search" @input="debouncedLoad" class="search-input" placeholder="Buscar por codigo, serie, MAC, modelo...">
        </div>
        <select v-model="filterStatus" @change="page=1; loadData()" class="search-select">
          <option value="">Todos los estados</option>
          <option value="en_bines">En Bines</option>
          <option value="despachada">Despachada</option>
          <option value="instalada">Instalada</option>
          <option value="devuelta">Devuelta</option>
          <option value="en_bines_mal_estado">Mal Estado</option>
        </select>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('asset_code')">Codigo <span v-html="sortIcon('asset_code')"></span></th>
            <th class="sortable" @click="toggleSort('description')">Descripcion <span v-html="sortIcon('description')"></span></th>
            <th class="sortable" @click="toggleSort('modelo')">Modelo <span v-html="sortIcon('modelo')"></span></th>
            <th class="sortable" @click="toggleSort('adapter_serial')">Serie Adapt. <span v-html="sortIcon('adapter_serial')"></span></th>
            <th class="sortable" @click="toggleSort('mac_address')">MAC <span v-html="sortIcon('mac_address')"></span></th>
            <th class="sortable" @click="toggleSort('serie_equipo')">Serie Eq. <span v-html="sortIcon('serie_equipo')"></span></th>
            <th class="sortable" @click="toggleSort('color')">Color <span v-html="sortIcon('color')"></span></th>
            <th class="sortable" @click="toggleSort('status')">Estado <span v-html="sortIcon('status')"></span></th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><code class="asset-code">{{ item.asset_code }}</code></td>
            <td class="desc-cell"><small>{{ truncate(item.description, 45) }}</small></td>
            <td><small>{{ item.modelo }}</small></td>
            <td><small class="muted-text">{{ truncate(item.adapter_serial, 20) }}</small></td>
            <td><small class="muted-text">{{ item.mac_address }}</small></td>
            <td><small class="muted-text">{{ item.serie_equipo }}</small></td>
            <td><small>{{ item.color }}</small></td>
            <td><span class="status-badge" :class="'status-' + item.status">{{ item.status }}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-edit" @click="editData(item)" title="Editar">&#9998;</button>
                <router-link :to="`/equipo/${item.id}`" class="btn-icon-info" title="Detalle">&#128065;</router-link>
              </div>
            </td>
          </tr>
          <tr v-if="items.length === 0"><td colspan="9" class="text-center empty-text">No se encontraron equipos</td></tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-info">Mostrando {{ items.length }} de {{ total }}</span>
      <div class="pagination-buttons">
        <button class="btn-page" :disabled="page <= 1" @click="page--; loadData()">&#9664; Anterior</button>
        <span class="page-num">{{ page }}</span>
        <button class="btn-page" :disabled="items.length < limit" @click="page++; loadData()">Siguiente &#9654;</button>
      </div>
    </div>

    <!-- MODAL: EDITAR UN SOLO EQUIPO -->
    <div class="modal-overlay" tabindex="-1" v-if="showForm && !isBatch" @click.self="showForm = false">
      <div class="modal-content-box modal-lg">
        <div class="modal-header-box">
          <h5 class="modal-title-box">Editar Equipo</h5>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <div class="modal-body-box">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Codigo *</label>
              <input v-model="form.asset_code" class="form-input" readonly>
            </div>
            <div class="form-group full-width">
              <label class="form-label">Descripcion *</label>
              <input v-model="form.description" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Modelo</label>
              <input v-model="form.modelo" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Serie Adaptador</label>
              <input v-model="form.adapter_serial" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">MAC</label>
              <input v-model="form.mac_address" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">FSAN</label>
              <input v-model="form.fsan" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Serie Equipo</label>
              <input v-model="form.serie_equipo" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Color</label>
              <input v-model="form.color" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Nota AF</label>
              <input v-model="form.delivery_note_af" class="form-input">
            </div>
            <div class="form-group full-width">
              <label class="form-label">Observacion</label>
              <input v-model="form.observation" class="form-input">
            </div>
            <div class="form-group full-width">
              <label class="form-label">Devolucion STT</label>
              <input v-model="form.return_stt_note" class="form-input">
            </div>
          </div>
          <div v-if="error" class="alert-error">{{ error }}</div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showForm = false">Cancelar</button>
          <button class="btn-primary" @click="saveSingle" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL: NUEVO LOTE -->
    <div class="modal-overlay" tabindex="-1" v-if="showForm && isBatch" @click.self="showForm = false">
      <div class="modal-content-box modal-xl">
        <div class="modal-header-box">
          <h5 class="modal-title-box">Nuevo Lote de Equipos</h5>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <div class="modal-body-box">
          <!-- PASO 1: Datos del lote -->
          <div v-if="!batchReady" class="batch-step">
            <h6 class="section-title">1. Datos del Lote</h6>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Nota de Entrega AF *</label>
                <input v-model="batch.notaAf" class="form-input" placeholder="Ej: AF-050/2024">
              </div>
              <div class="form-group">
                <label class="form-label">Codigo Bien Inicial *</label>
                <input v-model="batch.codigoInicial" class="form-input" placeholder="Ej: CTP-32-27-13-41-001">
              </div>
              <div class="form-group">
                <label class="form-label">Cantidad *</label>
                <input v-model.number="batch.cantidad" type="number" min="1" max="500" class="form-input" placeholder="Ej: 25">
              </div>
              <div class="form-group">
                <label class="form-label">Descripcion comun</label>
                <input v-model="batch.description" class="form-input" placeholder="Ej: ONT FTTH Modem de Fibra Optica m/DZS">
              </div>
              <div class="form-group">
                <label class="form-label">Modelo comun</label>
                <input v-model="batch.modelo" class="form-input" placeholder="Ej: ZNID GPON 2426A1,EU">
              </div>
              <div class="form-group">
                <label class="form-label">Color</label>
                <input v-model="batch.color" class="form-input" placeholder="Ej: Negro">
              </div>
            </div>
            <button class="btn-primary mt-3" @click="generarFilas" :disabled="!batch.notaAf || !batch.codigoInicial || !batch.cantidad || batch.cantidad < 1">
              Generar Formulario
            </button>
          </div>

          <!-- PASO 2: Detalle de cada equipo -->
          <div v-if="batchReady" class="batch-step">
            <div class="batch-header">
              <div>
                <span class="result-count">{{ batchItems.length }} equipos</span>
                <small class="muted-text ms-2">
                  Nota: <strong>{{ batch.notaAf }}</strong> |
                  Codigo: <strong>{{ batchItems[0]?.asset_code }}</strong> a <strong>{{ batchItems[batchItems.length-1]?.asset_code }}</strong>
                </small>
              </div>
              <button class="btn-secondary" @click="batchReady = false">Volver a configurar</button>
            </div>

            <div class="info-banner">
              <strong>Atajo:</strong> Haz clic en "Copiar" en cualquier fila para copiar Modelo/Serie/MAC de esa fila a la siguiente.
              Los campos comunes (Nota AF, Descripcion, Color) ya estan pre-cargados.
            </div>

            <div class="batch-table-wrapper">
              <table class="batch-table">
                <thead>
                  <tr>
                    <th style="width:35px">#</th>
                    <th style="width:190px">Codigo</th>
                    <th style="width:180px">Serie Adaptador</th>
                    <th style="width:150px">MAC Address</th>
                    <th style="width:150px">Serie Equipo</th>
                    <th style="width:120px">Modelo</th>
                    <th style="width:100px">FSAN</th>
                    <th style="width:150px">Observacion</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in batchItems" :key="idx">
                    <td class="text-center fw-bold">{{ idx + 1 }}</td>
                    <td><input v-model="item.asset_code" class="batch-input" readonly></td>
                    <td><input v-model="item.adapter_serial" class="batch-input" placeholder="Serie"></td>
                    <td><input v-model="item.mac_address" class="batch-input" placeholder="AA:BB:CC:DD:EE:FF"></td>
                    <td><input v-model="item.serie_equipo" class="batch-input" placeholder="Serie eq."></td>
                    <td><input v-model="item.modelo" class="batch-input" placeholder="Modelo"></td>
                    <td><input v-model="item.fsan" class="batch-input" placeholder="FSAN"></td>
                    <td><input v-model="item.observation" class="batch-input" placeholder="Obs."></td>
                    <td><button class="btn-copy" @click="copiarFila(idx)" title="Copiar datos a la siguiente fila">&#128203;</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="error" class="alert-error">{{ error }}</div>
          <div v-if="success" class="alert-success">{{ success }}</div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showForm = false">Cancelar</button>
          <button v-if="batchReady" class="btn-success" @click="saveBatch" :disabled="saving">
            {{ saving ? 'Guardando ' + batchItems.length + ' equipos...' : 'Guardar Lote (' + batchItems.length + ')' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api.js'
export default {
  data() {
    return {
      items: [], total: 0, page: 1, limit: 15,
      search: '', filterStatus: '',
      sortBy: 'asset_code', sortDir: 'ASC',
      showForm: false, isBatch: false, editItem: null,
      saving: false, error: '', success: '',
      form: this.emptyForm(),
      debounceTimer: null,
      batch: { notaAf: '', codigoInicial: '', cantidad: 1, description: '', modelo: '', color: '' },
      batchReady: false,
      batchItems: []
    }
  },
  async mounted() {
    this.loadData();
  },
  methods: {
    emptyForm() {
      return { asset_code: '', description: '', delivery_note_af: '', adapter_serial: '',
        mac_address: '', modelo: '', fsan: '', serie_equipo: '', color: '', observation: '', return_stt_note: '', status: 'en_bines' }
    },
    openNew() {
      this.editItem = null;
      this.isBatch = true;
      this.batchReady = false;
      this.batchItems = [];
      this.batch = { notaAf: '', codigoInicial: '', cantidad: 1, description: '', modelo: '', color: '' };
      this.error = '';
      this.success = '';
      this.showForm = true;
    },
    editData(item) {
      this.editItem = item;
      this.form = { ...item };
      this.isBatch = false;
      this.error = '';
      this.showForm = true;
    },
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s },
    toggleSort(col) {
      if (this.sortBy === col) { this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC' }
      else { this.sortBy = col; this.sortDir = 'ASC' }
      this.page = 1; this.loadData()
    },
    sortIcon(col) {
      if (this.sortBy !== col) return '<small style="opacity:0.4">&#8597;</small>';
      return this.sortDir === 'ASC' ? '<small>&#9650;</small>' : '<small>&#9660;</small>';
    },
    debouncedLoad() { clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => { this.page = 1; this.loadData() }, 300) },
    async loadData() {
      const params = { page: this.page, limit: this.limit, search: this.search, status: this.filterStatus, sortBy: this.sortBy, sortDir: this.sortDir };
      const res = await api.get('/equipos', { params });
      this.items = res.data.data; this.total = res.data.total;
    },
    generarFilas() {
      const codigo = this.batch.codigoInicial.trim().toUpperCase();
      const match = codigo.match(/^(.+)-(\d+)$/);
      if (!match) { this.error = 'Formato de codigo incorrecto. Use: CTP-32-27-13-41-001'; return; }
      const prefijo = match[1];
      const numInicio = parseInt(match[2]);
      const digits = match[2].length;
      this.batchItems = [];
      for (let i = 0; i < this.batch.cantidad; i++) {
        const num = numInicio + i;
        const cod = prefijo + '-' + String(num).padStart(digits, '0');
        this.batchItems.push({
          asset_code: cod, description: this.batch.description, delivery_note_af: this.batch.notaAf,
          adapter_serial: '', mac_address: '', modelo: this.batch.modelo, fsan: '', serie_equipo: '',
          color: this.batch.color, observation: '', return_stt_note: '', status: 'en_bines'
        });
      }
      this.batchReady = true;
      this.error = '';
    },
    copiarFila(idx) {
      if (idx >= this.batchItems.length - 1) return;
      const src = this.batchItems[idx];
      const dst = this.batchItems[idx + 1];
      dst.modelo = src.modelo;
      dst.adapter_serial = '';
      dst.mac_address = '';
      dst.serie_equipo = '';
      dst.fsan = '';
    },
    async saveSingle() {
      this.error = '';
      if (!this.form.asset_code || !this.form.description) { this.error = 'Codigo y descripcion requeridos'; return }
      this.saving = true;
      try {
        await api.put(`/equipos/${this.editItem.id}`, this.form);
        this.showForm = false; this.loadData();
      } catch (e) { this.error = e.response?.data?.error || 'Error al guardar' }
      this.saving = false;
    },
    async saveBatch() {
      this.error = '';
      this.saving = true;
      try {
        const res = await api.post('/equipos/batch', { items: this.batchItems });
        this.success = res.data.message;
        this.saving = false;
        setTimeout(() => { this.showForm = false; this.success = ''; this.loadData(); }, 1500);
      } catch (e) {
        this.error = e.response?.data?.error || 'Error al guardar lote';
        this.saving = false;
      }
    }
  }
}
</script>

<style scoped>
.equipos-container { padding: 0; }

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

.search-bar { margin-bottom: 16px; }
.search-group { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search-input-wrapper { flex: 1; min-width: 250px; position: relative; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; }

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
  min-width: 160px;
}

.search-select:focus { outline: none; border-color: var(--c-accent); }

.data-table-wrapper {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  overflow: hidden;
}

.data-table { width: 100%; border-collapse: collapse; }
.data-table thead { background: var(--c-surface2); }

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

.data-table th.sortable { cursor: pointer; user-select: none; }
.data-table th.sortable:hover { background: var(--c-border); }

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
  font-size: 0.9rem;
  color: var(--c-text);
}

.data-table tbody tr:hover { background: var(--c-surface2); }

.asset-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--c-accent);
}

.desc-cell { max-width: 250px; }
.muted-text { color: var(--c-text-muted); }

.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-en_bines { background: rgba(52,211,153,0.12); color: #34d399; }
.status-despachada { background: rgba(251,191,36,0.12); color: #fbbf24; }
.status-instalada { background: rgba(96,165,250,0.12); color: #60a5fa; }
.status-devuelta { background: rgba(129,140,248,0.12); color: #818cf8; }
.status-en_bines_mal_estado { background: rgba(251,113,133,0.12); color: #fb7185; }

[data-theme="light"] .status-en_bines { background: rgba(16,185,129,0.08); color: #059669; }
[data-theme="light"] .status-despachada { background: rgba(217,119,6,0.08); color: #d97706; }
[data-theme="light"] .status-instalada { background: rgba(59,130,246,0.08); color: #3b82f6; }
[data-theme="light"] .status-devuelta { background: rgba(99,102,241,0.08); color: #6366f1; }
[data-theme="light"] .status-en_bines_mal_estado { background: rgba(239,68,68,0.08); color: #ef4444; }

.action-buttons { display: flex; gap: 4px; }

.btn-icon-edit, .btn-icon-info {
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
.btn-icon-info { color: var(--c-info); }
.btn-icon-info:hover { background: rgba(96,165,250,0.1); }

.empty-text { color: var(--c-text-muted); padding: 20px; }

.pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.pagination-info { color: var(--c-text-muted); font-size: 0.9rem; }
.pagination-buttons { display: flex; gap: 8px; align-items: center; }

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

.btn-page:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent); }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }

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
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,10,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px);
}

[data-theme="light"] .modal-overlay {
  background: rgba(0,0,0,0.35);
}

.modal-content-box {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius-lg);
  width: 95%; max-width: 700px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-content-box.modal-lg { max-width: 900px; }
.modal-content-box.modal-xl { max-width: 1100px; }

.modal-header-box {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--c-primary) 0%, var(--c-surface2) 100%);
  border-bottom: 1px solid var(--c-border);
  border-radius: var(--c-radius-lg) var(--c-radius-lg) 0 0;
}

[data-theme="light"] .modal-header-box {
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%);
}

.modal-title-box { margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--c-accent); }

.modal-close {
  background: var(--c-border); border: none; color: var(--c-text);
  font-size: 24px; width: 36px; height: 36px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover { background: var(--c-accent); color: var(--c-bg); }
[data-theme="light"] .modal-close:hover { color: #fff; }

.modal-body-box { padding: 24px; overflow-y: auto; flex: 1; }

.modal-footer-box {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 24px; background: var(--c-surface2);
  border-top: 1px solid var(--c-border);
  border-radius: 0 0 var(--c-radius-lg) var(--c-radius-lg);
}

.btn-primary {
  background: var(--c-accent); color: var(--c-bg); border: none;
  padding: 10px 20px; border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}

[data-theme="light"] .btn-primary {
  color: #fff;
}

.btn-primary:hover:not(:disabled) { background: var(--c-accent-hover); }
.btn-primary:disabled { background: var(--c-border); color: var(--c-text-muted); cursor: not-allowed; }

.btn-success {
  background: var(--c-success); color: var(--c-bg); border: none;
  padding: 10px 20px; border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}

[data-theme="light"] .btn-success {
  color: #fff;
}

.btn-success:hover:not(:disabled) { opacity: 0.9; }
.btn-success:disabled { background: var(--c-border); color: var(--c-text-muted); cursor: not-allowed; }

.btn-secondary {
  background: var(--c-surface2); border: 1px solid var(--c-border); color: var(--c-text);
  padding: 10px 20px; border-radius: var(--c-radius);
  font-family: 'DM Sans', sans-serif; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}

.btn-secondary:hover { border-color: var(--c-accent); color: var(--c-accent); }

/* Forms */
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full-width { grid-column: span 3; }

.form-label {
  font-size: 0.8rem; font-weight: 700; color: var(--c-accent);
  text-transform: uppercase; letter-spacing: 0.5px;
}

.form-input {
  padding: 10px 12px;
  background: var(--c-surface2); border: 1px solid var(--c-border);
  border-radius: var(--c-radius); color: var(--c-text);
  font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
  transition: all 0.2s;
}

.form-input:focus { outline: none; border-color: var(--c-accent); box-shadow: 0 0 0 3px var(--c-accent-dim); }
.form-input[readonly] { background: var(--c-border); cursor: not-allowed; }

.alert-error {
  background: rgba(210,34,41,0.1); border: 1px solid rgba(210,34,41,0.3);
  color: var(--c-danger); padding: 12px 16px; border-radius: var(--c-radius); margin-top: 16px;
}

.alert-success {
  background: rgba(0,166,90,0.1); border: 1px solid rgba(0,166,90,0.3);
  color: var(--c-success); padding: 12px 16px; border-radius: var(--c-radius); margin-top: 16px;
}

[data-theme="light"] .alert-error {
  background: rgba(239,68,68,0.05);
  border-color: rgba(239,68,68,0.18);
}

[data-theme="light"] .alert-success {
  background: rgba(16,185,129,0.05);
  border-color: rgba(16,185,129,0.18);
}

/* Batch */
.batch-step { margin-bottom: 16px; }
.batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { margin: 0 0 16px 0; font-size: 1rem; font-weight: 700; color: var(--c-accent); }

.info-banner {
  background: var(--c-accent-dim); border: 1px solid var(--c-accent);
  padding: 10px 14px; border-radius: var(--c-radius);
  font-size: 0.85rem; color: var(--c-text); margin-bottom: 12px;
}

[data-theme="light"] .info-banner {
  background: rgba(59,130,246,0.04);
}

.batch-table-wrapper {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--c-radius); overflow: auto; max-height: 400px;
}

.batch-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }

.batch-table th {
  background: var(--c-surface2); padding: 8px; font-size: 0.75rem;
  font-weight: 700; text-transform: uppercase; color: var(--c-accent);
  border-bottom: 1px solid var(--c-border); position: sticky; top: 0; z-index: 1;
}

.batch-table td {
  padding: 4px; border-bottom: 1px solid var(--c-border); color: var(--c-text);
}

.batch-input {
  width: 100%; padding: 4px 6px; font-size: 0.8rem;
  background: var(--c-surface2); border: 1px solid var(--c-border);
  border-radius: 4px; color: var(--c-text);
  font-family: 'JetBrains Mono', monospace;
}

.batch-input:focus { outline: none; border-color: var(--c-accent); }
.batch-input[readonly] { background: var(--c-border); }

.btn-copy {
  background: var(--c-surface2); border: 1px solid var(--c-border);
  color: var(--c-text-muted); padding: 4px 6px; border-radius: 4px;
  cursor: pointer; font-size: 14px; transition: all 0.2s;
}

.btn-copy:hover { border-color: var(--c-accent); color: var(--c-accent); }

@media (max-width: 768px) {
  .search-group { flex-direction: column; }
  .search-select { width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
  .form-group.full-width { grid-column: span 1; }
}
</style>
