import { createApp } from 'vue'
import VueGtag from 'vue-gtag'
import App from './App.vue'

const app = createApp(App)
app.use(VueGtag, {
  config: { id: 'G-85N9PJK7FM' },
  enabled: true // Replace with your Google Analytics ID
})
app.mount('#app')
