<template>
  <div class="container-fluid py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4>ONTs en Mal Estado</h4>
      <button class="btn btn-primary" @click="openModal">Registrar Mal Estado</button>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label">Buscar</label>
            <input type="text" class="form-control" v-model="search" @input="loadData" placeholder="Codigo, descripcion, MAC..." />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>Codigo Bien</th>
              <th>Descripcion</th>
              <th>Modelo</th>
              <th>Serie</th>
              <th>MAC</th>
              <th>Observacion</th>
              <th>Fecha</th>
              <th>Entregado por</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="text-center">Cargando...</td></tr>
            <tr v-else-if="items.length === 0"><td colspan="8" class="text-center text-muted">No hay ONTs en mal estado</td></tr>
            <tr v-for="r in items" :key="r.id">
              <td><code>{{ r.asset_code }}</code></td>
              <td><small>{{ truncate(r.description, 40) }}</small></td>
              <td>{{ r.model_name }}</td>
              <td><small class="text-muted">{{ r.adapter_serial }}</small></td>
              <td><small class="text-muted">{{ r.mac_address }}</small></td>
              <td>{{ r.observation }}</td>
              <td>{{ formatDate(r.delivery_date) }}</td>
              <td>{{ r.delivered_by }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mt-3" v-if="total > limit">
      <span class="text-muted">Mostrando {{ items.length }} de {{ total }}</span>
      <div>
        <button class="btn btn-sm btn-outline-primary" :disabled="page <= 1" @click="page--; loadData()">&laquo; Ant</button>
        <span class="mx-2">{{ page }}</span>
        <button class="btn btn-sm btn-outline-primary" :disabled="items.length < limit" @click="page++; loadData()">Sig &raquo;</button>
      </div>
    </div>

    <div class="modal d-block" tabindex="-1" v-if="showForm" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Registrar Mal Estado</h5>
            <button type="button" class="btn-close" @click="showForm = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="mb-3">
              <label class="form-label">Codigo ONT *</label>
              <input type="text" class="form-control" v-model="form.asset_code" placeholder="CTP-..." @blur="lookupOnt">
            </div>
            <div class="mb-3" v-if="foundOnt">
              <div class="alert alert-info">
                <strong>{{ foundOnt.asset_code }}</strong> - {{ foundOnt.description }}<br>
                <small>Modelo: {{ foundOnt.model_name || '-' }} | MAC: {{ foundOnt.mac_address }}</small>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Observacion</label>
              <textarea class="form-control" rows="3" v-model="form.observation"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-control" v-model="form.delivery_date" />
            </div>
            <div class="mb-3">
              <label class="form-label">Entregado por</label>
              <input type="text" class="form-control" v-model="form.delivered_by" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showForm = false">Cancelar</button>
            <button class="btn btn-danger" :disabled="submitting" @click="submit">
              {{ submitting ? 'Guardando...' : 'Registrar' }}
            </button>
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
      items: [], total: 0, page: 1, limit: 15, search: '', loading: false,
      showForm: false, submitting: false, error: '', foundOnt: null,
      form: { asset_code: '', observation: '', delivery_date: '', delivered_by: '' }
    };
  },
  mounted() { this.loadData(); },
  methods: {
    truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s; },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-PE') : ''; },
    async loadData() {
      this.loading = true;
      try {
        const res = await api.get('/mal-estado', { params: { page: this.page, limit: this.limit, search: this.search } });
        this.items = res.data.data;
        this.total = res.data.total;
      } catch (e) { console.error(e); }
      this.loading = false;
    },
    async lookupOnt() {
      if (!this.form.asset_code) { this.foundOnt = null; return; }
      try {
        const res = await api.get('/equipos', { params: { search: this.form.asset_code, limit: 1 } });
        this.foundOnt = res.data.data?.[0] || null;
      } catch (e) { this.foundOnt = null; }
    },
    openModal() {
      this.form = { asset_code: '', observation: '', delivery_date: new Date().toISOString().split('T')[0], delivered_by: '' };
      this.foundOnt = null;
      this.error = '';
      this.showForm = true;
    },
    async submit() {
      if (!this.form.asset_code) { this.error = 'Codigo requerido'; return; }
      this.submitting = true;
      this.error = '';
      try {
        const res = await api.get('/equipos', { params: { search: this.form.asset_code, limit: 1 } });
        const ont = res.data.data?.[0];
        if (!ont) { this.error = 'ONT no encontrada'; this.submitting = false; return; }
        await api.post('/mal-estado', { equipo_id: ont.id, ...this.form });
        this.showForm = false;
        this.loadData();
      } catch (e) { this.error = e.response?.data?.error || 'Error al registrar'; }
      this.submitting = false;
    }
  }
};
</script>
