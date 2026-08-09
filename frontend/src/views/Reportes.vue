<template>
  <div class="container-fluid py-3">
    <h4 class="mb-3">Reportes</h4>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'stock' }" @click="switchTab('stock')">Stock</button></li>
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'kardex-tecnico' }" @click="switchTab('kardex-tecnico')">Kardex por Tecnico</button></li>
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'devoluciones' }" @click="switchTab('devoluciones')">Devoluciones</button></li>
    </ul>

    <div v-if="loadingTab" class="text-center py-4"><div class="spinner-border text-primary"></div></div>

    <!-- Stock -->
    <div v-if="tab === 'stock' && !loadingTab">
      <div class="row mb-3">
        <div class="col-md-3 col-sm-6 mb-2"><div class="card bg-primary text-white"><div class="card-body text-center"><small>Total</small><h3>{{ stock.summary?.total }}</h3></div></div></div>
        <div class="col-md-3 col-sm-6 mb-2"><div class="card bg-success text-white"><div class="card-body text-center"><small>Disponibles</small><h3>{{ stock.summary?.disponible }}</h3></div></div></div>
        <div class="col-md-3 col-sm-6 mb-2"><div class="card bg-warning text-dark"><div class="card-body text-center"><small>Despachadas</small><h3>{{ stock.summary?.despachada }}</h3></div></div></div>
        <div class="col-md-3 col-sm-6 mb-2"><div class="card bg-info text-dark"><div class="card-body text-center"><small>Instaladas</small><h3>{{ stock.summary?.instalada }}</h3></div></div></div>
      </div>
      <div class="card mb-3" v-if="stock.byStatus?.length">
        <div class="card-header fw-bold">Por Estado</div>
        <div class="card-body table-responsive">
          <table class="table table-sm table-striped"><thead class="table-dark"><tr><th>Estado</th><th class="text-end">Cantidad</th></tr></thead>
            <tbody><tr v-for="s in stock.byStatus" :key="s.status"><td>{{ s.status }}</td><td class="text-end">{{ s.count }}</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="card mb-3" v-if="stock.byModel?.length">
        <div class="card-header fw-bold">Por Modelo</div>
        <div class="card-body table-responsive">
          <table class="table table-sm table-striped"><thead class="table-dark"><tr><th>Modelo</th><th class="text-end">Cantidad</th></tr></thead>
            <tbody><tr v-for="m in stock.byModel" :key="m.model_name"><td>{{ m.model_name }}</td><td class="text-end">{{ m.count }}</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="card mb-3" v-if="stock.byZone?.length">
        <div class="card-header fw-bold">Por Zona</div>
        <div class="card-body table-responsive">
          <table class="table table-sm table-striped"><thead class="table-dark"><tr><th>Zona</th><th class="text-end">Cantidad</th></tr></thead>
            <tbody><tr v-for="z in stock.byZone" :key="z.zone_name"><td>{{ z.zone_name }}</td><td class="text-end">{{ z.count }}</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Kardex por Tecnico -->
    <div v-if="tab === 'kardex-tecnico' && !loadingTab">
      <div class="card">
        <div class="card-body table-responsive">
          <table class="table table-striped table-hover">
            <thead class="table-dark"><tr><th>Tecnico</th><th class="text-end">Despachadas</th><th class="text-end">Instaladas</th><th class="text-end">Pendientes</th><th class="text-end">Devueltas</th></tr></thead>
            <tbody>
              <tr v-if="kardexTecnico.length === 0"><td colspan="5" class="text-center text-muted">No hay datos</td></tr>
              <tr v-for="row in kardexTecnico" :key="row.id">
                <td>{{ row.name }}</td><td class="text-end">{{ row.despachadas }}</td><td class="text-end">{{ row.instaladas }}</td><td class="text-end">{{ row.pendientes }}</td><td class="text-end">{{ row.devueltas }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Devoluciones -->
    <div v-if="tab === 'devoluciones' && !loadingTab">
      <div class="card">
        <div class="card-header fw-bold">Devoluciones por Tipo</div>
        <div class="card-body table-responsive">
          <table class="table table-sm table-striped">
            <thead class="table-dark"><tr><th>Tipo</th><th class="text-end">Cantidad</th></tr></thead>
            <tbody>
              <tr v-if="!devoluciones.byType?.length"><td colspan="2" class="text-center text-muted">No hay datos</td></tr>
              <tr v-for="d in devoluciones.byType" :key="d.return_type"><td>{{ d.return_type }}</td><td class="text-end">{{ d.count }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api.js';
export default {
  data() { return { activeTab: 'stock', loadingTab: false, stock: {}, kardexTecnico: [], devoluciones: [], loaded: {} }; },
  mounted() { this.switchTab('stock'); },
  methods: {
    async switchTab(tab) {
      this.activeTab = tab;
      if (this.loaded[tab]) return;
      this.loadingTab = true;
      try {
        if (tab === 'stock') { const r = await api.get('/reportes/stock'); this.stock = r.data; }
        else if (tab === 'kardex-tecnico') { const r = await api.get('/reportes/kardex-tecnico'); this.kardexTecnico = r.data; }
        else if (tab === 'devoluciones') { const r = await api.get('/reportes/devoluciones'); this.devoluciones = r.data; }
        this.loaded[tab] = true;
      } catch (e) { console.error(e); }
      this.loadingTab = false;
    }
  }
};
</script>
