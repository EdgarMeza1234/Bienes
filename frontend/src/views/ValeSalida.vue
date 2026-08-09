<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Vale de Salida de Materiales</h4>
      <button class="btn btn-primary" @click="showForm = true; resetForm()">+ Nuevo Vale</button>
    </div>

    <!-- Lista de vales -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <input v-model="search" @input="loadVales" class="form-control mb-3" placeholder="Buscar por vale, solicitado, seccion, codigo...">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-dark">
              <tr>
                <th>N Vale</th><th>Solicitado por</th><th>Seccion</th><th>Destino</th><th>Fecha</th><th>Items</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vales" :key="v.vale_number">
                <td><span class="badge bg-primary fs-6">N {{ v.vale_number }}</span></td>
                <td>{{ v.solicitado }}</td>
                <td><small>{{ v.seccion }}</small></td>
                <td><small>{{ v.destino }}</small></td>
                <td>{{ $formatDate(v.fecha) }}</td>
                <td><span class="badge bg-secondary">{{ v.total_items }}</span></td>
                <td>
                  <button class="btn btn-outline-info btn-sm me-1" @click="viewVale(v.vale_number)">Ver</button>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteVale(v.vale_number)">Eliminar</button>
                </td>
              </tr>
              <tr v-if="vales.length === 0"><td colspan="7" class="text-center text-muted py-3">No hay vales</td></tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
          <small class="text-muted">Mostrando {{ vales.length }} de {{ total }} vales</small>
          <div>
            <button class="btn btn-outline-secondary btn-sm" :disabled="page<=1" @click="page--; loadVales()">Anterior</button>
            <button class="btn btn-outline-secondary btn-sm" :disabled="vales.length<limit" @click="page++; loadVales()">Siguiente</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo Vale -->
    <div class="modal d-block" tabindex="-1" v-if="showForm" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Nuevo Vale de Salida - N {{ nextNumber }}</h5>
            <button type="button" class="btn-close" @click="showForm = false"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3 mb-4">
              <div class="col-md-2">
                <label class="form-label small fw-bold">N Vale</label>
                <input v-model="form.vale_number" type="number" class="form-control" readonly>
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Solicitado por *</label>
                <input v-model="form.solicitado" class="form-control" placeholder="Nombre del solicitante">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Seccion / Cargo</label>
                <input v-model="form.seccion" class="form-control" placeholder="Ej: TECNICO INSTALADOR">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Destino</label>
                <input v-model="form.destino" class="form-control">
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-bold">Dia</label>
                <input v-model="form.dia" type="number" class="form-control" min="1" max="31">
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-bold">Mes</label>
                <input v-model="form.mes" type="number" class="form-control" min="1" max="12">
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-bold">Ano</label>
                <input v-model="form.anio" type="number" class="form-control">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Autorizado por</label>
                <input v-model="form.autorizado" class="form-control">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Recibi conforme</label>
                <input v-model="form.recibido" class="form-control">
              </div>
              <div class="col-md-12">
                <label class="form-label small fw-bold">Observaciones</label>
                <input v-model="form.observaciones" class="form-control" placeholder="Ej: cada uno con adaptador marca...">
              </div>
            </div>

            <!-- Seleccionar ONTs -->
            <h6 class="fw-bold">Seleccionar ONTs para el vale:</h6>
            <input v-model="searchOnt" @input="loadAvailable" class="form-control form-control-sm mb-2" placeholder="Buscar ONT disponible por codigo, serie, MAC...">
            <div class="table-responsive" style="max-height: 300px">
              <table class="table table-sm table-hover">
                <thead class="table-light sticky-top">
                  <tr><th></th><th>Codigo</th><th>Descripcion</th><th>Serie</th><th>MAC</th><th>Modelo</th></tr>
                </thead>
                <tbody>
                  <tr v-for="ont in availableOnt" :key="ont.id" :class="{ 'table-success': selectedOnts.find(s => s.asset_code === ont.asset_code) }">
                    <td>
                      <input type="checkbox" :value="ont" v-model="selectedOnts" class="form-check-input">
                    </td>
                    <td><code>{{ ont.asset_code }}</code></td>
                    <td><small>{{ truncate(ont.description, 40) }}</small></td>
                    <td><small class="text-muted">{{ ont.adapter_serial }}</small></td>
                    <td><small class="text-muted">{{ ont.mac_address }}</small></td>
                    <td><small>{{ ont.model_name }}</small></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mt-2">
              <span class="badge bg-success">{{ selectedOnts.length }} ONTs seleccionadas</span>
            </div>
            <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showForm = false">Cancelar</button>
            <button class="btn btn-primary" @click="saveVale" :disabled="saving">
              {{ saving ? 'Creando...' : 'Crear Vale' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detalle Vale -->
    <div class="modal d-block" tabindex="-1" v-if="valeDetail" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Vale N {{ valeDetail.vale_number }}</h5>
            <button type="button" class="btn-close" @click="valeDetail = null"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-4"><strong>Solicitado:</strong> {{ valeDetail.solicitado }}</div>
              <div class="col-4"><strong>Seccion:</strong> {{ valeDetail.seccion }}</div>
              <div class="col-4"><strong>Fecha:</strong> {{ $formatDate(valeDetail.fecha) }}</div>
            </div>
            <div class="row mb-3">
              <div class="col-6"><strong>Destino:</strong> {{ valeDetail.destino }}</div>
              <div class="col-3"><strong>Autorizado:</strong> {{ valeDetail.autorizado }}</div>
              <div class="col-3"><strong>Recibio:</strong> {{ valeDetail.recibido }}</div>
            </div>
            <div v-if="valeDetail.observaciones" class="mb-3"><strong>Observaciones:</strong> {{ valeDetail.observaciones }}</div>
            <table class="table table-bordered table-sm">
              <thead class="table-light"><tr><th>Cant</th><th>Unidad</th><th>Codigo Bien</th><th>Detalle</th></tr></thead>
              <tbody>
                <tr v-for="(item, i) in valeDetail.items" :key="i">
                  <td>{{ item.cantidad }}</td><td>{{ item.unidad }}</td>
                  <td><code>{{ item.codigo_bien }}</code></td>
                  <td><small>{{ item.detalle }}</small></td>
                </tr>
              </tbody>
            </table>
          </div>
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
      vales: [], total: 0, page: 1, limit: 20, search: '',
      showForm: false, nextNumber: 1, searchOnt: '',
      availableOnt: [], selectedOnts: [], saving: false, error: '',
      valeDetail: null,
      form: {
        vale_number: 1, solicitado: '', seccion: '', destino: 'PARA USUARIOS',
        dia: new Date().getDate(), mes: new Date().getMonth()+1, anio: new Date().getFullYear(),
        autorizado: '', recibido: '', observaciones: ''
      }
    }
  },
  async mounted() {
    this.loadVales()
    const res = await api.get('/vales/next-number')
    this.nextNumber = res.data.next
    this.form.vale_number = res.data.next
    this.loadAvailable()
  },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s },
    async loadVales() {
      const r = await api.get('/vales', { params: { page: this.page, limit: this.limit, search: this.search } })
      this.vales = r.data.data
      this.total = r.data.total
    },
    async loadAvailable() {
      const r = await api.get('/equipos', { params: { status: 'disponible', limit: 200, search: this.searchOnt } })
      this.availableOnt = r.data.data
    },
    resetForm() {
      this.form = {
        vale_number: this.nextNumber, solicitado: '', seccion: '', destino: 'PARA USUARIOS',
        dia: new Date().getDate(), mes: new Date().getMonth()+1, anio: new Date().getFullYear(),
        autorizado: '', recibido: '', observaciones: ''
      }
      this.selectedOnts = []; this.error = ''; this.searchOnt = ''
      this.loadAvailable()
    },
    async saveVale() {
      if (!this.form.solicitado) { this.error = 'Solicitado por es requerido'; return }
      if (this.selectedOnts.length === 0) { this.error = 'Seleccione al menos una ONT'; return }
      this.saving = true
      try {
        const ont_codes = this.selectedOnts.map(o => ({ asset_code: o.asset_code, description: o.description }))
        await api.post('/vales', { ...this.form, ont_codes })
        this.showForm = false
        this.loadVales()
      } catch (e) { this.error = e.response?.data?.error || 'Error al crear vale' }
      this.saving = false
    },
    async viewVale(number) {
      const r = await api.get(`/vales/${number}`)
      this.valeDetail = r.data
    },
    async deleteVale(number) {
      if (!confirm(`Eliminar vale N ${number}?`)) return
      await api.delete(`/vales/${number}`)
      this.loadVales()
    }
  }
}
</script>
