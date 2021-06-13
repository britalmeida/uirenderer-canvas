// Representation of a rectangle for geometry operations.
export function Rect (x, y, w, h) {

  this.left   = x;
  this.right  = x + w;
  this.top    = y;
  this.bottom = y + h;
  this.width  = w;
  this.height = h;

  this.contains = function (x, y) {
    return this.left <= x && x <= this.right &&
        this.top  <= y && y <= this.bottom;
  }

  this.widen = function (val) {
    this.left -= val;
    this.top -= val;
    this.width += val * 2.0;
    this.height += val * 2.0;
    this.right = this.left + this.width;
    this.bottom = this.top + this.height;
  }
  this.widened = function (val) {
    return new Rect(this.left - val, this.top - val,
        this.width + val * 2.0, this.height + val * 2.0);
  }

  this.encapsulate = function (point) {
    this.left = Math.min(this.left, point[0]);
    this.right = Math.max(this.right, point[0]);
    this.top = Math.min(this.top, point[1]);
    this.bottom = Math.max(this.bottom, point[1]);
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;
  }
}


export function UIRenderer(canvas, redrawCallback) {

  // Rendering context
  this.gl = null;
  const MAX_CMD_BUFFER_LINE = 512; // Note: hardcoded on the shader side as well.
  const MAX_CMDS = MAX_CMD_BUFFER_LINE * MAX_CMD_BUFFER_LINE;

  // Callback to trigger a redraw of the view component using this renderer.
  this.redrawCallback = redrawCallback;

  // Viewport transform
  this.transform = [ 1, 0, 0, 0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1 ];

  // Shader data
  this.shaderInfo = {};
  this.buffers = {};
  this.cmdData = new Float32Array(MAX_CMDS * 4); // Pre-allocate commands of 4 floats (128 width).
  this.cmdDataIdx = 0;
  this.fallback2DTextureID = null;
  this.fallbackArrayTextureID = null;
  this.textureIDs = [];
  this.textureBundleIDs = [];
  this.loadingTextureIDs = [];

  // Command types
  const CMD_LINE     = 1;
  const CMD_TRIANGLE = 2;
  const CMD_RECT     = 3;
  const CMD_FRAME    = 4;
  const CMD_IMAGE    = 5;

  // Style
  this.styleDataStartIdx = MAX_CMDS * 4 - MAX_CMD_BUFFER_LINE; // Start writing style to the last cmd data texture line.
  this.styleDataIdx = this.styleDataStartIdx;
  this.styleStep = 2 * 4; // Number of floats that a single style needs.

  // State
  this.stateColor = [-1, -1, -1, -1];
  this.stateLineWidth = 1.0;
  this.stateCorner = 0.0;
  this.stateChanges = 0;

  // Add primitives.
  this.addRect = function (left, top, width, height, color, cornerWidth = 0) {
    const bounds = new Rect(left, top, width, height);
    this.addPrimitiveShape(CMD_RECT, bounds, color, null, cornerWidth);
  }

  this.addFrame = function (left, top, width, height, lineWidth, color, cornerWidth = 0) {
    const bounds = new Rect(left, top, width, height);
    this.addPrimitiveShape(CMD_FRAME, bounds, color, lineWidth, cornerWidth);
  }

  this.addLine = function (p1, p2, width, color) {
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.encapsulate(p2);
    bounds.widen(Math.round(width * 0.5 + 0.01));
    let w = this.addPrimitiveShape(CMD_LINE, bounds, color, width, null);
    // Data 3 - Shape parameters
    this.cmdData[w++] = p1[0];
    this.cmdData[w++] = p1[1];
    this.cmdData[w++] = p2[0];
    this.cmdData[w++] = p2[1];

    this.cmdDataIdx = w;
  }

  this.addTriangle = function (p1, p2, p3, color) {
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.encapsulate(p2);
    bounds.encapsulate(p3);
    let w = this.addPrimitiveShape(CMD_TRIANGLE, bounds, color, null, null);
    // Data 3 - Shape parameters
    this.cmdData[w++] = p1[0];
    this.cmdData[w++] = p1[1];
    this.cmdData[w++] = p2[0];
    this.cmdData[w++] = p2[1];
    // Data 4 - Shape parameters II
    this.cmdData[w++] = p3[0];
    this.cmdData[w++] = p3[1];
    w+=2;

    this.cmdDataIdx = w;
  }

  this.addCircle = function (p1, radius, color) {
    // A circle is a rectangle with very rounded corners.
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.widen(radius);
    this.addRect(bounds.left, bounds.top, bounds.width, bounds.height, color, radius);
  }

  this.addCircleFrame = function (p1, radius, lineWidth, color) {
    // A circle is a rectangle with very rounded corners.
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.widen(radius);
    this.addFrame(bounds.left, bounds.top, bounds.width, bounds.height, lineWidth, color, radius);
  }

  this.addImage = function (left, top, width, height, textureID, cornerWidth = 0, alpha = 1.0) {
    const samplerIdx = this.pushTextureID(textureID,
        this.textureIDs, this.shaderInfo.uniforms.samplers, this.fallback2DTextureID,
        "Maximum number of single images exceeded. Images need to be bundled.");
    this.addImageInternal(left, top, width, height, samplerIdx, 0, cornerWidth, alpha);
  }

  this.addImageFromBundle = function (left, top, width, height, textureID, slice, cornerWidth = 0, alpha = 1.0) {
    const samplerIdx = 10 + this.pushTextureID(textureID,
        this.textureBundleIDs, this.shaderInfo.uniforms.bundleSamplers, this.fallbackArrayTextureID,
        "Maximum number of image bundles exceeded. Increase supported amount in code?");
    this.addImageInternal(left, top, width, height, samplerIdx, slice, cornerWidth, alpha);
  }

  // Add the given texture ID to the list of textures that will be used this frame.
  this.pushTextureID = function (textureID, texturesToDraw, samplersList, fallbackTextureID, limitExceededMsg) {
    let samplerIdx = 0;
    const idx = texturesToDraw.indexOf(textureID);
    if (idx === -1) {
      // This texture was not requested yet. Add it to the bind list.

      if (texturesToDraw.length >= samplersList.length) {
        // Bail out. Do not try to render an image that can't be bound to the shader.
        console.warn(limitExceededMsg);
        return;
      }
      if (textureID == null || this.loadingTextureIDs.indexOf(textureID) !== -1) {
        // The requested texture is invalid (not created or populated yet). Fallback to the default one.
        const fallbackTexIdx = texturesToDraw.indexOf(fallbackTextureID);
        samplerIdx += (fallbackTexIdx === -1) ? texturesToDraw.push(fallbackTextureID) - 1 : fallbackTexIdx;
      } else {
        samplerIdx += texturesToDraw.push(textureID) - 1;
      }
    } else {
      // This texture was already requested.
      samplerIdx += idx;
    }

    return samplerIdx;
  }

  this.addImageInternal = function (left, top, width, height, samplerIdx, slice, cornerWidth, alpha) {
    const bounds = new Rect(left, top, width, height);
    let w = this.addPrimitiveShape(CMD_IMAGE, bounds, [1.0, 1.0, 1.0, alpha], null, cornerWidth);
    // Data 3 - Shape parameters
    this.cmdData[w++] = samplerIdx;
    this.cmdData[w++] = slice;
    w+=2;

    this.cmdDataIdx = w;
  }

  this.addPrimitiveShape = function (cmdType, bounds, color, lineWidth, corner) {
    let w = this.cmdDataIdx;
    // Check for at least 4 free command slots as that's the maximum a shape might need.
    if (w/4 + 4 > MAX_CMDS) {
      console.warn("Too many shapes to draw.", w/4 + 4, "of", MAX_CMDS);
      // Overwrite the start of the command buffer.
      return 0;
    }

    // Check for a change of style and push a new style if needed.
    if (!this.stateColor.every((v, i) => v === color[i]) // Is color array different?
        || (lineWidth !== null && this.stateLineWidth !== lineWidth) // Is line width used for this shape and different?
        || (corner !== null && this.stateCorner !== corner)
    ) {
      this.stateColor = color;
      this.stateLineWidth = lineWidth !== null ? lineWidth : 1.0;
      this.stateCorner = corner !== null ? corner : 0.0;
      this.stateChanges++;

      let sw = this.styleDataIdx;
      // Data 0 - Header
      this.cmdData[sw++] = this.stateLineWidth;
      this.cmdData[sw++] = this.stateCorner;
      sw += 2; // Unused.
      // Data 1 - Color
      this.cmdData.set(this.stateColor, sw);
      sw += 4;
      this.styleDataIdx = sw;
    }

    // Data 0 - Header
    this.cmdData[w++] = cmdType;
    this.cmdData[w++] = (this.styleDataIdx - this.styleDataStartIdx - this.styleStep) / 4;
    w += 2;
    // Data 1 - Bounds
    this.cmdData[w++] = bounds.left;
    this.cmdData[w++] = bounds.top;
    this.cmdData[w++] = bounds.right;
    this.cmdData[w++] = bounds.bottom;
    this.cmdDataIdx = w;

    return w;
  }

  // Create a GPU texture object (returns the ID, usable immediately) and
  // asynchronously load the image data from the given url onto it.
  this.loadImage = function (url) {
    const gl = this.gl;
    const redrawCallback = this.redrawCallback;
    const loadingTextureIDs = this.loadingTextureIDs;

    const textureID = gl.createTexture(); // Generate texture object ID.
    gl.bindTexture(gl.TEXTURE_2D, textureID); // Create texture object with ID.
    loadingTextureIDs.push(textureID);

    // Create a JS image that asynchronously loads the given url and transfers
    // the image data to GPU once that is done.
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, textureID);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, // Mipmap level, internal format.
          gl.RGBA, gl.UNSIGNED_BYTE, image); // Source format and type.

      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const idx = loadingTextureIDs.indexOf(textureID);
      if (idx > -1) { loadingTextureIDs.splice(idx, 1); }

      // Trigger a redraw of the component view that uses this renderer.
      redrawCallback();
    }

    image.src = url;
    return textureID;
  }

  // Create a GPU texture object (returns the ID, usable immediately) and asynchronously load
  // the image data from all the given urls as slices. All images must have the same resolution
  // and can be indexed later in the order they were given.
  this.loadImageBundle = function (urls, resolution) {
    const gl = this.gl;
    const redrawCallback = this.redrawCallback;
    let loadedSlices = 0;

    // Create a texture object with the given resolution and a slice per given URL.
    // Use GPU memory of immutable size.
    console.log("Creating texture bundle (", resolution[0], "x", resolution[1], ") with", urls.length, "textures");
    const textureID = gl.createTexture(); // Generate texture object ID.
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureID); // Create texture object with ID.
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, resolution[0], resolution[1], urls.length);

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create a JS image per given URL that asynchronously loads it and transfers
    // the image data to its slice on the GPU array texture once that is done.
    for (let i = 0; i < urls.length; i++) {
      const image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureID);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0,
            0, 0, i, // 0 xy offset, start writing at slide i.
            resolution[0], resolution[1], 1, // 1 full-size slice.
            gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Trigger a redraw of the component view that uses this renderer.
        loadedSlices++;
        if (loadedSlices === urls.length) {
          redrawCallback();
        }
      }

      image.src = urls[i];
    }

    return textureID;
  }

  // Draw a frame with the current primitive commands.
  this.draw = function() {
    const gl = this.gl;

    // Set this view to occupy the full canvas.
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Bind the shader.
    gl.useProgram(this.shaderInfo.program);

    gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR]);

    // Set the transform.
    gl.uniformMatrix4fv(this.shaderInfo.uniforms.modelViewProj, false, this.transform);
    gl.uniform1f(this.shaderInfo.uniforms.vpHeight, gl.canvas.height);

    // Bind the vertex data for the shader to use and specify how to interpret it.
    // The shader works as a full size rect, new coordinates don't need to be set per frame.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.pos);
    gl.enableVertexAttribArray(this.shaderInfo.attrs.vertexPos);
    gl.vertexAttribPointer(
        this.shaderInfo.attrs.vertexPos, // Shader attribute index
        2,         // Number of elements per vertex
        gl.FLOAT,  // Data type of each element
        false,     // Normalized?
        0,         // Stride if data is interleaved
        0          // Pointer offset to start of data
    );

    // Upload the command buffer to the GPU.
    const numCmds = this.cmdDataIdx / 4;
    //console.log(numCmds, "state changes", this.stateChanges);
    gl.uniform1i(this.shaderInfo.uniforms.numCmds, numCmds);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.buffers.cmdBufferTexture);
    // Transfer commands.
    const width = Math.min(numCmds, MAX_CMD_BUFFER_LINE);
    const height = Math.ceil(numCmds / MAX_CMD_BUFFER_LINE);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, // Transfer data
      0, 0, width, height, // x,y offsets, width, height.
      gl.RGBA, gl.FLOAT, // Source format and type.
      this.cmdData);
    // Transfer styles.
    const numStyleData = (this.styleDataIdx - this.styleDataStartIdx) / 4;
    const styleWidth = Math.min(numStyleData, MAX_CMD_BUFFER_LINE);
    gl.texSubImage2D(gl.TEXTURE_2D, 0,
        0, MAX_CMD_BUFFER_LINE - 1, styleWidth, 1, // x,y offsets, width, height.
        gl.RGBA, gl.FLOAT,
        this.cmdData, this.styleDataStartIdx);
    gl.uniform1i(this.shaderInfo.uniforms.cmdBufferTex, 0); // Set shader sampler to use TextureUnit X

    // Bind the isolated textures.
    for (let i = 0; i < this.shaderInfo.uniforms.samplers.length; i++) {
      const textureUnit = 1 + i; // Note: leave unit 0 for random operations.
      const textureID = i < this.textureIDs.length ? this.textureIDs[i] : this.fallback2DTextureID;
      gl.activeTexture(gl.TEXTURE0 + textureUnit); // Set context to use TextureUnit X
      gl.bindTexture(gl.TEXTURE_2D, textureID); // Bind the texture to the active TextureUnit
      gl.uniform1i(this.shaderInfo.uniforms.samplers[i], textureUnit); // Set shader sampler to use TextureUnit X
    }
    // Bind the "bundled" textures (texture arrays).
    for (let i = 0; i < this.shaderInfo.uniforms.bundleSamplers.length; i++) {
      const textureUnit = 10 + i; // Offset from the single image samplers.
      const textureID = i < this.textureBundleIDs.length ? this.textureBundleIDs[i] : this.fallbackArrayTextureID;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureID);
      gl.uniform1i(this.shaderInfo.uniforms.bundleSamplers[i], textureUnit);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP,
        0, // Offset.
        4  // Vertex count.
    );

    // Unbind the buffers and the shader.
    gl.disableVertexAttribArray(this.shaderInfo.attrs.vertexPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    gl.useProgram(null);

    // Clear the draw list.
    this.cmdDataIdx = 0;
    this.textureIDs = [];
    this.textureBundleIDs = [];
    // Clear the state.
    this.stateColor = [-1, -1, -1, -1];
    // Clear the style list.
    this.styleDataIdx = this.styleDataStartIdx;
    this.stateChanges = 0;
  }

  // Initialize the renderer: compile the shader and setup static data.
  this.init = function (canvas) {

    // Initialize the GL context.
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      // Only continue if WebGL is available and working.
      alert('Unable to initialize WebGL. Your browser may not support WebGL2.');
      return;
    }
    this.gl = gl;

    // Load the vertex and fragment shader sources.
    const vs_source = require('./glsl/vertex.glsl');
    const fs_source = require('./glsl/fragment.glsl');

    // Load the shader code onto the GPU and compile shaders.
    const shaderProgram = init_shader_program(gl, vs_source, fs_source);

    // Collect the shader's attribute locations.
    this.shaderInfo = {
      program: shaderProgram,
      attrs: {
        vertexPos: bind_attr(gl, shaderProgram, 'v_pos'),
      },
      uniforms: {
        modelViewProj: bind_uniform(gl, shaderProgram, 'mvp'),
        vpHeight: bind_uniform(gl, shaderProgram, 'viewport_height'),
        numCmds: bind_uniform(gl, shaderProgram, 'num_cmds'),
        cmdBufferTex: bind_uniform(gl, shaderProgram, 'cmd_data'),
        samplers: [
          bind_uniform(gl, shaderProgram, 'sampler0'),
          bind_uniform(gl, shaderProgram, 'sampler1'),
          bind_uniform(gl, shaderProgram, 'sampler2'),
          bind_uniform(gl, shaderProgram, 'sampler3'),
          bind_uniform(gl, shaderProgram, 'sampler4'),
        ],
        bundleSamplers : [
          bind_uniform(gl, shaderProgram, 'bundle_sampler0'),
          bind_uniform(gl, shaderProgram, 'bundle_sampler1'),
          bind_uniform(gl, shaderProgram, 'bundle_sampler2'),
        ],
      },
      uniformBlocks: {
        cmdData: gl.getUniformBlockIndex(shaderProgram, "CmdDataBlock"),
        cmdData1: gl.getUniformBlockIndex(shaderProgram, "CmdDataBlock1"),
      },
    };

    // Create default fallback textures.
    {
      // Create 1px textures to use as fallback while the real textures are loading
      // asynchronously and for unused shader sampler binding points.
      gl.activeTexture(gl.TEXTURE0);
      const pixel_data = new Uint8Array([80, 80, 80, 210]); // Single grey pixel.
      // 2D texture.
      this.fallback2DTextureID = gl.createTexture(); // Generate texture object ID.
      gl.bindTexture(gl.TEXTURE_2D, this.fallback2DTextureID); // Create texture object with ID.
      gl.texStorage2D(gl.TEXTURE_2D, // Allocate immutable storage.
        1, // Number of mip map levels.
        gl.RGBA8, // GPU internal format.
        1, 1); // Width, height.
      gl.texSubImage2D(gl.TEXTURE_2D, 0, // Transfer data
        0, 0, 1, 1, // x,y offsets, width, height.
        gl.RGBA, gl.UNSIGNED_BYTE, // Source format and type.
          pixel_data); // Single grey pixel.
      // 2D array texture ("bundle").
      this.fallbackArrayTextureID = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.fallbackArrayTextureID);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8,
        1, 1, 1); // Width, height, slices.
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0,
          0, 0, 0, // x,y,slice offsets.
          1, 1, 1, // width, height, number of slices to write.
          gl.RGBA, gl.UNSIGNED_BYTE, pixel_data);
    }

    // Generate GPU buffer IDs that will be filled with data later for the shader to use.
    this.buffers = {
      pos: gl.createBuffer(),
      // Sadly, WebGL2 does not support Buffer Textures (no gl.texBuffer() or gl.TEXTURE_BUFFER target).
      // It doesn't support 1D textures either. We're left with a UBO or a 2D image for command data storage.
      // Chose a 2D image because it can support more data than the UBO.
      cmdBufferTexture: gl.createTexture(),
    };

    // Set the vertex positions as a full size rect. Done once, never changes.
    const positions = new Float32Array([
      1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.pos);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW); // Transfer data to GPU

    // Create the texture object to be associated with the commands buffer.
    gl.bindTexture(gl.TEXTURE_2D, this.buffers.cmdBufferTexture);
    gl.texStorage2D(gl.TEXTURE_2D, // Allocate immutable storage.
        1, // Number of mip map levels.
        gl.RGBA32F, // GPU internal format: 4x 32bit float components.
        MAX_CMD_BUFFER_LINE, MAX_CMD_BUFFER_LINE); // Width, height.
    // Disable mip mapping.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  this.init(canvas);
}


