<template lang="pug">
.example-container
  h1 Text
  canvas(
    ref="canvas"
    width="550" 
    height="420")
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { type vec4, UIRenderer, TextStyle, TextBox } from "../../../index";

let uiRenderer: UIRenderer | null = null;
const canvas = ref(null);

function draw() {
  const ui = uiRenderer!; // Guaranteed to exist, created onMount.
  ui.beginFrame();

  const color: vec4 = [0.5, 0.7, 0.5, 1.0];
  const textStyle = new TextStyle(15, color);

  ui.addText("A", [0, 0], 240, color);
  ui.addText("Era uma vez um gato...", [200, 0], 14,color);

  const x = 50;
  let y = 50;
  new TextBox(ui, "Bla", x, y, 50, 20, textStyle);

  const style1 = new TextStyle(15, color);
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

onMounted(() => {
  uiRenderer = new UIRenderer(canvas.value!, draw);
  draw();
})

</script>

