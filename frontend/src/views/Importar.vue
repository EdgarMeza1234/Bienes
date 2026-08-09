<template>
  <div class="container-fluid py-3">
    <h4 class="mb-3">Importar Excel</h4>
    <div class="card">
      <div class="card-body">
        <div class="alert alert-info">
          <strong>Formato esperado:</strong> Archivo con 4 hojas: <code>equipo</code>, <code>abonado</code>, <code>instalcion</code>, <code>vale</code>.
        </div>
        <form @submit.prevent="uploadFile">
          <div class="mb-3">
            <label class="form-label">Seleccionar archivo Excel</label>
            <input type="file" class="form-control" accept=".xlsx,.xls" ref="fileInput" @change="onFileChange" />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="!selectedFile || uploading">
            {{ uploading ? 'Importando...' : 'Importar' }}
          </button>
        </form>
      </div>
    </div>
    <div v-if="result && !result.error" class="card mt-3">
      <div class="card-header fw-bold">Resultado</div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-3 mb-2" v-for="(data, key) in result.results" :key="key">
            <div class="card border-primary">
              <div class="card-body text-center">
                <h6 class="text-uppercase">{{ key }}</h6>
                <div class="d-flex justify-content-around">
                  <div><small class="text-success">Importados</small><h4>{{ data.imported }}</h4></div>
                  <div><small class="text-warning">Omitidos</small><h4>{{ data.skipped }}</h4></div>
                  <div><small class="text-danger">Errores</small><h4>{{ data.errors || 0 }}</h4></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="result?.error" class="alert alert-danger mt-3">{{ result.error }}</div>
  </div>
</template>
<script>
import api from '../services/api.js';
export default {
  data() { return { selectedFile: null, uploading: false, result: null }; },
  methods: {
    onFileChange(e) { this.selectedFile = e.target.files[0] || null; this.result = null; },
    async uploadFile() {
      if (!this.selectedFile) return;
      this.uploading = true; this.result = null;
      try {
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        const res = await api.post('/import/excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        this.result = res.data;
      } catch (e) { this.result = { error: e.response?.data?.error || e.response?.data?.message || 'Error al importar' }; }
      this.uploading = false;
    }
  }
};
</script>
