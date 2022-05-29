<template>
  <div class="example-container">
    <h1>Gantt</h1>
    <canvas width="600" height="120" id="gantt"></canvas>
  </div>
</template>

<script>
import {UIRenderer} from "../../../index";
export default {
  name: 'Shapes',
  mounted: function () {
    const canvas = document.getElementById('gantt');
    const ui = new UIRenderer(canvas);
    ui.beginFrame();
    const color = [0.5, 0.7, 0.5, 1];
    ui.addRect(80, 10, 300, 20, color, 5);
    ui.addRect(20, 40, 450, 20, color, 5);
    ui.addRect(40, 70, 180, 20, color, 5);
    ui.addRect(120, 100, 180, 20, color, 5);
    ui.draw();
  }
}

</script>

<style scoped>
</style>
