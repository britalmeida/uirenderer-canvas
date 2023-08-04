# UI Renderer - Canvas

*Minimal 2D UI system for the Web*

A shading and layout engine for 2D graphics elements, such as rectangles and images, geared towards building UIs and data viz.

Made to be used as a framework for a website's canvas, the UI Renderer is built with WebGL 2, GLSL and TS and consists of just a few files with no dependencies.
Examples are provided using Vue.js, but can be adapted to other web frameworks or static websites.


## Features

Based on Analytical AA, the renderer features an immediate style API to define shapes such as lines and rectangles with beautifully rounded corners.
- Simple **geometric shapes**, either filled or outlined.
- **Images**: standalone or bundled in a set with the same resolution, ideal for icon and thumbnail packs.
- **Clip rects** and **transforms** for the shapes/images, which can be used to implement *zooming*, *scrolling* and *panning* (not rotations).

Limitations: **no text support!** It can be added in a second canvas overlaid on top of the WebGL canvas. Work in progress. It's coming!

### Scope
UI Renderer is proven for performance as a shading engine. It can support an order of hundreds of thousand shapes with a good framerate.
There is limited functionality to help layout shapes in a grid and work in progress text support, including a text box and wrapping.

It is not a tools framework. It doesn't have UI elements such as "checkbox" or "slider" and doesn't have concepts such as undo stack, UI themes or key bindings.

UI Renderer is a good choice for custom data visualizations build with shapes that zoom smoothly to any resolution. It can also be used as a rendering backend for a UI framework or a 2D game.


## Usage

Originally built for Watchtower by Inês Almeida as an adaptation for the web of a Blender add-on (how hard can it be to render a couple of rectangles in a canvas? :D), UI Renderer is known to be in use by:
- **Watchtower** - production tracking tool for film with timeline and thumbnail grid view - https://watchtower.blender.org
- **Dispatch** - project management and gantt chart tool (WIP) - https://github.com/armadillica/dispatch
- **Dima** - functional UI/UX mockup (WIP) - https://ui.blender.org/
- **2D game jam projects** - (WIP) - https://github.com/britalmeida/eggscape

### Examples
See `docs` for code examples and how to get started.


## Technical Notes
Architecturally, the renderer works with a single quad divided in tiles and a command list with all the shapes to be drawn each frame.

The TS side composes the command list with shape definitions requested from a client application and pushes them to the shader each frame.

The fragment/pixel shader is responsible for the actual rendering and compositing of shapes using their analytical definition to calculate pixel coverage.
This allows for nice looking pixel based effects such as drop shadows and rounded corners without tessellating vertex lists.
Each pixel will loop over all the shape commands that overlap that pixel's tile and calculate the pixel's coverage by the shape.
Shade is accumulated in order, therefore it is possible to stack semi-transparent elements and have the shapes issued last to overlap the previous ones.

Special thanks to Michiel van der Leeuw for sharing ideas on this topic.


### Code Structure
- `src` - rendering API and backend implementation + grid layouts
- `glsl` - implementation of the shape drawing in the fragment shader
- `docs` - code examples and development instructions


## Support & Maintenance
UI Renderer is originally developed by Inês Almeida with help from Francesco Siddi.
It's an open source project, reach out if you have ideas, problems or feedback!

While this is currently a hobby project for me (Inês), it's used worldwide by film production studios as a part of Watchtower which is a Blender Studio project.  
Active bugfixing can be expected for Watchtower. Improvements and further development happen whenever Inês finds the groove for it.
