// Load the vertex and fragment shader sources.
// @ts-ignore
import vs_source from '../glsl/vertex.glsl';
// @ts-ignore
import fs_source from '../glsl/fragment.glsl';

import {fontInconsolataBlobUrl} from '../assets/blobs';

// Shorthands for meaningful types.
type vec2 = [number, number];
type vec4 = [number, number, number, number];


// Representation of a rectangle for geometry operations.
class Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.left = x;
    this.right = x + w;
    this.top = y;
    this.bottom = y + h;
    this.width = w;
    this.height = h;
  }

  contains (x: number, y: number): boolean {
    return this.left <= x && x <= this.right &&
        this.top  <= y && y <= this.bottom;
  }
  intersects (other: Rect): boolean {
    return this.left <= other.right && other.left <= this.right &&
        this.top <= other.bottom && other.top <= this.bottom;
  }

  widen(val: number): void {
    this.left -= val;
    this.top -= val;
    this.width += val * 2.0;
    this.height += val * 2.0;
    this.right = this.left + this.width;
    this.bottom = this.top + this.height;
  }
  widened(val: number): Rect {
    return new Rect(this.left - val, this.top - val,
        this.width + val * 2.0, this.height + val * 2.0);
  }
  shrink(val: number): void {
    this.left += val;
    this.top += val;
    this.width -= val * 2.0;
    this.height -= val * 2.0;
    this.right = this.left + this.width;
    this.bottom = this.top + this.height;
  }

  encapsulate(point: [number, number]): void {
    this.left = Math.min(this.left, point[0]);
    this.right = Math.max(this.right, point[0]);
    this.top = Math.min(this.top, point[1]);
    this.bottom = Math.max(this.bottom, point[1]);
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;
  }
}


// 2D Coordinate system mapped in a rectangular area.
// Represents Zoom and Pan by mapping coordinates within the rectangular area to
// coordinates in the View space (e.g. [0-20] -> x2 Zoom -> [0-40]).
// The rectangular area is additionally used to clip the contents, i.e. with the
// 2x zoom and no pan, the original [0-10] are shown in the [0-20] space, while
// the original [10-20] lie outside the View window.
class View extends Rect {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;

  constructor(x: number, y: number, w: number, h: number,
              scale: [number, number], offset: [number, number]) {
    super(x, y, w, h);
    this.scaleX = scale[0];
    this.scaleY = scale[1];
    this.offsetX = offset[0];
    this.offsetY = offset[1];
  }

  getXYScale(): number {
    return Math.min(this.scaleX, this.scaleY);
  }

  // Transform a position value to this View's coordinates, in the horizontal axis.
  transformPosX(p: number): number {
    return (p - this.left - this.offsetX) * this.scaleX + this.left;
  }
  // Transform a position to this View's coordinates, in the vertical axis.
  transformPosY(p: number): number {
    return (p - this.top - this.offsetY) * this.scaleY + this.top;
  }
  // Transform a distance value to this View's coordinates, in the horizontal axis.
  transformDistX(d: number): number {
    return d * this.scaleX;
  }
  // Transform a distance value to this View's coordinates, in the vertical axis.
  transformDistY(d: number): number {
    return d * this.scaleY;
  }
  // Transform a rectangle to this View's coordinates.
  transformRect(r: Rect): Rect {
    return new Rect(
      this.transformPosX(r.left),
      this.transformPosY(r.top),
      this.transformDistX(r.width),
      this.transformDistY(r.height));
  }

  // Truncate the given rectangle to the view area (intersection).
  // The given rectangle should be in the View's coordinates.
  clampRect(r: Rect): Rect {
    return new Rect(
      Math.max(r.left, this.left),
      Math.max(r.right, this.right),
      Math.max(r.top, this.top),
      Math.max(r.bottom, this.bottom));
  }
}


// Constants shared with the shader configuration.
// Changes to these values need ot be reflected in the shader as well.

// Command types
const enum CMD {
  LINE     = 1,
  QUAD     = 2,
  RECT     = 3,
  FRAME    = 4,
  GLYPH    = 5,
  IMAGE    = 6,
  CLIP     = 9,
}

