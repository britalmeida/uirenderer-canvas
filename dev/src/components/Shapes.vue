<template>
  <div class="example-container">
    <h1>Shapes</h1>
    <canvas width="470" height="120" id="shapes"></canvas>
    <pre>
      Canvas: 470x120
      ui.beginFrame();
      const color = [0.5, 0.7, 0.5, 1];
      ui.addRect(10, 10, 100, 100, color);
      ui.addCircle([170, 60], 50, color);
      ui.addLine([270, 15], [225, 105], 10, color)
      ui.addTriangle([295, 10], [245, 110], [345, 110], color)
      ui.addRect(360, 10, 100, 100, color, 10);
      ui.draw();
    </pre>
  </div>
</template>

<script>
import {UIRenderer} from "../../../index";
export default {
  name: 'Shapes',
  mounted: function () {
    const canvas = document.getElementById('shapes');
    const ui = new UIRenderer(canvas);
    ui.beginFrame();
    const color = [0.5, 0.7, 0.5, 1];
    ui.addRect(10, 10, 100, 100, color);
    ui.addCircle([170, 60], 50, color);
    ui.addLine([270, 15], [225, 105], 10, color)
    ui.addTriangle([295, 10], [245, 110], [345, 110], color)
    ui.addRect(360, 10, 100, 100, color, 10);
    ui.draw();
  }
}


</script>

<style scoped>
</style>
