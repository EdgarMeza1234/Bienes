<template>
  <div class="container-fluid py-3">
    <h4 class="mb-4 fw-bold">Catalogos</h4>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'models' }" @click="tab = 'models'">Modelos</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'zones' }" @click="tab = 'zones'">Zonas</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'technicians' }" @click="tab = 'technicians'">Tecnicos</button>
      </li>
    </ul>

    <!-- MODELOS -->
    <div v-if="tab === 'models'">
      <div class="d-flex justify-content-between mb-3">
        <h5>Modelos de ONT</h5>
        <button class="btn btn-primary btn-sm" @click="openModelModal()">+ Nuevo Modelo</button>
      </div>
      <div class="card">
        <div class="card-body table-responsive">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr><th>ID</th><th>Nombre</th><th>Marca</th><th>Color</th><th>Tipo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in models" :key="m.id">
                <td>{{ m.id }}</td>
                <td>{{ m.name }}</td>
                <td>{{ m.brand }}</td>
                <td>{{ m.color }}</td>
                <td>{{ m.type }}</td>
                <td>
                  <button class="btn btn-outline-primary btn-sm me-1" @click="openModelModal(m)">Editar</button>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteModel(m.id)">Eliminar</button>
                </td>
              </tr>
              <tr v-if="models.length === 0"><td colspan="6" class="text-center text-muted">No hay modelos</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ZONAS -->
    <div v-if="tab === 'zones'">
      <div class="d-flex justify-content-between mb-3">
        <h5>Zonas</h5>
        <button class="btn btn-primary btn-sm" @click="openZoneModal()">+ Nueva Zona</button>
      </div>
      <div class="card">
        <div class="card-body table-responsive">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="z in zones" :key="z.id">
                <td>{{ z.id }}</td>
                <td>{{ z.name }}</td>
                <td>
                  <button class="btn btn-outline-primary btn-sm me-1" @click="openZoneModal(z)">Editar</button>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteZone(z.id)">Eliminar</button>
                </td>
              </tr>
              <tr v-if="zones.length === 0"><td colspan="3" class="text-center text-muted">No hay zonas</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TECNICOS -->
    <div v-if="tab === 'technicians'">
      <div class="d-flex justify-content-between mb-3">
        <h5>Tecnicos</h5>
        <button class="btn btn-primary btn-sm" @click="openTechModal()">+ Nuevo Tecnico</button>
      </div>
      <div class="card">
        <div class="card-body table-responsive">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr><th>ID</th><th>Nombre</th><th>Codigo</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="t in technicians" :key="t.id">
                <td>{{ t.id }}</td>
                <td>{{ t.name }}</td>
                <td>{{ t.code || '-' }}</td>
                <td><span class="badge" :class="t.active ? 'bg-success' : 'bg-secondary'">{{ t.active ? 'Si' : 'No' }}</span></td>
                <td>
                  <button class="btn btn-outline-primary btn-sm me-1" @click="openTechModal(t)">Editar</button>
                  <button v-if="t.active" class="btn btn-outline-danger btn-sm" @click="deleteTech(t.id)">Desactivar</button>
                </td>
              </tr>
              <tr v-if="technicians.length === 0"><td colspan="5" class="text-center text-muted">No hay tecnicos</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Model -->
    <div class="modal d-block" tabindex="-1" v-if="showModelModal" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingModel ? 'Editar' : 'Nuevo' }} Modelo</h5>
            <button type="button" class="btn-close" @click="showModelModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre *</label>
              <input v-model="modelForm.name" class="form-control">
            </div>
            <div class="row">
              <div class="col-md-4">
                <label class="form-label">Marca</label>
                <input v-model="modelForm.brand" class="form-control">
              </div>
              <div class="col-md-4">
                <label class="form-label">Color</label>
                <input v-model="modelForm.color" class="form-control">
              </div>
              <div class="col-md-4">
                <label class="form-label">Tipo</label>
                <input v-model="modelForm.type" class="form-control">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showModelModal = false">Cancelar</button>
            <button class="btn btn-primary" @click="saveModel">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Zone -->
    <div class="modal d-block" tabindex="-1" v-if="showZoneModal" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingZone ? 'Editar' : 'Nueva' }} Zona</h5>
            <button type="button" class="btn-close" @click="showZoneModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre *</label>
              <input v-model="zoneForm.name" class="form-control">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showZoneModal = false">Cancelar</button>
            <button class="btn btn-primary" @click="saveZone">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Tech -->
    <div class="modal d-block" tabindex="-1" v-if="showTechModal" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingTech ? 'Editar' : 'Nuevo' }} Tecnico</h5>
            <button type="button" class="btn-close" @click="showTechModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre *</label>
              <input v-model="techForm.name" class="form-control">
            </div>
            <div class="mb-3">
              <label class="form-label">Codigo</label>
              <input v-model="techForm.code" class="form-control">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showTechModal = false">Cancelar</button>
            <button class="btn btn-primary" @click="saveTech">Guardar</button>
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
      tab: 'models',
      models: [], zones: [], technicians: [],
      showModelModal: false, showZoneModal: false, showTechModal: false,
      editingModel: null, editingZone: null, editingTech: null,
      modelForm: { name: '', brand: '', color: '', type: '' },
      zoneForm: { name: '' },
      techForm: { name: '', code: '' }
    };
  },
  async mounted() {
    this.loadAll();
  },
  methods: {
    async loadAll() {
      const [m, z, t] = await Promise.all([
        api.get('/catalogos/models'),
        api.get('/catalogos/zones'),
        api.get('/catalogos/technicians')
      ]);
      this.models = m.data;
      this.zones = z.data;
      this.technicians = t.data;
    },
    openModelModal(model = null) {
      this.editingModel = model;
      this.modelForm = model ? { ...model } : { name: '', brand: '', color: '', type: '' };
      this.showModelModal = true;
    },
    async saveModel() {
      if (!this.modelForm.name) return;
      if (this.editingModel) {
        await api.put(`/catalogos/models/${this.editingModel.id}`, this.modelForm);
      } else {
        await api.post('/catalogos/models', this.modelForm);
      }
      this.showModelModal = false;
      this.loadAll();
    },
    async deleteModel(id) {
      if (!confirm('Eliminar este modelo?')) return;
      await api.delete(`/catalogos/models/${id}`);
      this.loadAll();
    },
    openZoneModal(zone = null) {
      this.editingZone = zone;
      this.zoneForm = zone ? { name: zone.name } : { name: '' };
      this.showZoneModal = true;
    },
    async saveZone() {
      if (!this.zoneForm.name) return;
      if (this.editingZone) {
        await api.put(`/catalogos/zones/${this.editingZone.id}`, this.zoneForm);
      } else {
        await api.post('/catalogos/zones', this.zoneForm);
      }
      this.showZoneModal = false;
      this.loadAll();
    },
    async deleteZone(id) {
      if (!confirm('Eliminar esta zona?')) return;
      await api.delete(`/catalogos/zones/${id}`);
      this.loadAll();
    },
    openTechModal(tech = null) {
      this.editingTech = tech;
      this.techForm = tech ? { name: tech.name, code: tech.code || '' } : { name: '', code: '' };
      this.showTechModal = true;
    },
    async saveTech() {
      if (!this.techForm.name) return;
      if (this.editingTech) {
        await api.put(`/catalogos/technicians/${this.editingTech.id}`, this.techForm);
      } else {
        await api.post('/catalogos/technicians', this.techForm);
      }
      this.showTechModal = false;
      this.loadAll();
    },
    async deleteTech(id) {
      if (!confirm('Desactivar este tecnico?')) return;
      await api.delete(`/catalogos/technicians/${id}`);
      this.loadAll();
    }
  }
};
</script>
