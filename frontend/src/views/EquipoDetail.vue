<template>
  <div v-if="equipo">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">{{ equipo.asset_code }}</h4>
      <router-link to="/equipos" class="btn btn-outline-secondary btn-sm">Volver</router-link>
    </div>
    <div class="row g-3">
      <div class="col-md-8">
        <div class="card shadow-sm mb-3">
          <div class="card-header fw-bold">Informacion del Equipo</div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-6"><strong>Codigo:</strong> <code>{{ equipo.asset_code }}</code></div>
              <div class="col-md-6"><strong>Estado:</strong> <span class="badge" :class="statusClass(equipo.status)">{{ equipo.status }}</span></div>
              <div class="col-md-12"><strong>Descripcion:</strong> {{ equipo.description }}</div>
              <div class="col-md-4"><strong>Modelo:</strong> {{ equipo.modelo || '-' }}</div>
              <div class="col-md-4"><strong>Serie Adaptador:</strong> {{ equipo.adapter_serial || '-' }}</div>
              <div class="col-md-4"><strong>MAC:</strong> {{ equipo.mac_address || '-' }}</div>
              <div class="col-md-4"><strong>Serie Equipo:</strong> {{ equipo.serie_equipo || '-' }}</div>
              <div class="col-md-4"><strong>Color:</strong> {{ equipo.color || '-' }}</div>
              <div class="col-md-4"><strong>FSAN:</strong> {{ equipo.fsan || '-' }}</div>
              <div class="col-md-4"><strong>Nota AF:</strong> {{ equipo.delivery_note_af || '-' }}</div>
              <div class="col-md-12"><strong>Observacion:</strong> {{ equipo.observation || '-' }}</div>
              <div class="col-md-12" v-if="equipo.return_stt_note"><strong>Devolucion STT:</strong> {{ equipo.return_stt_note }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold">Cambiar Estado</div>
          <div class="card-body">
            <select v-model="newStatus" class="form-select mb-2">
              <option value="en_bines">En Bines</option>
              <option value="despachada">Despachada</option>
              <option value="instalada">Instalada</option>
              <option value="devuelta">Devuelta</option>
              <option value="en_bines_mal_estado">Mal Estado</option>
            </select>
            <button class="btn btn-primary btn-sm w-100" @click="changeStatus">Actualizar</button>
          </div>
        </div>
      </div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header fw-bold">Instalaciones ({{ instalaciones.length }})</div>
          <div class="card-body p-0">
            <table class="table table-sm table-striped mb-0"><thead><tr><th>Abonado</th><th>Fecha</th><th>Tecnico</th></tr></thead>
              <tbody><tr v-for="i in instalaciones" :key="i.id"><td>{{ i.abonado_name || '-' }}</td><td>{{ $formatDate(i.fecha) }}</td><td>{{ i.tecnico }}</td></tr>
                <tr v-if="instalaciones.length === 0"><td colspan="3" class="text-center text-muted">Sin instalaciones</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header fw-bold">Vales de Salida ({{ vales.length }})</div>
          <div class="card-body p-0">
            <table class="table table-sm table-striped mb-0"><thead><tr><th>Solicitado</th><th>Salida</th><th>Fecha</th></tr></thead>
              <tbody><tr v-for="v in vales" :key="v.id"><td>{{ v.solicitado }}</td><td>{{ v.salida_materiales }}</td><td>{{ $formatDate(v.fecha) }}</td></tr>
                <tr v-if="vales.length === 0"><td colspan="3" class="text-center text-muted">Sin vales</td></tr></tbody>
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
  data() { return { equipo: null, newStatus: '', instalaciones: [], vales: [] } },
  async mounted() {
    const r = await api.get(`/equipos/${this.$route.params.id}`);
    this.equipo = r.data; this.newStatus = r.data.status;
    const [inst, vl] = await Promise.all([
      api.get('/instalaciones', { params: { search: this.equipo.asset_code, limit: 100 } }),
      api.get('/vales', { params: { search: this.equipo.asset_code, limit: 100 } })
    ]);
    this.instalaciones = inst.data.data.filter(i => i.asset_code === this.equipo.asset_code);
    this.vales = vl.data.data.filter(v => v.asset_code === this.equipo.asset_code);
  },
  methods: {
    statusClass(s) {
      const map = { en_bines: 'bg-success', despachada: 'bg-warning text-dark', instalada: 'bg-info text-dark', devuelta: 'bg-primary', en_bines_mal_estado: 'bg-danger' };
      return map[s] || 'bg-secondary'
    },
    async changeStatus() {
      await api.patch(`/equipos/${this.equipo.id}/status`, { status: this.newStatus });
      this.equipo.status = this.newStatus;
    }
  }
}
</script>
