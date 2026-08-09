<template>
  <div class="dash">
    <div class="dash-header">
      <div>
        <h4 class="dash-title">Panel de Control</h4>
        <small class="dash-subtitle">Sistema de Gestion de ONTs</small>
      </div>
      <div class="dash-date">{{ now }}</div>
    </div>

    <!-- KPI ROW -->
    <div class="dash-kpi-row">
      <div class="dash-kpi" v-for="kpi in kpis" :key="kpi.label">
        <div class="dash-kpi-left">
          <div class="dash-kpi-icon" :style="{background: kpi.bg, color: kpi.color}" v-html="kpi.icon"></div>
        </div>
        <div class="dash-kpi-data">
          <span class="dash-kpi-value">{{ kpi.value }}</span>
          <span class="dash-kpi-label">{{ kpi.label }}</span>
        </div>
      </div>
    </div>

    <div class="dash-kpi-row-secondary">
      <div class="dash-kpi-sm" v-for="kpi in kpisSecondary" :key="kpi.label">
        <span class="dash-kpi-sm-value">{{ kpi.value }}</span>
        <span class="dash-kpi-sm-label">{{ kpi.label }}</span>
      </div>
    </div>

    <!-- GRID -->
    <div class="dash-grid">
      <!-- POR MODELO -->
      <div class="dash-card">
        <div class="dash-card-header">
          <span class="dash-card-title">Por Modelo</span>
          <span class="dash-card-badge">Top 10</span>
        </div>
        <div class="dash-card-body">
          <div v-if="stats.byModelo?.length" class="dash-bars">
            <div class="dash-bar-row" v-for="m in stats.byModelo" :key="m.modelo">
              <div class="dash-bar-label">{{ m.modelo }}</div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill" :style="{width: barWidth(m.count, maxModelo) + '%'}"></div>
              </div>
              <div class="dash-bar-value">{{ m.count }}</div>
            </div>
          </div>
          <div v-else class="dash-empty">Sin datos</div>
        </div>
      </div>

      <!-- POR ESTADO -->
      <div class="dash-card">
        <div class="dash-card-header">
          <span class="dash-card-title">Por Estado</span>
        </div>
        <div class="dash-card-body">
          <div class="dash-status-list">
            <div class="dash-status-item" v-for="s in stats.byStatus" :key="s.status">
              <div class="dash-status-dot" :style="{background: statusColor(s.status)}"></div>
              <div class="dash-status-info">
                <div class="dash-status-name">{{ statusLabel(s.status) }}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" :style="{width: barWidth(s.count, stats.total) + '%', background: statusColor(s.status)}"></div>
                </div>
              </div>
              <div class="dash-status-count">{{ s.count }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TECNICOS -->
      <div class="dash-card">
        <div class="dash-card-header">
          <span class="dash-card-title">Tecnicos</span>
        </div>
        <div class="dash-card-body">
          <div v-if="stats.tecnicos?.length" class="dash-bars">
            <div class="dash-bar-row" v-for="t in stats.tecnicos" :key="t.tecnico">
              <div class="dash-bar-label">{{ t.tecnico }}</div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill dash-bar-fill-accent" :style="{width: barWidth(t.count, maxTecnico) + '%'}"></div>
              </div>
              <div class="dash-bar-value">{{ t.count }}</div>
            </div>
          </div>
          <div v-else class="dash-empty">Sin datos</div>
        </div>
      </div>

      <!-- POR ZONA -->
      <div class="dash-card">
        <div class="dash-card-header">
          <span class="dash-card-title">Por Zona</span>
        </div>
        <div class="dash-card-body">
          <div v-if="stats.byZona?.length" class="dash-bars">
            <div class="dash-bar-row" v-for="z in stats.byZona" :key="z.zone">
              <div class="dash-bar-label">{{ z.zone }}</div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill dash-bar-fill-green" :style="{width: barWidth(z.count, maxZona) + '%'}"></div>
              </div>
              <div class="dash-bar-value">{{ z.count }}</div>
            </div>
          </div>
          <div v-else class="dash-empty">Sin datos</div>
        </div>
      </div>

      <!-- ULTIMAS INSTALACIONES -->
      <div class="dash-card dash-card-wide">
        <div class="dash-card-header">
          <span class="dash-card-title">Ultimas Instalaciones</span>
        </div>
        <div class="dash-card-body p-0">
          <table class="dash-table">
            <thead>
              <tr><th>Codigo Bien</th><th>Abonado</th><th>Fecha</th><th>Tecnico</th></tr>
            </thead>
            <tbody>
              <tr v-for="i in stats.recentInstalaciones" :key="i.id">
                <td><span class="dash-code">{{ i.asset_code }}</span></td>
                <td>{{ i.abonado_name || '-' }}</td>
                <td><span class="dash-date-tag">{{ $formatDate(i.fecha) }}</span></td>
                <td>{{ i.tecnico || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ULTIMOS VALES -->
      <div class="dash-card dash-card-wide">
        <div class="dash-card-header">
          <span class="dash-card-title">Ultimos Vales</span>
        </div>
        <div class="dash-card-body p-0">
          <table class="dash-table">
            <thead>
              <tr><th>Codigo</th><th>Modelo</th><th>Solicitado</th><th>Salida</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              <tr v-for="v in stats.valesRecientes" :key="v.id">
                <td><span class="dash-code">{{ v.asset_code }}</span></td>
                <td><small class="dash-muted">{{ v.modelo }}</small></td>
                <td>{{ v.solicitado }}</td>
                <td>{{ v.salida_materiales }}</td>
                <td><span class="dash-date-tag">{{ $formatDate(v.fecha) }}</span></td>
              </tr>
              <tr v-if="!stats.valesRecientes?.length">
                <td colspan="5" class="dash-empty">Sin vales recientes</td>
              </tr>
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
  data() { return { stats: {}, now: '' }; },
  computed: {
    kpis() { return [
      { icon: '&#128230;', label: 'Total Equipos', value: this.fmt(this.stats.total), color: '#4caf50', bg: 'rgba(76,175,80,0.12)' },
      { icon: '&#9989;', label: 'En Bines', value: this.fmt(this.stats.enBines), color: '#66bb6a', bg: 'rgba(102,187,106,0.12)' },
      { icon: '&#128666;', label: 'Despachadas', value: this.fmt(this.stats.despachadas), color: '#ff9800', bg: 'rgba(255,152,0,0.12)' },
      { icon: '&#128295;', label: 'Instaladas', value: this.fmt(this.stats.instaladas), color: '#42a5f5', bg: 'rgba(66,165,245,0.12)' },
      { icon: '&#128260;', label: 'Devueltas', value: this.fmt(this.stats.devueltas), color: '#ab47bc', bg: 'rgba(171,71,188,0.12)' },
      { icon: '&#9888;', label: 'Mal Estado', value: this.fmt(this.stats.malEstado), color: '#ef5350', bg: 'rgba(239,83,80,0.12)' },
    ]},
    kpisSecondary() { return [
      { label: 'Abonados', value: this.fmt(this.stats.abonados) },
      { label: 'Instalaciones', value: this.fmt(this.stats.totalInstalaciones) },
      { label: 'Vales', value: this.fmt(this.stats.totalVales) },
    ]},
    maxModelo() { return this.stats.byModelo?.length ? Math.max(...this.stats.byModelo.map(m => m.count)) : 1 },
    maxTecnico() { return this.stats.tecnicos?.length ? Math.max(...this.stats.tecnicos.map(t => t.count)) : 1 },
    maxZona() { return this.stats.byZona?.length ? Math.max(...this.stats.byZona.map(z => z.count)) : 1 },
  },
  async mounted() {
    const r = await api.get('/stats');
    this.stats = r.data;
    this.now = new Date().toLocaleString('es-BO');
  },
  methods: {
    fmt(n) { return (n || 0).toLocaleString('es-BO'); },
    barWidth(val, max) { return max > 0 ? Math.round((val / max) * 100) : 0; },
    statusColor(s) {
      const c = { en_bines: '#4caf50', despachada: '#ff9800', instalada: '#42a5f5', devuelta: '#ab47bc', en_bines_mal_estado: '#ef5350' };
      return c[s] || '#8888a8';
    },
    statusLabel(s) {
      const l = { en_bines: 'En Bines', despachada: 'Despachada', instalada: 'Instalada', devuelta: 'Devuelta', en_bines_mal_estado: 'Mal Estado' };
      return l[s] || s;
    }
  }
};
</script>

<style>
.dash { max-width: 1200px; }

.dash-header {
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  padding: 24px;
  border-radius: var(--c-radius-lg);
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

[data-theme="light"] .dash-header {
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%);
}
.dash-title { font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--c-accent); }
.dash-subtitle { color: var(--c-text-muted); font-size: 0.78rem; }
.dash-date { font-size: 0.78rem; color: var(--c-text-muted); }

/* KPI */
.dash-kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 12px; }
.dash-kpi-row-secondary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }

