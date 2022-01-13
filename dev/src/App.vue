<template>
  <div id="app">
    <Shapes />
    <Images />
    <ManyImages />
  </div>
</template>

<script>
import './assets/main.css'
import Shapes from '@/components/Shapes'
import Images from "@/components/Images";
import ManyImages from "@/components/ManyImages";

export default {
  name: 'App',
  components: {
    ManyImages,
    Images,
    Shapes
  }
}
</script>

<style>

#app {
  text-align: center;
  margin-top: 60px;
}
</style>
