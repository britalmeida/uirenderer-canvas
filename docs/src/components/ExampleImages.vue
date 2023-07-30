<template lang="pug">
.example-container
  h1 Images
  canvas(
    ref="canvas"
    width="470"
    height="120")
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
import { type vec2, UIRenderer, UILayout } from '../../../index';

let uiRenderer: UIRenderer | null = null;
let imgBundleID: WebGLTexture | null = null;
let thumbSize: vec2 = [100, 100];
let thumbnails: UILayout.ThumbnailImage[] = [];
const canvas = ref(null);

function draw() {
  const ui = uiRenderer!; // Guaranteed to exist, created onMount.
  ui.beginFrame();
  for (const thumb of thumbnails) {
    ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], imgBundleID!, thumb.objIdx);
  }
  ui.draw();
}

onMounted(() => {
  uiRenderer = new UIRenderer(canvas.value!, draw);
  let thumbUrls = [];
  for (let i = 0; i < 4; i++) {
    let thumbnail = new UILayout.ThumbnailImage(null, i);
    thumbnail.pos =  [10 + (i * (16 + thumbSize[0])) , 10 ];
    thumbnails.push(thumbnail);
  }

  for (const thumb of thumbnails) {
    thumbUrls.push(`https://picsum.photos/seed/${(thumb.objIdx + 1) * Math.random()}/200`);
  }

  imgBundleID = uiRenderer.loadImageBundle(thumbUrls, thumbSize);
  draw();
})
</script>
