import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const app = createApp(App)
app.config.globalProperties.$formatDate = (d) => {
  if (!d) return '-'
  const p = d.split('-')
  if (p.length !== 3) return d
  return p[2] + '/' + p[1] + '/' + p[0]
}
app.use(router)
app.mount('#app')
