<template lang="pug">
.example-container
  h1 480 Images
  canvas(
    ref="canvas"
    width="470"
    height="600"
    )
  pre.
    Canvas: 470x120
    1. Create an array of UILayout.ThumbnailImage objects
    2. Create an array of urls (for each UILayout.ThumbnailImage)
    3. Create image bundle with uiRenderer.loadImageBundle
    4. Call the draw method
    5. This is the draw method:
      const ui = this.uiRenderer;
      ui.beginFrame();
      for (const thumb of this.thumbnails) {
        ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], this.thumbSize[0], this.thumbSize[1], this.imgBundleID, thumb.objIdx);
      }
      ui.draw();
  
      
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { vec2, vec4, UIRenderer, UILayout } from '../../../index';

let uiRenderer: UIRenderer = null;
let imgBundleID: WebGLTexture | null = null;
let imgSourceResolution: vec2 = [50, 50];
let thumbnails: UILayout.ThumbnailImage[] = [];
const canvas = ref(null);

const uiConfig = {
    minMargin: 20, // Minimum padding, in pixels, around the thumbnail area. Divide by 2 for one side.
    totalSpacing: [100, 100], // Maximum accumulated space between thumbs + margin.
};

function draw() {
  // Determine where each thumbnail should draw at the maximum possible size for the currently available area
  let thumbnailSize = UILayout.fitThumbsInGrid(
    thumbnails, imgSourceResolution, uiConfig, canvas.value.getBoundingClientRect());

  const ui = uiRenderer;
  ui.beginFrame();
  for (const thumb of thumbnails) {
    ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], thumbnailSize[0], thumbnailSize[1], imgBundleID, thumb.objIdx);
  }
  ui.draw();
}

onMounted(() => {
  uiRenderer = new UIRenderer(canvas.value, draw);

  let thumbUrls = [];
  for (let i = 0; i < 450; i++) { //starts loop
    let thumbnail = new UILayout.ThumbnailImage(null, i);
    thumbnails.push(thumbnail);
  }

  for (const thumb of thumbnails) {
    thumbUrls.push(`https://picsum.photos/seed/${(thumb.objIdx + 1) * Math.random()}/50`);
  }
  imgBundleID = uiRenderer.loadImageBundle(thumbUrls, imgSourceResolution);

  draw();
})


</script>

