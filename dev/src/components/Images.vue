<template>
  <div class="example-container">
    <h1>Images</h1>
    <canvas width="470" height="120" id="images"></canvas>
    <pre>
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

    </pre>
  </div>
</template>

<script>
import {UIRenderer, UILayout} from "../../../index";
export default {
  name: 'Images',
  data () {
    return {
      uiRenderer: null,
      imgBundleID: null,
      thumbSize: [100, 100],
      thumbnails: []
    }
  },
  methods: {
    draw: function () {
      const ui = this.uiRenderer;
      ui.beginFrame();
      for (const thumb of this.thumbnails) {
        ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], this.thumbSize[0], this.thumbSize[1], this.imgBundleID, thumb.objIdx);
      }
      ui.draw();
    }
  },
  mounted: function () {
    const canvas = document.getElementById('images');
    this.uiRenderer = new UIRenderer(canvas, this.draw);

    let thumbUrls = [];
    for (let i = 0; i < 4; i++) { //starts loop
      let thumbnail = new UILayout.ThumbnailImage(null, i);
      thumbnail.pos =  [(10 + 16 * i) + (i * 100), 10 ];
      this.thumbnails.push(thumbnail);
    }

    for (const thumb of this.thumbnails) {
      thumbUrls.push(`https://picsum.photos/seed/${(thumb.objIdx + 1) * Math.random()}/200`);
    }

    this.imgBundleID = this.uiRenderer.loadImageBundle(thumbUrls, this.thumbSize);

    this.draw();
  }
}


</script>

<style scoped>
</style>
