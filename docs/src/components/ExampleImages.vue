<template lang="pug">
.example-container
  h1 Images
  canvas(
    ref="canvas"
    width="470"
    height="120")
  pre.
    Canvas: 470x120
    1. Create and load each image once from an URL with uiRenderer.loadImage. Keep the returned textureIDs.
      imgTextureIDs.push(uiRenderer.loadImage(`https://picsum.photos/seed/${Math.random()}/200`));
    2. Call the draw method with:
      ui.beginFrame();
      for (let i = 0; i &lt; imgTextureIDs.length; i++) {
        const x = 10 + (i * (16 + thumbSize[0]));
        ui.addImage(x, 10, thumbSize[0], thumbSize[1], imgTextureIDs[i]);
      }
      ui.draw();

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { type vec2, UIRenderer } from '../../../index';

let uiRenderer: UIRenderer | null = null;
const imgTextureIDs: WebGLTexture[] = [];
const thumbSize: vec2 = [100, 100];
const canvas = ref(null);

function draw() {
  const ui = uiRenderer!; // Guaranteed to exist, created onMount.
  ui.beginFrame();

  for (let i = 0; i < imgTextureIDs.length; i++) {
    const x = 10 + (i * (16 + thumbSize[0]));
    ui.addImage(x, 10, thumbSize[0], thumbSize[1], imgTextureIDs[i]);

  }

  ui.draw();
}

onMounted(() => {
  uiRenderer = new UIRenderer(canvas.value!, draw);

  // Load images once from the network, onto the GPU.
  imgTextureIDs.push(uiRenderer.loadImage(`https://picsum.photos/seed/${Math.random()}/200`));
  imgTextureIDs.push(uiRenderer.loadImage(`https://picsum.photos/seed/${Math.random()}/200`));

  draw();
})
</script>
