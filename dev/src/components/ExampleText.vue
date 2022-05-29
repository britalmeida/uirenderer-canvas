<template>
  <div class="example-container">
    <h1>Text</h1>
    <canvas width="470" height="120" id="example-text"></canvas>
  </div>
</template>

<script>
import {UIRenderer} from "../../../index";
export default {
  name: 'ExampleText',
  mounted: function () {
    const canvas = document.getElementById('example-text');
    const ui = new UIRenderer(canvas);
    ui.beginFrame();
    const color = [0.5, 0.7, 0.5, 1];
    ui.addRect(10, 10, 100, 100, color);
    ui.draw();
  }
}


</script>

<style scoped>
</style>
