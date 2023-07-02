<template lang="pug">
div(classname="example-container")
  h1 Gantt
  canvas(
    ref="canvas"
    width="600"
    height="120"
    )
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { vec4, UIRenderer } from '../../../index';

let uiRenderer: UIRenderer = null;
const canvas = ref(null);

function draw() {
  const ui = uiRenderer;
  ui.beginFrame();
  const color: vec4 = [0.5, 0.7, 0.5, 1.0];
  ui.addRect(80, 10, 300, 20, color, 5);
  ui.addRect(20, 40, 450, 20, color, 5);
  ui.addRect(40, 70, 180, 20, color, 5);
  ui.addRect(120, 100, 180, 20, color, 5);
  ui.draw();
}

onMounted(() => {
  uiRenderer = new UIRenderer(canvas.value, draw);
  draw();
})
</script>