// Rendering context
const MAX_CMD_BUFFER_LINE = 512; // Note: constants are hardcoded on the shader side as well.
const MAX_CMD_DATA   = MAX_CMD_BUFFER_LINE * MAX_CMD_BUFFER_LINE;
const MAX_STYLE_CMDS = MAX_CMD_BUFFER_LINE;
const MAX_SHAPE_CMDS = MAX_CMD_DATA - MAX_STYLE_CMDS;
const TILE_SIZE = 5;            // Tile side: 32 pixels = 5 bits.
const MAX_TILES = 4 * 1024 - 1; // Must fit in the tileCmdRanges texture. +1 to fit the end index of the last tile.
const MAX_CMDS_PER_TILE = 64;
const TILE_CMDS_BUFFER_LINE = 128;


class UIRenderer {
  // Rendering context
  private gl: WebGL2RenderingContext = null;

  // Callback to trigger a redraw of the view component using this renderer.
  private readonly redrawCallback: Function;

  // Viewport transform
  private views: View[] = [];
  private viewport = {width: 1, height: 1};

  // Shader data
  private shaderInfo;
  private buffers;
  private cmdData = new Float32Array(MAX_CMD_DATA * 4); // Pre-allocate commands of 4 floats (128 width).
  private cmdDataIdx = 0;
  private glyphCacheTextureID:    WebGLTexture = null;
  private fallback2DTextureID:    WebGLTexture = null;
  private fallbackArrayTextureID: WebGLTexture = null;
  private textureIDs:             WebGLTexture[] = [];
  private textureBundleIDs:       WebGLTexture[] = [];
  private loadingTextureIDs:      WebGLTexture[] = [];
  // Tiles
  private num_tiles_x = 1;
  private num_tiles_y = 1;
  private num_tiles_n = 1;
  private cmdsPerTile = new Array(MAX_TILES); // Unpacked list of commands, indexed by tile. Used when adding shapes.
  private tileCmds = new Uint16Array(TILE_CMDS_BUFFER_LINE * TILE_CMDS_BUFFER_LINE); // Packed list of commands.
  private tileCmdRanges = new Uint16Array(MAX_TILES + 1); // Where each tile's data is in tileCmds. List of start indexes.

  // Style
  private styleDataStartIdx = (MAX_CMD_DATA - MAX_STYLE_CMDS) * 4; // Start writing style to the last cmd data texture line.
  private styleDataIdx = this.styleDataStartIdx;
  private styleStep = 2 * 4; // Number of floats that a single style needs.

  // State
  private stateColor = [-1, -1, -1, -1];
  private stateLineWidth = 1.0;
  private stateCorner = 0.0;
  private stateChanges = 0;


  constructor(canvas: HTMLCanvasElement, redrawCallback: Function) {
    this.redrawCallback = redrawCallback;
    this.init(canvas);
  }

  // Add Primitives.

  addRect(left: number, top: number, width: number, height: number, color: vec4, cornerWidth: number = 0): void {
    const bounds = new Rect(left, top, width, height);
    this.addPrimitiveShape(CMD.RECT, bounds, color, null, cornerWidth);
  }

  addFrame(left: number, top: number, width: number, height: number, lineWidth: number, color: vec4, cornerWidth: number = 0): void {
    const bounds = new Rect(left, top, width, height);
    this.addPrimitiveShape(CMD.FRAME, bounds, color, lineWidth, cornerWidth);
  }

  addLine(p1: vec2, p2: vec2, width: number, color: vec4): void {
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.encapsulate(p2);
    bounds.widen(Math.round(width * 0.5 + 0.01));
    if (this.addPrimitiveShape(CMD.LINE, bounds, color, width, null)) {
      let w = this.cmdDataIdx;
      const v = this.getView();
      // Data 2 - Shape parameters
      this.cmdData[w++] = v.transformPosX(p1[0]);
      this.cmdData[w++] = v.transformPosY(p1[1]);
      this.cmdData[w++] = v.transformPosX(p2[0]);
      this.cmdData[w++] = v.transformPosY(p2[1]);

      this.cmdDataIdx = w;
    }
  }

