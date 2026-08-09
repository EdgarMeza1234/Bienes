<template>
  <div class="container-fluid py-3">
    <h4 class="mb-3">Kardex de Movimientos</h4>

    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label">Tecnico</label>
            <select class="form-select" v-model="filters.technician_id">
              <option value="">Todos</option>
              <option v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Modelo</label>
            <select class="form-select" v-model="filters.model_id">
              <option value="">Todos</option>
              <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="col-md-2"><label class="form-label">Desde</label><input type="date" class="form-control" v-model="filters.date_from" /></div>
          <div class="col-md-2"><label class="form-label">Hasta</label><input type="date" class="form-control" v-model="filters.date_to" /></div>
          <div class="col-md-1"><button class="btn btn-primary" @click="loadData(1)">Filtrar</button></div>
          <div class="col-md-2"><button class="btn btn-outline-secondary" @click="resetFilters">Limpiar</button></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr><th>Fecha</th><th>Tipo</th><th>Codigo</th><th>Modelo</th><th>Tecnico</th><th class="text-end">Entrada</th><th class="text-end">Salida</th><th class="text-end">Saldo</th><th>Notas</th></tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="9" class="text-center">Cargando...</td></tr>
            <tr v-else-if="items.length === 0"><td colspan="9" class="text-center text-muted">No hay movimientos</td></tr>
            <tr v-for="m in items" :key="m.id">
              <td>{{ formatDate(m.date) }}</td>
              <td><span :class="movementBadge(m.movement_type)">{{ m.movement_type }}</span></td>
              <td>{{ m.asset_code }}</td>
              <td>{{ m.model_name }}</td>
              <td>{{ m.technician_name }}</td>
              <td class="text-end">{{ m.quantity_in ?? 0 }}</td>
              <td class="text-end">{{ m.quantity_out ?? 0 }}</td>
              <td class="text-end fw-bold">{{ m.balance ?? 0 }}</td>
              <td>{{ m.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mt-3" v-if="total > limit">
      <span class="text-muted">Mostrando {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} de {{ total }}</span>
      <div>
        <button class="btn btn-sm btn-outline-primary" :disabled="page <= 1" @click="loadData(page - 1)">&laquo; Ant</button>
        <span class="mx-2">{{ page }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-outline-primary" :disabled="page >= totalPages" @click="loadData(page + 1)">Sig &raquo;</button>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api.js';
export default {
  data() {
    return {
      items: [], technicians: [], models: [],
      filters: { technician_id: '', model_id: '', date_from: '', date_to: '' },
      page: 1, limit: 15, total: 0, loading: false
    };
  },
  computed: { totalPages() { return Math.ceil(this.total / this.limit); } },
  mounted() { this.loadFilters(); this.loadData(1); },
  methods: {
    async loadFilters() {
      const [techRes, modelRes] = await Promise.all([api.get('/catalogos/technicians'), api.get('/catalogos/models')]);
      this.technicians = techRes.data; this.models = modelRes.data;
    },
    async loadData(p = 1) {
      this.loading = true; this.page = p;
      const params = { page: this.page, limit: this.limit };
      if (this.filters.technician_id) params.technician_id = this.filters.technician_id;
      if (this.filters.model_id) params.model_id = this.filters.model_id;
      if (this.filters.date_from) params.date_from = this.filters.date_from;
      if (this.filters.date_to) params.date_to = this.filters.date_to;
      const res = await api.get('/kardex', { params });
      this.items = res.data.data || []; this.total = res.data.total || 0; this.loading = false;
    },
    resetFilters() { this.filters = { technician_id: '', model_id: '', date_from: '', date_to: '' }; this.loadData(1); },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-PE') : ''; },
    movementBadge(type) {
      const map = { ingreso: 'badge bg-success', salida: 'badge bg-danger', devolucion: 'badge bg-warning text-dark', instalacion: 'badge bg-info text-dark', baja: 'badge bg-dark' };
      return map[type] || 'badge bg-secondary';
    }
  }
};
</script>