// Get the shader location of an attribute of a shader by name.
export function bind_attr(gl, program, attr_name) {
  const attr_idx = gl.getAttribLocation(program, attr_name);
  if (attr_idx === -1)
    console.error("Can not bind attribute '", attr_name, "' for shader.");
  return attr_idx;
}


// Get the shader location of an uniform of a shader by name.
export function bind_uniform(gl, program, attr_name) {
  const loc = gl.getUniformLocation(program, attr_name);
  if (loc === null)
    console.error("Can not bind uniform '", attr_name, "' for shader.");
  return loc;
}


// Initialize a shader program with th given vertex and fragment shader source code.
export function init_shader_program(gl, vs_source, fs_source) {

  const vs = load_shader(gl, gl.VERTEX_SHADER, vs_source);
  const fs = load_shader(gl, gl.FRAGMENT_SHADER, fs_source);

  // Create the shader program
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  // Check for failure
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('An error occurred compiling a shader program: ' + gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}


// Creates a shader of the given type with the given source code and compiles it.
function load_shader(gl, shader_type, source_code) {

  const shader = gl.createShader(shader_type);

  //console.log("Compiling", (shader_type===gl.VERTEX_SHADER)? "Vertex" : "Fragment", "Shader...");

  gl.shaderSource(shader, source_code);
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling a shader: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