  addQuad(p1: vec2, p2: vec2, p3: vec2, p4: vec2, color: vec4): void {
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.encapsulate(p2);
    bounds.encapsulate(p3);
    bounds.encapsulate(p4);
    if (this.addPrimitiveShape(CMD.QUAD, bounds, color, null, null)) {
      let w = this.cmdDataIdx;
      const v = this.getView();
      // Data 2 - Shape parameters
      this.cmdData[w++] = v.transformPosX(p1[0]);
      this.cmdData[w++] = v.transformPosY(p1[1]);
      this.cmdData[w++] = v.transformPosX(p2[0]);
      this.cmdData[w++] = v.transformPosY(p2[1]);
      // Data 3 - Shape parameters II
      this.cmdData[w++] = v.transformPosX(p3[0]);
      this.cmdData[w++] = v.transformPosY(p3[1]);
      this.cmdData[w++] = v.transformPosX(p4[0]);
      this.cmdData[w++] = v.transformPosY(p4[1]);
      w += 4;

      this.cmdDataIdx = w;
    }
  }

  addTriangle(p1: vec2, p2: vec2, p3: vec2, color: vec4): void {
    // Repeat the last point, to make the triangle a quad.
    this.addQuad(p1, p2, p3, p3, color);
  }

  addDiamond(pos: vec2, width: number, height: number, color: vec4): void {
    const p1 : vec2 = [pos[0] - width * 0.5, pos[1]];
    const p2 : vec2 = [pos[0]              , pos[1] - height * 0.5];
    const p3 : vec2 = [pos[0] + width * 0.5, pos[1]];
    const p4 : vec2 = [pos[0]              , pos[1] + height * 0.5];
    this.addQuad(p1, p2, p3, p4, color);
  }

  addCircle(p1: vec2, radius: number, color: vec4): void {
    // A circle is a rectangle with very rounded corners.
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.widen(radius);
    this.addRect(bounds.left, bounds.top, bounds.width, bounds.height, color, radius);
  }

  addCircleFrame(p1: vec2, radius: number, lineWidth: number, color: vec4): void {
    // A circle is a rectangle with very rounded corners.
    let bounds = new Rect(p1[0], p1[1], 0, 0);
    bounds.widen(radius);
    this.addFrame(bounds.left, bounds.top, bounds.width, bounds.height, lineWidth, color, radius);
  }

  addText(text: string, p1: vec2, size: number, color: vec4): void {
    const monoCharWidth = size;
    let advance = 0;
    const map = ['!','"','#','$','%','&','\'','(',')','*','+',',','-','.','/','0','1','2','3','4','5','6','7','8','9',':',';','<','=','>','?','@','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','[','\\',']','^','_','`','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','{','|','}','~',' '];
    const charsPerRow = 20;

    for (const character of text) {
      if (this.addPrimitiveGlyph(p1[0], p1[1], advance, monoCharWidth, size, color)) {
        let w = this.cmdDataIdx;
        // Data 2 - Glyph selection
        const idx = map.indexOf(character);
        this.cmdData[w++] = (idx % charsPerRow); // sampler id, address, italic?
        this.cmdData[w++] = Math.floor(idx / charsPerRow);
        w += 2;

        this.cmdDataIdx = w;
      }
      advance += monoCharWidth - 8;
    }
  }

  addGlyph(glyphX: number, glyphY: number, bounds: Rect): void {

    // Skip the bounds clipping and color/style pushing. It should have been done on the calling side.

    // Write the shape command to the command buffer and add it to the tiles with which this shape overlaps.
    if (this.writeCmdToTiles(CMD.GLYPH, bounds)) {
      let w = this.cmdDataIdx;
      // Data 2 - Glyph selection
      this.cmdData[w++] = glyphX; // sampler id, address, italic?
      this.cmdData[w++] = glyphY;
      w += 2;

      this.cmdDataIdx = w;
    }
  }

