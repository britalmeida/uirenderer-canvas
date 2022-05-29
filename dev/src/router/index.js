import Vue from 'vue'
import VueRouter from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GanttView from '@/views/GanttView';
import TextView from '@/views/TextView';

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/many-images',
    name: 'many-images',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/ManyImagesView.vue')
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

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
