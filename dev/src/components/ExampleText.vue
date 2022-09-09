<template>
  <div class="example-container">
    <h1>Text</h1>
    <canvas width="550" height="420" id="example-text"></canvas>
  </div>
</template>

<script>

import { UIRenderer, TextStyle, TextBox } from "../../../index";

export default {
  name: 'ExampleText',

  data () {
    return {
      uiRenderer: null
    }
  },

  methods: {
    draw: function () {
      const ui = this.uiRenderer;
      ui.beginFrame();

      const color = [0.5, 0.7, 0.5, 1];
      const textStyle = new TextStyle(15, color);

      ui.addText("A", [0, 0], 240, color);
      ui.addText("Era uma vez um gato...", [200, 0], 14,color);

      let x = 50;
      let y = 50;
      new TextBox(ui, "Bla", x, y, 50, 20, textStyle);

      let style1 = new TextStyle(15, color);
      new TextBox(ui, "Lorem ipsum fox foxy dolor sick siiiiicko", 150, y, 70, 150, style1);

      style1.flow = TextStyle.Flow.Wrap;
      new TextBox(ui, "Lorem ipsum fox foxy dolor sick siiiiicko", 250, y, 70, 150, style1);

      style1.valign = TextStyle.VAlign.Top;
      new TextBox(ui, "Lorem ipsum fox foxy dolor sick siiiiicko", 350, y, 70, 150, style1);

      style1.valign = TextStyle.VAlign.Bottom;
      new TextBox(ui, "Lorem ipsum fox foxy dolor sick siiiiicko", 450, y, 70, 150, style1);

      y += 160;
      style1.flow = TextStyle.Flow.Wrap;
      style1.valign = TextStyle.VAlign.Top;
      new TextBox(ui, "Lorem ipsum fox foxy dolor sick siiiiicko",  50, y, 70, 60, style1);

      style1.flow = TextStyle.Flow.Wrap;
      style1.valign = TextStyle.VAlign.Center;
      style1.halign = TextStyle.HAlign.Left;
      new TextBox(ui, "Bla", 150, y, 70, 150, style1);

      style1.valign = TextStyle.VAlign.Top;
      style1.halign = TextStyle.HAlign.Center;
      new TextBox(ui, "Bla", 250, y, 70, 150, style1);

      style1.valign = TextStyle.VAlign.Bottom;
      style1.halign = TextStyle.HAlign.Right;
      new TextBox(ui, "Bla", 350, y, 70, 150, style1);

      ui.draw();
    }
  },

  mounted: function () {
    const canvas = document.getElementById('example-text');
    this.uiRenderer = new UIRenderer(canvas, this.draw);
    this.draw();
  }
}


</script>

<style scoped>
</style>