  addImage(left: number, top: number, width: number, height: number, textureID: WebGLTexture, cornerWidth: number = 0, alpha: number = 1.0): void {
    // Request the texture image as in use for this frame, if not in the bind list already.
    const textureRequestIdx = this.pushTextureID(textureID, this.textureIDs);

    // Get the shader sampler ID for the standalone texture, or -1 for the loading and -2 for error textures.
    let samplerIdx = 5 + textureRequestIdx; // Standalone images start at samplerID 5.
    if (textureRequestIdx < 0) {
      samplerIdx = textureRequestIdx; // Keep loading/error indexes.
    } else if (this.textureIDs.length >= this.shaderInfo.uniforms.samplers.length) {
      console.warn("Maximum number of single images exceeded. Images need to be bundled.");
      samplerIdx = -2; // Show images out of sampler count budget as visible problems with the error texture.
    }

    // Add the image command.
    this.addImageInternal(left, top, width, height, samplerIdx, 0, cornerWidth, alpha);
  }

  addImageFromBundle(left: number, top: number, width: number, height: number, textureID: WebGLTexture, slice: number, cornerWidth: number = 0, alpha: number = 1.0): void {
    // Request the texture image as in use for this frame, if not in the bind list already.
    const textureRequestIdx = this.pushTextureID(textureID, this.textureBundleIDs);

    // Get the shader sampler ID for the bundle texture, or -1 for the loading and -2 for error textures.
    let samplerIdx = 10 + textureRequestIdx; // Bundle images start at samplerID 10.
    if (textureRequestIdx < 0) {
      samplerIdx = textureRequestIdx; // Keep loading/error indexes.
    } else if (this.textureBundleIDs.length >= this.shaderInfo.uniforms.bundleSamplers.length) {
      console.warn("Maximum number of image bundles exceeded. Increase supported amount in code?");
      samplerIdx = -2; // Show images out of sampler count budget as visible problems with the error texture.
    }

    // Add the image command.
    this.addImageInternal(left, top, width, height, samplerIdx, slice, cornerWidth, alpha);
  }

  // Internal functions to write data to the command buffers.

  // Private. Add the given texture ID to the list of textures that will be used this frame, return its index.
  pushTextureID(textureID: WebGLTexture, texturesToDraw: WebGLTexture[]): number {
    const idx = texturesToDraw.indexOf(textureID);
    if (idx === -1) {
      // This texture was not requested yet.
      if (textureID == null) {
        // The requested texture is invalid (not created?).
        // Don't push a new used texture to the bind list, we should fall back to the error one instead.
        return -2;
      } else if (this.loadingTextureIDs.indexOf(textureID) !== -1) {
        // The requested texture is still loading.
        // Don't push a new used texture to the bind list, we should fall back to the default one instead.
        return -1;
      } else {
        // Valid texture which hasn't been requested for this frame yet. Add it to the bind list.
        return texturesToDraw.push(textureID) - 1;
      }
    } else {
      // This texture was already requested.
      return idx;
    }
  }

  // Private. Helper function to add an image command, either bundled or standalone.
  addImageInternal(left: number, top: number, width: number, height: number, samplerIdx: number, slice: number, cornerWidth: number, alpha: number): void {
    const bounds = new Rect(left, top, width, height);
    if (this.addPrimitiveShape(CMD.IMAGE, bounds, [1.0, 1.0, 1.0, alpha], null, cornerWidth)) {
      let w = this.cmdDataIdx;
      // Data 2 - Shape parameters
      this.cmdData[w++] = samplerIdx;
      this.cmdData[w++] = slice;
      w += 2;

      this.cmdDataIdx = w;
    }
  }

