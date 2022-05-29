<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/many-images">Many Images</router-link> |
      <router-link to="/gantt">Gantt</router-link>
    </nav>
    <router-view/>
  </div>
</template>

<script>
import './assets/main.css'

export default {
  name: 'App',

}
</script>

<style>
#app {
  text-align: center;
  margin-top: 60px;
}
</style>