.dash-kpi {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.2s, border-color 0.2s;
}
.dash-kpi:hover { transform: translateY(-2px); border-color: var(--c-accent); }

.dash-kpi-icon {
  width: 42px; height: 42px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}

.dash-kpi-data { display: flex; flex-direction: column; }
.dash-kpi-value { font-size: 1.3rem; font-weight: 700; color: var(--c-text); line-height: 1; }
.dash-kpi-label { font-size: 0.68rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 3px; }

.dash-kpi-sm {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--c-radius);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dash-kpi-sm-value { font-size: 1.4rem; font-weight: 700; color: var(--c-accent); }
.dash-kpi-sm-label { font-size: 0.75rem; color: var(--c-text-muted); }

/* Grid */
.dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.dash-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--c-radius); overflow: hidden; }
.dash-card-wide { grid-column: span 2; }

.dash-card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
}
.dash-card-title { font-size: 0.82rem; font-weight: 700; color: var(--c-accent); }
.dash-card-badge { background: var(--c-accent-dim); color: var(--c-accent); padding: 2px 10px; border-radius: 20px; font-size: 0.68rem; font-weight: 700; }
.dash-card-body { padding: 14px 16px; }

/* Bars */
.dash-bars { display: flex; flex-direction: column; gap: 8px; }
.dash-bar-row { display: flex; align-items: center; gap: 10px; }
.dash-bar-label { width: 140px; font-size: 0.73rem; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.dash-bar-track { flex: 1; height: 8px; background: var(--c-surface2); border-radius: 4px; overflow: hidden; }
.dash-bar-fill { height: 100%; background: var(--c-accent); border-radius: 4px; transition: width 0.6s ease; }
.dash-bar-fill-accent { background: var(--c-accent); }
.dash-bar-fill-green { background: var(--c-success); }
.dash-bar-value { width: 42px; text-align: right; font-size: 0.78rem; font-weight: 700; color: var(--c-text); }

/* Status */
.dash-status-list { display: flex; flex-direction: column; gap: 10px; }
.dash-status-item { display: flex; align-items: center; gap: 10px; }
.dash-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dash-status-info { flex: 1; }
.dash-status-name { font-size: 0.75rem; font-weight: 600; color: var(--c-text); margin-bottom: 3px; }
.dash-status-count { font-size: 0.82rem; font-weight: 700; color: var(--c-accent); width: 50px; text-align: right; }

/* Tables */
.dash-table { width: 100%; border-collapse: collapse; }
.dash-table th {
  padding: 10px 14px; font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--c-text-muted); background: var(--c-surface2);
  border-bottom: 1px solid var(--c-border); white-space: nowrap;
}
.dash-table td {
  padding: 10px 14px; font-size: 0.82rem;
  border-bottom: 1px solid var(--c-border); vertical-align: middle;
}
.dash-table tr:hover td { background: rgba(129,140,248,0.03); }
[data-theme="light"] .dash-table tr:hover td { background: rgba(99,102,241,0.03); }

.dash-code {
  display: inline-block;
  background: var(--c-accent-dim);
  color: var(--c-accent);
  padding: 2px 8px; border-radius: 4px;
  font-size: 0.78rem; font-weight: 600;
}
.dash-date-tag { font-size: 0.78rem; color: var(--c-text-muted); }
.dash-muted { color: var(--c-text-muted); font-size: 0.78rem; }
.dash-empty { text-align: center; padding: 30px; color: var(--c-text-muted); font-size: 0.82rem; }

@media (max-width: 900px) {
  .dash-kpi-row { grid-template-columns: repeat(3, 1fr); }
  .dash-grid { grid-template-columns: 1fr; }
  .dash-card-wide { grid-column: span 1; }
}
@media (max-width: 600px) {
  .dash-kpi-row { grid-template-columns: repeat(2, 1fr); }
  .dash-header { flex-direction: column; gap: 8px; text-align: center; }
}
</style>