  // Private. Write the given shape to the global command buffer and add it to the tiles with which it overlaps.
  // Returns false if it was unable to allocate the command.
  writeCmdToTiles(cmdType: CMD, bounds: Rect): boolean {

    // Get the w(rite) index for the global command buffer.
    let w = this.cmdDataIdx;
    // Check for at least 4 free command slots as that's the maximum a shape might need.
    if (w/4 + 4 > MAX_SHAPE_CMDS) {
      console.warn("Too many shapes to draw.", w/4 + 4, "of", MAX_SHAPE_CMDS);
      return false;
    }

    // Add the command index to the command list of all the tiles that might draw it.
    {
      // Get the shape´s bounds in tile index space.
      const shape_tile_start_y = Math.max(bounds.top >> TILE_SIZE, 0);
      const shape_tile_start_x = Math.max(bounds.left >> TILE_SIZE, 0);
      const shape_tile_end_x = Math.min(bounds.right >> TILE_SIZE, this.num_tiles_x - 1);
      const shape_tile_end_y = Math.min(bounds.bottom >> TILE_SIZE, this.num_tiles_y - 1);
      //console.log(cmdType, w/4, "bounds l,r,t,b:", bounds.left, bounds.right, bounds.top, bounds.bottom,
      //    "tiles l,r,t,b:", shape_tile_start_x, shape_tile_end_x, shape_tile_start_y, shape_tile_end_y)

      for (let y = shape_tile_start_y; y <= shape_tile_end_y; y++) {
        for (let x = shape_tile_start_x; x <= shape_tile_end_x; x++) {
          const tile_idx = y * this.num_tiles_x + x;
          const num_tile_cmds = ++this.cmdsPerTile[tile_idx][0];
          if (num_tile_cmds > MAX_CMDS_PER_TILE - 2) {
            console.warn("Too many shapes in a single tile");
          }
          this.cmdsPerTile[tile_idx][num_tile_cmds] = w / 4;
        }
      }
    }

    // Write the command data to the global command buffer.
    // Data 0 - Header
    this.cmdData[w++] = cmdType;
    this.cmdData[w++] = (this.styleDataIdx - this.styleDataStartIdx - this.styleStep) / 4;
    w += 2;
    // Data 1 - Bounds
    this.cmdData[w++] = bounds.left;
    this.cmdData[w++] = bounds.top;
    this.cmdData[w++] = bounds.right;
    this.cmdData[w++] = bounds.bottom;
    // Update write index
    this.cmdDataIdx = w;

    return true;
  }

  // Private. Write the given style to the global style buffer if it is different from the current active style.
  pushStyleIfNew(color: vec4, lineWidth: number | null, corner: number | null): void {

    if (!this.stateColor.every((c, i) => c === color[i]) // Is color array different?
        || (lineWidth !== null && this.stateLineWidth !== lineWidth) // Is line width used for this shape and different?
        || (corner !== null && this.stateCorner !== corner)
    ) {
      this.stateColor = color;
      this.stateLineWidth = lineWidth !== null ? lineWidth : 1.0;
      this.stateCorner = corner !== null ? corner : 0.0;
      this.stateChanges++;

      let sw = this.styleDataIdx;
      // Check for the required number of style data slots.
      if ((sw - this.styleDataStartIdx)/4 + 2 > MAX_STYLE_CMDS) {
        console.warn("Too many different styles to draw.", sw/4 + 2, "of", MAX_STYLE_CMDS);
        // Overwrite first styles.
        sw = this.styleDataStartIdx;
      }

      // Data 0 - Header
      this.cmdData[sw++] = this.stateLineWidth;
      this.cmdData[sw++] = this.stateCorner;
      sw += 2; // Unused.
      // Data 1 - Color
      this.cmdData.set(this.stateColor, sw);
      sw += 4;
      this.styleDataIdx = sw;
    }
  }

  // Private. Write the given shape and its style to the command buffers, if it is in the current view.
  addPrimitiveShape(cmdType: CMD, bounds: Rect, color: vec4, lineWidth: number, corner: number): boolean {

    // Pan and zoom the shape positioning according to the current view.
    const v = this.getView();
    bounds = v.transformRect(bounds);

    // Clip bounds.
    if (bounds.right < v.left || bounds.left > v.right
      || bounds.bottom < v.top || bounds.top > v.bottom) {
      return false;
    }

    // Check for a change of style and push a new style if needed.
    const view_scale = v.getXYScale();
    this.pushStyleIfNew(color, lineWidth * view_scale, corner * view_scale);

    // Write the shape command to the command buffer and add it to the tiles with which this shape overlaps.
    return this.writeCmdToTiles(cmdType, bounds);
  }

  // Private. Write the given shape and its style to the command buffers, if it is in the current view.
  // As this is text, pan the text with the view, but keep it fixed size.
  addPrimitiveGlyph(left: number, top: number, advance: number, width: number, height: number, color: vec4): boolean {

    // Pan the glyph according to the current view so that it moves,
    // but it keeps a fixed size instead of responding to zoom.
    const v = this.getView();
    const bounds = new Rect(v.transformPosX(left) + advance, v.transformPosY(top), width, height);

    // Clip bounds.
    if (bounds.right < v.left || bounds.left > v.right
      || bounds.bottom < v.top || bounds.top > v.bottom) {
      return false;
    }

    // Check for a change of style and push a new style if needed.
    this.pushStyleIfNew(color, null, null);

    // Write the shape command to the command buffer and add it to the tiles with which this shape overlaps.
    return this.writeCmdToTiles(CMD.GLYPH, bounds);
  }

