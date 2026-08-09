<template>
  <div class="instalaciones-container">
    <div class="equipos-header">
      <h4>Instalaciones <span class="result-count">{{ total }} registros</span></h4>
      <button class="btn-new" @click="openNew">+ Nueva Instalacion</button>
    </div>

    <div class="search-bar">
      <div class="search-group">
        <div class="search-input-wrapper">
          <span class="search-icon">&#128269;</span>
          <input type="text" class="search-input" v-model="search" @input="debouncedLoad" placeholder="Buscar por codigo, abonado o nombre...">
        </div>
        <select class="search-select" v-model="filterTecnico" @change="page=1; loadData()">
          <option value="">Todos los tecnicos</option>
          <option v-for="t in tecnicos" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('asset_code')">Codigo Bien <span v-html="sortIcon('asset_code')"></span></th>
            <th class="sortable" @click="toggleSort('client_code')">Codigo Ab. <span v-html="sortIcon('client_code')"></span></th>
            <th class="sortable" @click="toggleSort('abonado_name')">Abonado <span v-html="sortIcon('abonado_name')"></span></th>
            <th class="sortable" @click="toggleSort('fecha')">Fecha <span v-html="sortIcon('fecha')"></span></th>
            <th class="sortable" @click="toggleSort('tecnico')">Tecnico <span v-html="sortIcon('tecnico')"></span></th>
            <th class="sortable" @click="toggleSort('observacion')">Observacion <span v-html="sortIcon('observacion')"></span></th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center loading-text">Cargando...</td></tr>
          <tr v-for="i in items" :key="i.id">
            <td><code class="asset-code">{{ i.asset_code }}</code></td>
            <td><small>{{ i.abonado_code || '-' }}</small></td>
            <td>{{ i.abonado_name || '-' }}</td>
            <td>{{ $formatDate(i.fecha) }}</td>
            <td>{{ i.tecnico }}</td>
            <td><small>{{ truncate(i.observacion, 30) || '-' }}</small></td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-info" @click="viewDetail(i)" title="Ver detalle">&#128065;</button>
                <button class="btn-icon-edit" @click="editItem(i)" title="Editar">&#9998;</button>
                <button class="btn-icon-delete" @click="deleteItem(i)" title="Eliminar">&#128465;</button>
              </div>
            </td>
          </tr>
          <tr v-if="items.length === 0 && !loading"><td colspan="7" class="text-center empty-text">No hay instalaciones</td></tr>
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

    <!-- MODAL VER DETALLE + HISTORIAL -->
    <div class="modal-overlay" tabindex="-1" v-if="showDetail" @click.self="showDetail = false">
      <div class="modal-content-box modal-xl">
        <div class="modal-header-box">
          <div>
            <h5 class="modal-title-box">Detalle de Instalacion</h5>
            <span class="modal-subtitle">{{ detail?.asset_code }}</span>
          </div>
          <button class="modal-close" @click="showDetail = false">&times;</button>
        </div>
        <div class="modal-body-box" v-if="detail">
          <div class="detail-section">
            <h6 class="section-title">Equipo Instalado</h6>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Codigo:</span>
                <span class="detail-value"><code class="asset-code">{{ detail.asset_code }}</code></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Modelo:</span>
                <span class="detail-value">{{ detail.modelo || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Estado:</span>
                <span class="status-badge status-installed">instalada</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Descripcion:</span>
                <span class="detail-value">{{ detail.description || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Serie Equipo:</span>
                <span class="detail-value">{{ detail.serie_equipo || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Color:</span>
                <span class="detail-value">{{ detail.color || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Serie Adaptador:</span>
                <span class="detail-value">{{ detail.adapter_serial || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">MAC:</span>
                <span class="detail-value">{{ detail.mac_address || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">FSAN:</span>
                <span class="detail-value">{{ detail.fsan || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Nota AF:</span>
                <span class="detail-value">{{ detail.delivery_note_af || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h6 class="section-title">
              Historial de Instalaciones ({{ historial.length }} registros)
              <small>Ciclo de vida del equipo</small>
            </h6>
            <div v-if="loadingHistorial" class="loading-text">Cargando historial...</div>
            <div v-else-if="historial.length === 0" class="empty-text">Sin historial</div>
            <div v-else class="history-table-wrapper">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Tecnico</th>
                    <th>Codigo Ab.</th>
                    <th>Abonado</th>
                    <th>Observacion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, idx) in historial" :key="h.id" :class="{'history-active': h.id === detail.id}">
                    <td>
                      <span v-if="h.id === detail.id" class="status-badge status-active">&#9654;</span>
                      <span v-else>{{ idx + 1 }}</span>
                    </td>
                            <td><strong>{{ $formatDate(h.fecha) }}</strong></td>
                    <td>{{ h.tecnico || '-' }}</td>
                    <td><small>{{ h.client_code || '-' }}</small></td>
                    <td>{{ h.abonado_name || '-' }}</td>
                    <td><small>{{ truncate(h.observacion, 20) || '-' }}</small></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="detail-section">
            <h6 class="section-title">Abonado (Instalacion Seleccionada)</h6>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Codigo:</span>
                <span class="detail-value">{{ detail.abonado_code || '-' }}</span>
              </div>
              <div class="detail-item detail-full">
                <span class="detail-label">Nombre:</span>
                <span class="detail-value">{{ detail.abonado_name || '-' }}</span>
              </div>
              <div class="detail-item" v-if="detail.abonado_zone">
                <span class="detail-label">Zona:</span>
                <span class="detail-value">{{ detail.abonado_zone }}</span>
              </div>
              <div class="detail-item" v-if="detail.abonado_street">
                <span class="detail-label">Calle:</span>
                <span class="detail-value">{{ detail.abonado_street }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showDetail = false">Cerrar</button>
          <button class="btn-primary" @click="showDetail = false; editItem(detail)">Editar</button>
        </div>
      </div>
    </div>

    <!-- MODAL EDITAR -->
    <div class="modal-overlay" tabindex="-1" v-if="showEdit" @click.self="showEdit = false">
      <div class="modal-content-box">
        <div class="modal-header-box">
          <div>
            <h5 class="modal-title-box">Editar Instalacion</h5>
            <span class="modal-subtitle">{{ editForm.asset_code }}</span>
          </div>
          <button class="modal-close" @click="showEdit = false">&times;</button>
        </div>
        <div class="modal-body-box">
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label">Codigo del Bien</label>
              <input :value="editForm.asset_code" class="form-input" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">Codigo Abonado</label>
              <input v-model="editForm.abonado_code" class="form-input" placeholder="Codigo abonado" @input="buscarAbonadoEdit">
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Abonado</label>
              <input v-model="editForm.abonado_name" class="form-input" placeholder="Nombre del abonado" @input="buscarAbonadoEdit">
              <small v-if="editAbonado" class="form-success">&#10003; Encontrado: {{ editAbonado.client_code }} - {{ editAbonado.name }}</small>
              <small v-else-if="editForm.abonado_code && editForm.abonado_name && editForm.abonado_name.length > 3" class="form-muted">Se guardara tal como esta</small>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha Instalacion</label>
              <input v-model="editForm.fecha" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Tecnico</label>
              <input v-model="editForm.tecnico" class="form-input" list="listaTecnicosEdit" placeholder="Nombre del tecnico">
              <datalist id="listaTecnicosEdit">
                <option v-for="t in tecnicos" :key="t" :value="t"></option>
              </datalist>
            </div>
            <div class="form-group full-width">
              <label class="form-label">Observacion</label>
              <input v-model="editForm.observacion" class="form-input" placeholder="Observaciones...">
            </div>
          </div>
          <div v-if="error" class="alert-error">{{ error }}</div>
          <div v-if="success" class="alert-success">{{ success }}</div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showEdit = false">Cancelar</button>
          <button class="btn-primary" @click="saveEdit" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar Cambios' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL NUEVA INSTALACION -->
    <div class="modal-overlay" tabindex="-1" v-if="showNew" @click.self="showNew = false">
      <div class="modal-content-box">
        <div class="modal-header-box">
          <h5 class="modal-title-box">Nueva Instalacion</h5>
          <button class="modal-close" @click="showNew = false">&times;</button>
        </div>
        <div class="modal-body-box">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Codigo del Bien *</label>
              <input v-model="newForm.codigo_bien" class="form-input" placeholder="Ej: CTP-32-27-13-41-001" @input="buscarEquipoNew">
              <small v-if="newEquipo" class="form-success">&#10003; {{ newEquipo.description }}</small>
              <small v-else-if="newForm.codigo_bien && newForm.codigo_bien.length > 5" class="form-error">No encontrado</small>
            </div>
            <div class="form-group">
              <label class="form-label">Codigo Abonado *</label>
              <input v-model="newForm.codigo_abonado" class="form-input" placeholder="Ej: 79064" @input="buscarAbonadoNew">
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Abonado *</label>
              <input v-model="newForm.nombre_abonado" class="form-input" placeholder="Nombre completo" @input="buscarAbonadoNew">
              <small v-if="newAbonado" class="form-success">&#10003; {{ newAbonado.name }}</small>
              <small v-else-if="newForm.codigo_abonado && newForm.nombre_abonado && newForm.nombre_abonado.length > 3" class="form-muted">Se creara nuevo registro</small>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha Instalacion *</label>
              <input v-model="newForm.fecha" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Tecnico *</label>
              <input v-model="newForm.tecnico" class="form-input" list="listaTecnicosNew" placeholder="Nombre del tecnico">
              <datalist id="listaTecnicosNew">
                <option v-for="t in tecnicos" :key="t" :value="t"></option>
              </datalist>
            </div>
            <div class="form-group">
              <label class="form-label">Observacion</label>
              <input v-model="newForm.observacion" class="form-input" placeholder="Observaciones...">
            </div>
          </div>
          <div class="summary-card" v-if="newEquipo || newForm.codigo_abonado">
            <div class="summary-row">
              <span v-if="newEquipo"><strong>Equipo:</strong> {{ newEquipo.asset_code }} | {{ newEquipo.modelo }} | {{ newEquipo.serie_equipo || '-' }}</span>
              <span v-if="newForm.codigo_abonado"><strong>Abonado:</strong> {{ newForm.codigo_abonado }} | {{ newForm.nombre_abonado || '?' }}</span>
            </div>
          </div>
          <div v-if="error" class="alert-error">{{ error }}</div>
          <div v-if="success" class="alert-success">{{ success }}</div>
        </div>
        <div class="modal-footer-box">
          <button class="btn-secondary" @click="showNew = false">Cancelar</button>
          <button class="btn-primary" @click="saveNew" :disabled="saving || !newEquipo">
            {{ saving ? 'Guardando...' : 'Guardar Instalacion' }}
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
      items: [], total: 0, page: 1, limit: 15,
      search: '', filterTecnico: '', tecnicos: [],
      loading: false, debounceTimer: null,
      sortBy: 'fecha', sortDir: 'DESC',
      showDetail: false, detail: null, historial: [], loadingHistorial: false,
      showEdit: false, editForm: {}, editAbonado: null, saving: false, error: '', success: '',
      showNew: false, newForm: {}, newEquipo: null, newAbonado: null,
      timers: {}
    };
  },
  async mounted() {
    const t = await api.get('/instalaciones/tecnicos'); this.tecnicos = t.data;
    this.loadData();
  },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s },
    openNew() {
      this.newForm = { codigo_bien: '', codigo_abonado: '', nombre_abonado: '', fecha: new Date().toISOString().split('T')[0], tecnico: '', observacion: '' };
      this.newEquipo = null; this.newAbonado = null;
      this.error = ''; this.success = '';
      this.showNew = true;
    },
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
      const res = await api.get('/instalaciones', { params: { page: this.page, limit: this.limit, search: this.search, tecnico: this.filterTecnico, sortBy: this.sortBy, sortDir: this.sortDir } });
      this.items = res.data.data; this.total = res.data.total; this.loading = false;
    },
    async viewDetail(item) {
      this.detail = { ...item };
      this.historial = [];
      this.showDetail = true;
      this.loadingHistorial = true;
      try {
        const [histRes, eqRes, abRes] = await Promise.all([
          api.get('/instalaciones/historial/' + item.asset_code),
          api.get('/equipos/by-code/' + item.asset_code),
          item.abonado_code ? api.get('/abonados/by-code/' + item.abonado_code) : Promise.resolve({ data: { data: [] } })
        ]);
        this.historial = histRes.data;
        if (eqRes.data) Object.assign(this.detail, eqRes.data);
        if (abRes.data && abRes.data.data && abRes.data.data.length > 0) {
          const ab = abRes.data.data[0];
          this.detail.abonado_zone = ab.zone;
          this.detail.abonado_street = ab.street;
        }
      } catch(e) { this.historial = []; }
      this.loadingHistorial = false;
    },
    editItem(item) {
      this.editForm = {
        id: item.id,
        asset_code: item.asset_code,
        abonado_code: item.abonado_code || '',
        abonado_name: item.abonado_name || '',
        fecha: item.fecha || '',
        tecnico: item.tecnico || '',
        observacion: item.observacion || ''
      };
      this.editAbonado = null;
      this.error = ''; this.success = '';
      this.showEdit = true;
    },
    async deleteItem(item) {
      if (!confirm('Eliminar instalacion de ' + item.asset_code + '?')) return;
      try {
        await api.delete('/instalaciones/' + item.id);
        this.loadData();
      } catch (e) { alert(e.response?.data?.error || 'Error al eliminar'); }
    },
    buscarEquipoNew() {
      clearTimeout(this.timers.eqNew);
      this.newEquipo = null;
      if (!this.newForm.codigo_bien || this.newForm.codigo_bien.length < 5) return;
      this.timers.eqNew = setTimeout(async () => {
        try {
          const res = await api.get('/equipos', { params: { search: this.newForm.codigo_bien, limit: 1 } });
          this.newEquipo = res.data.data.find(e => e.asset_code === this.newForm.codigo_bien) || null;
        } catch(e) { this.newEquipo = null; }
      }, 300);
    },
    buscarAbonadoNew() {
      clearTimeout(this.timers.abNew);
      this.newAbonado = null;
      const name = this.newForm.nombre_abonado;
      if (!name || name.length < 3) return;
      this.timers.abNew = setTimeout(async () => {
        try {
          const res = await api.get('/abonados', { params: { search: name, limit: 10 } });
          this.newAbonado = res.data.data.find(a => a.name.toLowerCase() === name.toLowerCase()) || null;
        } catch(e) { this.newAbonado = null; }
      }, 300);
    },
    buscarAbonadoEdit() {
      clearTimeout(this.timers.abEdit);
      this.editAbonado = null;
      const name = this.editForm.abonado_name;
      if (!name || name.length < 3) return;
      this.timers.abEdit = setTimeout(async () => {
        try {
          const res = await api.get('/abonados', { params: { search: name, limit: 10 } });
          this.editAbonado = res.data.data.find(a => a.name.toLowerCase() === name.toLowerCase()) || null;
        } catch(e) { this.editAbonado = null; }
      }, 300);
    },
    async saveNew() {
      this.error = '';
      if (!this.newEquipo) { this.error = 'Codigo de bien no valido'; return; }
      if (!this.newForm.nombre_abonado) { this.error = 'Nombre de abonado requerido'; return; }
      if (!this.newForm.fecha) { this.error = 'Fecha requerida'; return; }
      if (!this.newForm.tecnico) { this.error = 'Tecnico requerido'; return; }
      this.saving = true;
      try {
        let abonadoId = this.newAbonado ? this.newAbonado.id : null;
        if (!abonadoId) {
          const abRes = await api.post('/abonados', {
            client_code: '',
            name: this.newForm.nombre_abonado,
            zone: '', street: ''
          });
          abonadoId = abRes.data.id;
        }
        await api.post('/instalaciones', {
          asset_code: this.newEquipo.asset_code,
          abonado_name: this.newForm.nombre_abonado,
          fecha: this.newForm.fecha,
          tecnico: this.newForm.tecnico,
          observacion: this.newForm.observacion
        });
        this.success = 'Instalacion guardada correctamente';
        setTimeout(() => { this.showNew = false; this.success = ''; this.loadData(); }, 1200);
      } catch (e) { this.error = e.response?.data?.error || 'Error al guardar'; }
      this.saving = false;
    },
    async saveEdit() {
      this.error = '';
      if (!this.editForm.fecha) { this.error = 'Fecha requerida'; return; }
      if (!this.editForm.tecnico) { this.error = 'Tecnico requerido'; return; }
      this.saving = true;
      try {
        let abonadoId = this.editAbonado ? this.editAbonado.id : null;
        if (!abonadoId && this.editForm.abonado_name) {
          const abRes = await api.post('/abonados', {
            client_code: '',
            name: this.editForm.abonado_name,
            zone: '', street: ''
          });
          abonadoId = abRes.data.id;
        }
        await api.put('/instalaciones/' + this.editForm.id, {
          abonado_name: this.editForm.abonado_name,
          fecha: this.editForm.fecha,
          tecnico: this.editForm.tecnico,
          observacion: this.editForm.observacion
        });
        this.success = 'Instalacion actualizada';
        setTimeout(() => { this.showEdit = false; this.success = ''; this.loadData(); }, 1200);
      } catch (e) { this.error = e.response?.data?.error || 'Error al guardar'; }
      this.saving = false;
    }
  }
};
</script>
<style scoped>
.instalaciones-container {
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

.asset-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--c-accent);
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.btn-icon-info, .btn-icon-edit, .btn-icon-delete {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon-info { color: var(--c-info); }
.btn-icon-info:hover { background: rgba(96,165,250,0.1); }
.btn-icon-edit { color: var(--c-warning); }
.btn-icon-edit:hover { background: rgba(251,191,36,0.1); }
.btn-icon-delete { color: var(--c-danger); }
.btn-icon-delete:hover { background: rgba(251,113,133,0.1); }

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
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

[data-theme="light"] .modal-content-box {
  box-shadow: 0 10px 40px rgba(0,0,0,0.12);
}

.modal-content-box.modal-xl {
  max-width: 1100px;
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

/* Detail Sections */
.detail-section {
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  padding: 20px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-accent);
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title small {
  font-weight: 400;
  color: var(--c-text-muted);
  font-size: 0.85rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.detail-full {
  grid-column: span 2;
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

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-installed {
  background: rgba(0, 166, 90, 0.15);
  color: var(--c-success);
}

[data-theme="light"] .status-installed {
  background: rgba(16,185,129,0.08);
  color: #059669;
}

.status-active {
  background: var(--c-accent);
  color: var(--c-bg);
}

/* History Table */
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

.history-table tbody tr.history-active {
  background: var(--c-accent-dim);
}

.history-table tbody tr:hover {
  background: var(--c-surface2);
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

.form-input[readonly] {
  background: var(--c-border);
  cursor: not-allowed;
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

.summary-card {
  background: var(--c-surface2);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  padding: 16px;
  margin-top: 16px;
}

.summary-row {
  display: flex;
  gap: 24px;
  font-size: 0.9rem;
  color: var(--c-text);
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
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-item.detail-full {
    grid-column: span 1;
  }
}
</style>
