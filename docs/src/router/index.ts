import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import GanttView from '@/views/GanttView.vue'
import TextView from '@/views/TextView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/many-images',
      name: 'many-images',
      component: () => import( '../views/ManyImagesView.vue')
    },
    {
      path: '/gantt',
      name: 'gantt',
      component: GanttView
    },
    {
      path: '/text',
      name: 'text',
      component: TextView
    }
  ]
})

export default router