  // Private. Add a clip command to the global command buffer.
  addClipRect(left: number, top: number, right: number, bottom: number): boolean {
    // Write clip rect information for the shader.

    // Get the w(rite) index for the global command buffer.
    let w = this.cmdDataIdx;
    // Check for the required number of free command slots.
    if (w/4 + 2 > MAX_SHAPE_CMDS) {
      console.warn("Too many shapes to draw.", w/4 + 2, "of", MAX_SHAPE_CMDS);
      return false;
    }

    // Add the command index to all the tiles. Tiles outside the clip rect bounds also need it.
    for (let y = 0; y < this.num_tiles_y; y++) {
      for (let x = 0; x < this.num_tiles_x; x++) {
        const tile_idx = y * this.num_tiles_x + x;
        const num_tile_cmds = ++this.cmdsPerTile[tile_idx][0];
        if (num_tile_cmds > MAX_CMDS_PER_TILE - 2) {
          console.warn("Too many shapes in a single tile");
          return false;
        }
        this.cmdsPerTile[tile_idx][num_tile_cmds] = w / 4;
      }
    }

    // Data 0 - Header
    this.cmdData[w++] = CMD.CLIP;
    w += 3;
    // Data 1 - Bounds
    this.cmdData[w++] = left;
    this.cmdData[w++] = top;
    this.cmdData[w++] = right;
    this.cmdData[w++] = bottom;
    this.cmdDataIdx = w;

    return true;
  }

  // Image loading from a URL to a GPU texture.

