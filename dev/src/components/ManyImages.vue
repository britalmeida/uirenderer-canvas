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
      thumbnailSize: [50, 50],
      thumbnails: []
    }
  },
  computed: {
    uiConfig: function() {
      // Layout constants.
      return {
        fontSize: 12,
        selectedHighlight: { width: 1.5, color: [1.0, 0.561, 0.051, 1.0], },
        currFrameHighlight: { width: 1.5, color: [0.85, 0.8, 0.7, 1.0], },
        castingHighlight: { width: 1.5, color: [0.2, 0.58, 0.8, 1.0], },
        thumbOverlayInfo: { textPad: 5, color: [0.11, 0.11, 0.11, 0.8] },
        taskStatus: { radius: 5, offsetX: 5, offsetY: 6, disabledColor: [0.05, 0.05, 0.05, 0.8] },
        assignees: { avatarSize: 32, offsetX: 5, offsetY: 5, spaceInBetween: 2 },
        // View.
        minMargin: 40, // Minimum padding, in pixels, around the thumbnail area. Divide by 2 for one side.
        totalSpacing: [150, 150], // Maximum accumulated space between thumbs + margin.
        // Grouped view.
        groupedView: {
          summaryText: { spaceBefore: -10, spaceAfter: 12, },
          groupTitle: { spaceBefore: 4, spaceAfter: 2, },
          colorRect: { width: 6, xOffset: 12, },
        },
      };
    },
  },
  methods: {
    draw: function () {
      const ui = this.uiRenderer;
      ui.beginFrame();
      for (const thumb of this.thumbnails) {
        ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], this.thumbnailSize[0], this.thumbnailSize[1], this.imgBundleID, thumb.objIdx);
      }
      ui.draw();
    }
  },
  mounted: function () {
    const canvas = document.getElementById('many-images');
    this.uiRenderer = new UIRenderer(canvas, this.draw);

    let thumbUrls = [];
    for (let i = 0; i < 10; i++) { //starts loop
      let thumbnail = new UILayout.ThumbnailImage(null, i);
      this.thumbnails.push(thumbnail);
    }

    for (const thumb of this.thumbnails) {
      thumbUrls.push(`https://picsum.photos/seed/${(thumb.objIdx + 1) * Math.random()}/50`);
    }
    this.thumbnailSize = UILayout.fitThumbsInGrid(
        this.thumbnails, [50, 50], this.uiConfig, canvas.getBoundingClientRect());

    this.imgBundleID = this.uiRenderer.loadImageBundle(thumbUrls, this.thumbnailSize);

    this.draw();
  }
}


</script>

<style scoped>
</style>
