<template lang="pug">
header
  RouterLink(to="/") Home
  RouterLink(to="/many-images") Many Images
  RouterLink(to="/gantt") Gantt 
  RouterLink(to="/text") Text
RouterView

</template>

<script setup lang="ts">
import './assets/main.css'
import { RouterLink, RouterView } from 'vue-router'
</script>


<style scoped>
#app {
  text-align: center;
  margin-top: 60px;
}
</style>
