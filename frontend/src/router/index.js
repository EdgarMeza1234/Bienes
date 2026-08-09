import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/equipos', name: 'Equipos', component: () => import('../views/General.vue') },
  { path: '/equipo/:id', name: 'EquipoDetail', component: () => import('../views/EquipoDetail.vue') },
  { path: '/abonados', name: 'Abonados', component: () => import('../views/Abonados.vue') },
  { path: '/instalaciones', name: 'Instalaciones', component: () => import('../views/Instalaciones.vue') },
  { path: '/vales', name: 'Vales', component: () => import('../views/Vales.vue') },
  { path: '/importar', name: 'Importar', component: () => import('../views/Importar.vue') },
  { path: '/devoluciones', name: 'Devoluciones', component: () => import('../views/Devueltos.vue') }
]

export default createRouter({
  history: createWebHistory('/bienes/'),
  routes
})
