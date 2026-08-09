<template>
  <div class="container-fluid py-3">
    <h4 class="mb-3">Deudores</h4>

    <div class="row mb-3" v-if="summary.length">
      <div class="col-md-3 col-sm-6 mb-2" v-for="s in summary" :key="s.technician_id">
        <div class="card border-warning">
          <div class="card-body text-center">
            <h6 class="card-title text-muted">{{ s.technician_name }}</h6>
            <h3 class="text-warning">{{ s.pending_count }}</h3>
            <small class="text-muted">pendiente(s)</small>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr><th>Codigo</th><th>Descripcion</th><th>Modelo</th><th>Tecnico</th><th>Nota</th><th>Fecha</th><th>Estado</th><th>Accion</th></tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="text-center">Cargando...</td></tr>
            <tr v-else-if="items.length === 0"><td colspan="8" class="text-center text-muted">No hay deudores</td></tr>
            <tr v-for="d in items" :key="d.id">
              <td><code>{{ d.asset_code }}</code></td>
              <td><small>{{ truncate(d.description, 35) }}</small></td>
              <td>{{ d.model_text }}</td>
              <td>{{ d.technician_name }}</td>
              <td>{{ d.instruction_note }}</td>
              <td>{{ formatDate(d.instruction_date) }}</td>
              <td><span class="badge" :class="d.status === 'pendiente' ? 'bg-warning text-dark' : 'bg-success'">{{ d.status }}</span></td>
              <td>
                <button v-if="d.status === 'pendiente'" class="btn btn-sm btn-outline-success" @click="openDischarge(d)">Descargar</button>
                <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal d-block" tabindex="-1" v-if="selectedDebtor" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Descargar Deudor</h5><button type="button" class="btn-close" @click="selectedDebtor = null"></button></div>
          <div class="modal-body">
            <p>Descargar ONT <strong>{{ selectedDebtor?.asset_code }}</strong></p>
            <div class="mb-3"><label class="form-label">Nota</label><textarea class="form-control" rows="2" v-model="dischargeForm.discharge_note"></textarea></div>
            <div class="mb-3"><label class="form-label">Fecha</label><input type="date" class="form-control" v-model="dischargeForm.discharge_date" /></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="selectedDebtor = null">Cancelar</button>
            <button class="btn btn-success" :disabled="submitting" @click="submitDischarge">Descargar</button>
          </div>
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
      items: [], summary: [], loading: false, submitting: false,
      selectedDebtor: null, dischargeForm: { discharge_note: '', discharge_date: '' }
    };
  },
  mounted() { this.loadData(); },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s; },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-PE') : ''; },
    async loadData() {
      this.loading = true;
      const res = await api.get('/deudores');
      this.items = res.data.data || []; this.summary = res.data.summary || []; this.loading = false;
    },
    openDischarge(d) {
      this.selectedDebtor = d;
      this.dischargeForm = { discharge_note: '', discharge_date: new Date().toISOString().split('T')[0] };
    },
    async submitDischarge() {
      this.submitting = true;
      await api.post(`/deudores/${this.selectedDebtor.id}/discharge`, this.dischargeForm);
      this.selectedDebtor = null; this.loadData(); this.submitting = false;
    }
  }
};
</script>
