# UI Renderer - Canvas

*Minimal 2D UI system for the Web*

A shading and layout engine for 2D graphics elements, such as rectangles and images, geared towards building UIs and data viz.

Built for use in websites using WebGL 2, GLSL and JS, the UI Renderer consists of just a few files with no dependencies.  
Examples are provided using Vue.js, but can be adapted to other web frameworks or static websites.


## Features

Based on Analytical AA, the renderer features an immediate style API to define shapes such as lines and rectangles with beautifully rounded corners.
- Simple **geometric shapes**, either filled or outlined.
- **Images**: standalone or bundled in a set with the same resolution, ideal for icon and thumbnail packs.
- **Clip rects** and **transforms** for series of shapes/images.

Limitations: no text support! It can be added in a second canvas overlaid on top of the WebGL canvas.


## Usage
<examples, watchtower link>


## Code Structure
- `lib` - rendering API and backend implementation + grid layouts
- `glsl` - implementation of the shape drawing
- `dev` - code examples and development instructions


## Technical Notes
Architecturally, the renderer works with a single quad divided in tiles and a command list with all the shapes to be drawn each frame.

The JS side composes the command list with shape definitions from a client application and pushes them to the shader.

The fragment/pixel shader is responsible for the actual rendering and compositing of shapes using their analitical definition to calculate pixel coverage.
This allows for nice looking pixel based effects such as drop shadows and rounded corners without tessellating vertex lists.