  // Create a GPU texture object (returns the ID, usable immediately) and
  // asynchronously load the image data from the given url onto it.
  loadImage(url: string): WebGLTexture {
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

      // Remove texture ID from the set known to be loading.
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
  loadImageBundle(urls: string[], resolution: vec2): WebGLTexture {
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

  // Views

  getView(): View {
    return this.views[this.views.length - 1];
  }

  pushView(x: number, y: number, w: number, h: number, scale: vec2, offset: vec2): View {
    const view = new View(x, y, w, h, scale, offset);
    this.views.push(view);
    this.addClipRect(x +1, y +1, x + w -1, y + h -1);
    return view;
  }

  popView(): void {
    this.views.pop();
    const v = this.getView();
    if (v) { this.addClipRect(v.left, v.top, v.right, v.bottom); }
    else { this.addClipRect(0, 0, this.viewport.width, this.viewport.height); }
  }

  // Render Loop

  // Initialize the state for a new frame
  beginFrame(): void {
    // Cache the viewport size and number of tiles for this frame.
    this.viewport.width = this.gl.canvas.width;
    this.viewport.height = this.gl.canvas.height;

    this.num_tiles_x = (this.viewport.width >> TILE_SIZE) + 1;
    this.num_tiles_y = (this.viewport.height >> TILE_SIZE) + 1;
    this.num_tiles_n = this.num_tiles_x * this.num_tiles_y;
    if (this.num_tiles_n > MAX_TILES) {
      console.warn("Too many tiles: ",
          this.num_tiles_n, "(", this.num_tiles_x, "x", this.num_tiles_y, "). Max is", MAX_TILES);
    }
    //console.log("vp", this.viewport.width, "x" ,this.viewport.height, "px. tiles", this.num_tiles_x, "x", this.num_tiles_y, "=", this.num_tiles_n);

    // Clear the command ranges for each tile that will be used this frame.
    for (let i = 0; i < this.num_tiles_n + 1; i++) {
      this.tileCmdRanges[i] = 0;
    }
    // Clear the commands and allocate space for each tile that will be used this frame.
    for (let i = 0; i < this.num_tiles_n; i++) {
      this.cmdsPerTile[i] = new Uint16Array(MAX_CMDS_PER_TILE);
    }

    // Push a fallback full-canvas view with no scale and no offset.
    this.pushView(0, 0, this.viewport.width, this.viewport.height, [1, 1], [0, 0]);
  }

  // Draw a frame with the current primitive commands.
  draw(): void {
    const gl = this.gl;

    // Set this view to occupy the full canvas.
    gl.viewport(0, 0, this.viewport.width, this.viewport.height);

    // Bind the shader.
    gl.useProgram(this.shaderInfo.program);

    gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR]);

    // Set the transform.
    gl.uniform2f(this.shaderInfo.uniforms.vpSize, this.viewport.width, this.viewport.height);

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

    // Transfer texture data and bind to the shader samplers.
    // Note: sampler indexes are hardcoded in the shader's sample_texture().
    let textureUnit = 0;

    // Upload the command buffers to the GPU.
    {
      const numCmds = this.cmdDataIdx / 4;
      //console.log(numCmds, "commands, state changes:", this.stateChanges);

      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.buffers.cmdBufferTexture);
      // Transfer commands.
      let width = Math.min(numCmds, MAX_CMD_BUFFER_LINE);
      let height = Math.ceil(numCmds / MAX_CMD_BUFFER_LINE);
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
      gl.uniform1i(this.shaderInfo.uniforms.cmdBufferTex, textureUnit++); // Set shader sampler to use TextureUnit X

      // Pack the commands per tile.
      // Flatten each tile command list into a single array. Store the start of each tile command list in tileCmdRanges.
      let tileCmdIdx = 0;
      for (let ti = 0; ti < this.num_tiles_n; ti++) {
        this.tileCmdRanges[ti] = tileCmdIdx;
        for (let i = 0; i < this.cmdsPerTile[ti][0]; i++) {
          this.tileCmds[tileCmdIdx++] = this.cmdsPerTile[ti][i + 1];
        }
      }
      this.tileCmdRanges[this.num_tiles_n] = tileCmdIdx;

      // Transfer commands per tile
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.buffers.tileCmdsTexture);
      width = Math.min(tileCmdIdx, TILE_CMDS_BUFFER_LINE);
      height = Math.ceil(tileCmdIdx / TILE_CMDS_BUFFER_LINE);
      gl.texSubImage2D(gl.TEXTURE_2D, 0,
          0, 0, width, height, // x,y offsets, width, height.
          gl.RED_INTEGER, gl.UNSIGNED_SHORT,
          this.tileCmds);
      gl.uniform1i(this.shaderInfo.uniforms.tileCmdsBufferTex, textureUnit++);

