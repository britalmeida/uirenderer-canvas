<template lang="pug">
.example-container
  h1 Shapes
  canvas(
    ref="canvas"
    width="470"
    height="120"
    )
  pre.
    Canvas: 470x120
    ui.beginFrame();
    const color = [0.5, 0.7, 0.5, 1.0];
    ui.addRect(10, 10, 100, 100, color);
    ui.addCircle([170, 60], 50, color);
    ui.addLine([270, 15], [225, 105], 10, color)
    ui.addTriangle([295, 10], [245, 110], [345, 110], color)
    ui.addRect(360, 10, 100, 100, color, 10);
    ui.draw();
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { UIRenderer } from '../../../index';

let uiRenderer: UIRenderer = null;
let canvas = ref(null);

function draw() {
  const ui = uiRenderer;
  ui.beginFrame();

  const color = [0.5, 0.7, 0.5, 1.0];
  ui.addRect(10, 10, 100, 100, color);
  ui.addCircle([170, 60], 50, color);
  ui.addLine([270, 15], [225, 105], 10, color)
  ui.addTriangle([295, 10], [245, 110], [345, 110], color)
  ui.addRect(360, 10, 100, 100, color, 10);
  ui.draw();
}

onMounted(() => {
  uiRenderer = new UIRenderer(canvas.value, draw);
  draw();
  })
</script>
