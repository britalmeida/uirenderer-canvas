<template>
  <div class="example-container">
    <h1>480 Images</h1>
    <canvas width="470" height="600" id="many-images"></canvas>
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
  name: 'ManyImages',
  data () {
    return {
      uiRenderer: null,
      imgBundleID: null,
      imgSourceResolution: [50,50],
      thumbnails: []
    }
  },
  computed: {
    uiConfig: function() {
      // Layout constants.
      return {
        // View.
        minMargin: 20, // Minimum padding, in pixels, around the thumbnail area. Divide by 2 for one side.
        totalSpacing: [100, 100], // Maximum accumulated space between thumbs + margin.
      };
    },
  },
  methods: {
    draw: function () {
      const canvas = document.getElementById('many-images');
      // Determine where each thumbnail should draw at the maximum possible size for the currently available area
      let thumbnailSize = UILayout.fitThumbsInGrid(
        this.thumbnails, this.imgSourceResolution, this.uiConfig, canvas.getBoundingClientRect());


      const ui = this.uiRenderer;
      ui.beginFrame();
      for (const thumb of this.thumbnails) {
        ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], thumbnailSize[0], thumbnailSize[1], this.imgBundleID, thumb.objIdx);
      }
      ui.draw();
    }
  },
  mounted: function () {
    const canvas = document.getElementById('many-images');
    this.uiRenderer = new UIRenderer(canvas, this.draw);

    let thumbUrls = [];
    for (let i = 0; i < 450; i++) { //starts loop
      let thumbnail = new UILayout.ThumbnailImage(null, i);
      this.thumbnails.push(thumbnail);
    }

    for (const thumb of this.thumbnails) {
      thumbUrls.push(`https://picsum.photos/seed/${(thumb.objIdx + 1) * Math.random()}/50`);
    }
    this.imgBundleID = this.uiRenderer.loadImageBundle(thumbUrls, this.imgSourceResolution);

    this.draw();
  }
}


</script>

<style scoped>
</style>
