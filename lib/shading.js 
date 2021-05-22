function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}


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

  // Callback to trigger a redraw of the view component using this renderer.
  this.redrawCallback = redrawCallback;

  // Viewport transform
  this.transform = [ 1, 0, 0, 0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1];

  // Shader data
  this.shaderInfo = {};
  this.buffers = {};
  this.cmdData = new Float32Array(4092 * 4); // Pre-allocate commands of 4 floats (128 width).
  this.cmdDataIdx = 0;
  this.textureIDs = [];

  // Command types
  const CMD_LINE     = 1;
  const CMD_TRIANGLE = 2;
  const CMD_RECT     = 3;
  const CMD_FRAME    = 4;
  const CMD_IMAGE    = 5;

  // Add primitives.
  this.addRect = function (left, top, width, height, color, cornerWidth = 0) {
    const bounds = new Rect(left, top, width, height);
    let w = this.addPrimitiveShape(CMD_RECT, bounds, color);
    // Data 3 - Shape parameters
    this.cmdData[w++] = cornerWidth;
    w+=3;

    this.cmdDataIdx = w;
  }

  this.addFrame = function (left, top, width, height, lineWidth, color, cornerWidth = 0) {
    const bounds = new Rect(left, top, width, height);
    let w = this.addPrimitiveShape(CMD_FRAME, bounds, color);
    // Data 3 - Shape parameters
    this.cmdData[w++] = lineWidth;
    this.cmdData[w++] = cornerWidth;
    w+=2;

    this.cmdDataIdx = w;
  }

  this.addLine = function (p1, p2, width, color) {
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.encapsulate(p2);
    bounds.widen(Math.round(width * 0.5 + 0.01));
    let w = this.addPrimitiveShape(CMD_LINE, bounds, color);
    // Data 3 - Shape parameters
    this.cmdData[w++] = p1[0];
    this.cmdData[w++] = p1[1];
    this.cmdData[w++] = p2[0];
    this.cmdData[w++] = p2[1];
    // Data 4 - Shape parameters II
    this.cmdData[w++] = width * 0.5;
    w+=3;

    this.cmdDataIdx = w;
  }

  this.addTriangle = function (p1, p2, p3, color) {
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.encapsulate(p2);
    bounds.encapsulate(p3);
    let w = this.addPrimitiveShape(CMD_TRIANGLE, bounds, color);
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
    // Push texture GPU ID.
    if (this.textureIDs.length >= this.shaderInfo.uniforms.samplers.length) {
      console.warn("Maximum number of single images exceeded. Images need to be atlased.");
      // Bail out. Do not try to render an image that can't be bound to the shader.
      return;
    }
    if (!this.gl.isTexture(textureID)) {
      console.warn("Image texture was not created. Call uiRenderer.loadImage()");
      return;
    }
    const texture_unit = this.textureIDs.push(textureID) - 1;

    const bounds = new Rect(left, top, width, height);
    let w = this.addPrimitiveShape(CMD_IMAGE, bounds, [1.0, 1.0, 1.0, alpha]);
    // Data 3 - Shape parameters
    this.cmdData[w++] = cornerWidth;
    this.cmdData[w++] = texture_unit;
    w+=2;

    this.cmdDataIdx = w;
  }

  this.addPrimitiveShape = function (cmdType, bounds, color) {
    let w = this.cmdDataIdx;
    // Data 0 - Header
    this.cmdData[w++] = cmdType;
    w += 3;
    // Data 1 - Bounds
    this.cmdData[w++] = bounds.left;
    this.cmdData[w++] = bounds.top;
    this.cmdData[w++] = bounds.right;
    this.cmdData[w++] = bounds.bottom;
    // Data 2 - Color
    this.cmdData.set(color, w);
    w += 4;
    this.cmdDataIdx = w;
    return w;
  }

  // Create a GPU texture object (returns the ID, usable immediately) and
  // asynchronously load the image data from the given url onto it.
  this.loadImage = function (url) {
    const gl = this.gl;
    const redrawCallback = this.redrawCallback;

    const textureID = gl.createTexture(); // Generate texture object ID.
    gl.bindTexture(gl.TEXTURE_2D, textureID); // Create texture object with ID.

    // Populate the texture object with a 1px placeholder so it can be accessed while the
    // image loads (async). Use re-allocatable GPU memory as the final resolution is unknown.
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        1, 1, // width, height
        0, // border
        srcFormat, srcType,
        new Uint8Array([80, 0, 80, 255]));

    // Create a JS image that asynchronously loads the given url and transfers
    // the image data to GPU once that is done.
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, textureID);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
          srcFormat, srcType, image);

      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Trigger a redraw of the component view that uses this renderer.
      redrawCallback();
    }

    image.src = url;
    return textureID;
  }

  // Draw a frame with the current primitive commands.
  this.draw = function() {
    const gl = this.gl;

    // Set this view to occupy the full canvas.
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Bind the shader.
    gl.useProgram(this.shaderInfo.program);

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
    gl.uniform1i(this.shaderInfo.uniforms.numCmds, this.cmdDataIdx / 4);
    gl.uniform4fv(this.shaderInfo.uniforms.cmdData, this.cmdData); // Transfer data to GPU

    // Bind the textures
    for (let i = 0; i < this.textureIDs.length; i++) {
      const textureUnit = 0 + i;
      gl.activeTexture(gl.TEXTURE0 + textureUnit); // Set context to use TextureUnit X
      gl.bindTexture(gl.TEXTURE_2D, this.textureIDs[i]); // Bind the texture to the active TextureUnit
      gl.uniform1i(this.shaderInfo.uniforms.samplers[i], textureUnit); // Set shader sampler to use TextureUnit X
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP,
        0, // Offset.
        4  // Vertex count.
    );

    // Unbind the buffers and the shader.
    gl.disableVertexAttribArray(this.shaderInfo.attrs.vertexPos);
    gl.useProgram(null);

    // Clear the draw list.
    this.cmdDataIdx = 0;
    this.textureIDs = [];
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
        cmdData: bind_uniform(gl, shaderProgram, 'cmd_data'),
        samplers: [
          bind_uniform(gl, shaderProgram, 'sampler0'),
          bind_uniform(gl, shaderProgram, 'sampler1'),
          bind_uniform(gl, shaderProgram, 'sampler2'),
          bind_uniform(gl, shaderProgram, 'sampler3'),
          bind_uniform(gl, shaderProgram, 'sampler4'),
        ],
      }
    };

    // Generate GPU buffer IDs that will be filled with data later for the shader to use.
    this.buffers = {
      pos: gl.createBuffer(),
      cmdData: gl.createBuffer(),
    };

    // Set the vertex positions as a full size rect. Done once, never changes.
    const positions = new Float32Array([
      1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.pos);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW); // Transfer data to GPU
  }

  this.init(canvas);
}



// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
export function loadTexture(gl, url, cb) {

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because image loading is asynchronous,
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([80, 0, 80, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType, pixel);

  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn of mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    cb();
  };

  image.src = url;

  return texture;
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

  console.log("Compiling", (shader_type===gl.VERTEX_SHADER)? "Vertex" : "Fragment", "Shader...");

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