      width = Math.min(this.num_tiles_n, MAX_TILES) + 1;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.buffers.tileCmdRangesTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0,
          0, 0, width, 1, // x,y offsets, width, height.
          gl.RED_INTEGER, gl.UNSIGNED_SHORT,
          this.tileCmdRanges);
      gl.uniform1i(this.shaderInfo.uniforms.tileCmdRangesBufferTex, textureUnit++);
    }

    // Bind the glyph cache.
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphCacheTextureID);
    gl.uniform1i(this.shaderInfo.uniforms.textGlyphSampler, textureUnit++);

    // Bind the isolated textures.
    textureUnit = 5;
    for (let i = 0; i < this.shaderInfo.uniforms.samplers.length; i++) {
      const textureID = i < this.textureIDs.length ? this.textureIDs[i] : this.fallback2DTextureID;
      gl.activeTexture(gl.TEXTURE0 + textureUnit); // Set context to use TextureUnit X
      gl.bindTexture(gl.TEXTURE_2D, textureID); // Bind the texture to the active TextureUnit
      gl.uniform1i(this.shaderInfo.uniforms.samplers[i], textureUnit++); // Set shader sampler to use TextureUnit X
    }
    // Bind the "bundled" textures (texture arrays).
    for (let i = 0; i < this.shaderInfo.uniforms.bundleSamplers.length; i++) {
      const textureID = i < this.textureBundleIDs.length ? this.textureBundleIDs[i] : this.fallbackArrayTextureID;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureID);
      gl.uniform1i(this.shaderInfo.uniforms.bundleSamplers[i], textureUnit++);
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
    this.views = [];
    this.stateColor = [-1, -1, -1, -1];
    // Clear the style list.
    this.styleDataIdx = this.styleDataStartIdx;
    this.stateChanges = 0;
  }

  // Initialize the renderer: compile the shader and setup static data.
  init(canvas: HTMLCanvasElement): void {

    // Initialize the GL context.
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      // Only continue if WebGL is available and working.
      alert('Unable to initialize WebGL. Your browser may not support WebGL2.');
      return;
    }
    this.gl = gl;



    // Load the shader code onto the GPU and compile shaders.
    const shaderProgram = init_shader_program(gl, vs_source, fs_source);

    // Collect the shader's attribute locations.
    this.shaderInfo = {
      program: shaderProgram,
      attrs: {
        vertexPos: bind_attr(gl, shaderProgram, 'v_pos'),
      },
      uniforms: {
        vpSize: bind_uniform(gl, shaderProgram, 'viewport_size'),
        cmdBufferTex: bind_uniform(gl, shaderProgram, 'cmd_data'),
        tileCmdRangesBufferTex: bind_uniform(gl, shaderProgram, 'tile_cmd_ranges'),
        tileCmdsBufferTex: bind_uniform(gl, shaderProgram, 'tile_cmds'),
        textGlyphSampler: bind_uniform(gl, shaderProgram, 'text_glyph_sampler'),
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
      // Create 1px textures to use as fallback for unused shader sampler binding points.
      // These textures should never show. If they do, we are using an unused shader sampler?
      gl.activeTexture(gl.TEXTURE0);
      const pixel_data = new Uint8Array([0, 180, 20, 210]); // Single green pixel.

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
        pixel_data); // Single green pixel.

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

    // Create the Glyph Cache
    {
      gl.activeTexture(gl.TEXTURE0);
      this.glyphCacheTextureID = this.loadImage(fontInconsolataBlobUrl);
    }

    // Generate GPU buffer IDs that will be filled with data later for the shader to use.
    this.buffers = {
      pos: gl.createBuffer(),
      // Sadly, WebGL2 does not support Buffer Textures (no gl.texBuffer() or gl.TEXTURE_BUFFER target).
      // It doesn't support 1D textures either. We're left with a UBO or a 2D image for command data storage.
      // Chose a 2D image because it can support more data than the UBO.
      cmdBufferTexture: gl.createTexture(),
      tileCmdRangesTexture: gl.createTexture(),
      tileCmdsTexture: gl.createTexture(),
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
    disableMipMapping(gl);

    // Create the texture object to be associated with the tile ranges buffer.
    gl.bindTexture(gl.TEXTURE_2D, this.buffers.tileCmdRangesTexture);
    gl.texStorage2D(gl.TEXTURE_2D, // Allocate immutable storage.
      1, // Number of mip map levels.
      gl.R16UI, // GPU internal format: 16bit unsigned integer components.
      MAX_TILES + 1, 1); // Width, height.
    disableMipMapping(gl);

    // Create the texture object to be associated with the tile commands buffer.
    gl.bindTexture(gl.TEXTURE_2D, this.buffers.tileCmdsTexture);
    gl.texStorage2D(gl.TEXTURE_2D, // Allocate immutable storage.
      1, // Number of mip map levels.
      gl.R16UI, // GPU internal format: 16bit unsigned integer components.
      TILE_CMDS_BUFFER_LINE, TILE_CMDS_BUFFER_LINE); // Width, height.
    disableMipMapping(gl);
  }
}


function disableMipMapping(gl) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// Get the shader location of an attribute of a shader by name.
function bind_attr(gl, program, attr_name): GLint {
  const attr_idx = gl.getAttribLocation(program, attr_name);
  if (attr_idx === -1)
    console.error("Can not bind attribute '", attr_name, "' for shader.");
  return attr_idx;
}


// Get the shader location of an uniform of a shader by name.
function bind_uniform(gl, program, attr_name): GLint {
  const loc = gl.getUniformLocation(program, attr_name);
  if (loc === null)
    console.error("Can not bind uniform '", attr_name, "' for shader.");
  return loc;
}


// Initialize a shader program with th given vertex and fragment shader source code.
function init_shader_program(gl, vs_source, fs_source): WebGLProgram | null {

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


export { Rect, View, UIRenderer }
