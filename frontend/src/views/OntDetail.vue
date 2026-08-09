<template>
  <div v-if="ont">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">👁️ Detalle ONT: {{ ont.asset_code }}</h4>
      <router-link to="/general" class="btn btn-outline-secondary btn-sm">← Volver</router-link>
    </div>
    <div class="row g-3">
      <div class="col-md-8">
        <div class="card shadow-sm">
          <div class="card-header fw-bold">Informacion de la ONT</div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-6"><strong>Codigo:</strong> <code>{{ ont.asset_code }}</code></div>
              <div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-primary">{{ ont.status }}</span></div>
              <div class="col-md-12"><strong>Descripcion:</strong> {{ ont.description }}</div>
              <div class="col-md-4"><strong>Responsable:</strong> {{ ont.responsible_name || '-' }}</div>
              <div class="col-md-4"><strong>Zona:</strong> {{ ont.zone_name || '-' }}</div>
              <div class="col-md-4"><strong>Direccion:</strong> {{ ont.street_address || '-' }}</div>
              <div class="col-md-4"><strong>Modelo:</strong> {{ ont.model_name || '-' }}</div>
              <div class="col-md-4"><strong>Marca:</strong> {{ ont.model_brand || '-' }}</div>
              <div class="col-md-4"><strong>FSAN:</strong> {{ ont.fsan || '-' }}</div>
              <div class="col-md-4"><strong>Serie:</strong> {{ ont.adapter_serial || '-' }}</div>
              <div class="col-md-4"><strong>MAC:</strong> {{ ont.mac_address || '-' }}</div>
              <div class="col-md-4"><strong>Nota AF:</strong> {{ ont.delivery_note || '-' }}</div>
              <div class="col-md-4"><strong>Tecnico:</strong> {{ ont.technician_name || '-' }}</div>
              <div class="col-md-4"><strong>Fecha Inst.:</strong> {{ ont.installation_date || '-' }}</div>
              <div class="col-md-12"><strong>Observacion:</strong> {{ ont.observation || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold">Cambiar Estado</div>
          <div class="card-body">
            <select v-model="newStatus" class="form-select mb-2">
              <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <button class="btn btn-primary btn-sm w-100" @click="changeStatus">Actualizar Estado</button>
          </div>
        </div>
        <div class="card shadow-sm mt-3">
          <div class="card-header fw-bold">Salida Materiales</div>
          <div class="card-body">
            <p><strong>Solicitado:</strong> {{ ont.requested_by || '-' }}</p>
            <p><strong>N Salida:</strong> {{ ont.exit_note || '-' }}</p>
            <p><strong>Fecha Salida:</strong> {{ ont.exit_date || '-' }}</p>
          </div>
        </div>
        <div class="card shadow-sm mt-3" v-if="ont.return_reason">
          <div class="card-header fw-bold">Devolucion</div>
          <div class="card-body">
            <p><strong>Motivo:</strong> {{ ont.return_reason }}</p>
            <p><strong>Fecha:</strong> {{ ont.return_date }}</p>
            <p><strong>STT:</strong> {{ ont.return_stt_note }}</p>
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
      ont: null, newStatus: '',
      statuses: [
        { value: 'disponible', label: 'Disponible' }, { value: 'despachada', label: 'Despachada' },
        { value: 'instalada', label: 'Instalada' }, { value: 'devuelta_cambio_plan', label: 'Devuelta Cambio Plan' },
        { value: 'devuelta_defecto', label: 'Devuelta Defecto' }, { value: 'devuelta_cambio_equipo', label: 'Devuelta Cambio Equipo' },
        { value: 'vendida', label: 'Vendida' }, { value: 'baja', label: 'Baja' }
      ]
    }
  },
  async mounted() {
    const res = await api.get(`/onts/${this.$route.params.id}`)
    this.ont = res.data
    this.newStatus = res.data.status
  },
  methods: {
    async changeStatus() {
      await api.patch(`/onts/${this.ont.id}/status`, { status: this.newStatus })
      this.ont.status = this.newStatus
    }
  }
}
</script>
