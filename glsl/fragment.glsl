#version 300 es
precision highp float;
precision highp usampler2D;
precision highp sampler2D;
precision highp sampler2DArray;

// Command types
const int CMD_LINE     = 1;
const int CMD_QUAD     = 2;
const int CMD_RECT     = 3;
const int CMD_FRAME    = 4;
const int CMD_GLYPH    = 5;
const int CMD_IMAGE    = 6;
const int CMD_CLIP     = 9;

// Constants
const int TILE_SIZE    = 5; // 5bits = 32px
const int CMD_DATA_BUFFER_LINE = 512;
const int TILE_CMDS_BUFFER_LINE = 128;
const int TILES_CMD_RANGE_BUFFER_LINE = 4 * 1024; // Single line, addresses all possible tiles.

// Inputs
uniform vec2 viewport_size;
uniform sampler2D cmd_data; // 'Global' buffer with all the shape and style commands
uniform usampler2D tile_cmds; // Commands per tile: packed sequence of cmd_data indexes, one tile after the other.
uniform usampler2D tile_cmd_ranges; // Where each tile's data is in tile_cmds. List of start indexes.

// Textures
uniform sampler2D text_glyph_sampler;
uniform sampler2DArray bundle_sampler0;
uniform sampler2DArray bundle_sampler1;
uniform sampler2DArray bundle_sampler2;
uniform sampler2D sampler0;
uniform sampler2D sampler1;
uniform sampler2D sampler2;
uniform sampler2D sampler3;
uniform sampler2D sampler4;

// Color output
out vec4 fragColor;

// Helpers

float scalar_triple_product(vec2 a, vec2 b, vec3 c) {
  vec3 base_normal = vec3(0.0, 0.0, a.x * b.y - a.y * b.x); // cross(a, b)
  return dot(base_normal, c);
}
float dot2(vec2 v) { return dot(v, v); }
float dot2(vec3 v) { return dot(v, v); }

vec4 get_cmd_data(int data_idx) {
  ivec2 tex_coord = ivec2(data_idx % CMD_DATA_BUFFER_LINE, int(data_idx / CMD_DATA_BUFFER_LINE));
  return texelFetch(cmd_data, tex_coord, 0);
}

vec4 get_style_data(int style_idx) {
  ivec2 tex_coord = ivec2(style_idx % CMD_DATA_BUFFER_LINE, CMD_DATA_BUFFER_LINE-1);
  return texelFetch(cmd_data, tex_coord, 0);
}

uint get_cmd_data_idx(int tile_cmd_idx) {
  ivec2 tex_coord = ivec2(tile_cmd_idx % TILE_CMDS_BUFFER_LINE, int(tile_cmd_idx / TILE_CMDS_BUFFER_LINE));
  return texelFetch(tile_cmds, tex_coord, 0).r;
}

uint get_tile_cmd_range_start(int tile_idx) {
  ivec2 tex_coord = ivec2(tile_idx % TILES_CMD_RANGE_BUFFER_LINE, 0);
  return texelFetch(tile_cmd_ranges, tex_coord, 0).r;
}

vec4 sample_texture(int sampler_ID, vec2 tex_coord, float slice) {
  if      (sampler_ID == -2) return vec4(0.3, 0.3, 0.3, 0.8); // Grey fallback texture while images are still loading.
  else if (sampler_ID == -1) return vec4(0.7, 0.0, 0.3, 0.9); // Pink error texture for visibility when something went wrong.
  else if (sampler_ID == 5) return texture(sampler0, tex_coord);
  else if (sampler_ID == 6) return texture(sampler1, tex_coord);
  else if (sampler_ID == 7) return texture(sampler2, tex_coord);
  else if (sampler_ID == 8) return texture(sampler3, tex_coord);
  else if (sampler_ID == 9) return texture(sampler4, tex_coord);
  else if (sampler_ID == 10) return texture(bundle_sampler0, vec3(tex_coord.x, tex_coord.y, slice));
  else if (sampler_ID == 11) return texture(bundle_sampler1, vec3(tex_coord.x, tex_coord.y, slice));
  else if (sampler_ID == 12) return texture(bundle_sampler2, vec3(tex_coord.x, tex_coord.y, slice));
  return vec4(0.8, 0.0, 0.3, 0.9); // Visibly show attempted usage of unknown sampler_ID.
}

// SDF functions for parametric shapes
// based on https://iquilezles.org/www/articles/distfunctions/distfunctions.htm

// Calculate distance to a line defined by the given points.
float dist_to_line(vec2 pos, vec2 p1, vec2 p2, float line_radius) {
  vec2 v = (p2 - p1); // Direction along the line segment.
  vec2 u = (pos - p1); // Vector from one of the line segment tips to the query point.
  float h = clamp(dot(u, v) / dot(v, v), 0.0, 1.0);
  return length(u - v * h) - line_radius + 0.5;
}

// Calculate distance to a quadrilateral polygon defined by the given points.
float dist_to_quad(vec2 pos, vec2 a, vec2 b, vec2 c, vec2 d) {
  vec2 ab = b - a; vec2 ap = pos - a;
  vec2 bc = c - b; vec2 bp = pos - b;
  vec2 cd = d - c; vec2 cp = pos - c;
  vec2 da = a - d; vec2 dp = pos - d;
  vec3 nor = vec3(0.0, 0.0, ab.x * da.y - ab.y * da.x); // cross(ab, da)

  return sqrt(
    ( sign(scalar_triple_product(ap, ab, nor)) +
      sign(scalar_triple_product(bp, bc, nor)) +
      sign(scalar_triple_product(cp, cd, nor)) +
      sign(scalar_triple_product(dp, da, nor)) < 3.0
    ) ?
        min(min(min(
          dot2(ab * clamp(dot(ab,ap)/dot2(ab), 0.0, 1.0) - ap),
          dot2(bc * clamp(dot(bc,bp)/dot2(bc), 0.0, 1.0) - bp)),
          dot2(cd * clamp(dot(cd,cp)/dot2(cd), 0.0, 1.0) - cp)),
          dot2(da * clamp(dot(da,dp)/dot2(da), 0.0, 1.0) - dp))
      : 0.0f // 2D case. Clamp to zero so that any point inside the quad has distance 0.
  );
}

// Calculate distance to a rectangle with round corners.
float dist_to_round_rect(vec2 pos, vec4 rect, float corner_radius) {
  // Divide the rectangle in quadrants and calculate the distance from the given
  // fragment's position to the center.
  vec2 mid = vec2((rect.x + rect.z), (rect.y + rect.w)) * 0.5;
  float dist_x = (pos.x < mid.x) ? (rect.x - pos.x) : (pos.x - rect.z);
  float dist_y = (pos.y < mid.y) ? (rect.y - pos.y) : (pos.y - rect.w);

  // First pad with the corner size and then take that from the resulting distance.
  // Clamp to zero so that any point inside the rect has distance 0.
  dist_x = max(dist_x + corner_radius, 0.0);
  dist_y = max(dist_y + corner_radius, 0.0);
  return sqrt(dist_x*dist_x + dist_y*dist_y) - corner_radius;
}


void main() {
  // OpenGL provides the fragment coordinate in pixels where (0,0) is bottom-left.
  // Because the renderer and client UI code has (0,0) top-left, flip the y.
  // Use pixel top-left coordinates instead of center. (0.5, 0.5) -> (0.0, 0.0)
  vec2 frag_coord = vec2(gl_FragCoord.x, viewport_size.y - gl_FragCoord.y);
  frag_coord -= 0.5;

  // Default fragment background color and opacity.
  // Will be overwritten if this pixel is determined to be inside shapes.
  vec3 px_color = vec3(0.1, 0.1, 0.1);
  float px_alpha = 1.0;

  vec4 view_clip_rect = vec4(0, 0, viewport_size.x, viewport_size.y);

  // Get the shape commands that overlap the tile where this pixel is.
  int num_tiles_x = (int(viewport_size.x) >> TILE_SIZE) + 1;
  int num_tiles_y = (int(viewport_size.y) >> TILE_SIZE) + 1;
  int num_tiles = num_tiles_x * num_tiles_y;
  int tile_x = int(frag_coord.x) >> TILE_SIZE;
  int tile_y = int(frag_coord.y) >> TILE_SIZE;
  int tile_n = tile_y * num_tiles_x + tile_x;
  int tile_cmds_idx = int(get_tile_cmd_range_start(tile_n));
  int tile_cmds_end = int(get_tile_cmd_range_start(tile_n + 1));

  // Process the commands with the procedural shape definitions in order.
  // Check if this pixel is inside (or partially inside) each shape and update its color.
  while (tile_cmds_idx < tile_cmds_end) {
    int data_idx = int(get_cmd_data_idx(tile_cmds_idx++));
    vec4 cmd = get_cmd_data(data_idx++);
    int cmd_type = int(cmd[0]);
    int style_idx = int(cmd[1]);

    if (cmd_type == CMD_CLIP) {
      view_clip_rect = get_cmd_data(data_idx++);
      continue;
    }

    vec4 style = get_style_data(style_idx);
    float line_width = style[0];
    float corner_radius = style[1];
    vec4 shape_color = get_style_data(style_idx+1);
    vec4 shape_bounds = get_cmd_data(data_idx++);

    // Get the intersection of the shape bounds and the clip rect.
    vec4 clip_rect = vec4(
      max(shape_bounds.x, view_clip_rect.x),
      max(shape_bounds.y, view_clip_rect.y),
      min(shape_bounds.z, view_clip_rect.z),
      min(shape_bounds.w, view_clip_rect.w)
    );
    // Check if this pixel is within the area where it may draw.
    vec2 clip_clamp = vec2(
      clamp(frag_coord.x, clip_rect.x, clip_rect.z),
      clamp(frag_coord.y, clip_rect.y, clip_rect.w));
    // clip_dist: 0 = not clipped,
    //            ]0,1[ sub-pixel clipping (shape is not aligned pixel perfect)
    //            [1,...[ clipped
    float clip_dist = distance(clip_clamp, frag_coord.xy);
    // Note: don't clip yet, we need to consume the rest of the data for this shape.

    // Consume the rest of the shape's data, and (if close enough to the shape's area bounds)
    // compute the distance from this pixel to the shape. (0 = inside, 1 = completely outside).
    float shape_dist = 0.0;

    if (cmd_type == CMD_LINE) {

      vec4 shape_def1 = get_cmd_data(data_idx++);
      if (clip_dist > 1.0) continue;

      float line_radius = line_width * 0.5;
      shape_dist = dist_to_line(frag_coord, vec2(shape_def1.xy), vec2(shape_def1.zw), line_radius);

    } else if (cmd_type == CMD_QUAD) {

      vec4 shape_def1 = get_cmd_data(data_idx++);
      vec4 shape_def2 = get_cmd_data(data_idx++);
      if (clip_dist > 1.0) continue;

      shape_dist = dist_to_quad(frag_coord, vec2(shape_def1.xy), vec2(shape_def1.zw), vec2(shape_def2.xy), vec2(shape_def2.zw));

    } else if (cmd_type == CMD_RECT) {

      if (clip_dist > 1.0) continue;

      // The actual rect is 1px smaller than the bounds, aligned top-left.
      // e.g. for rect defined left=2, right=5 => width=3, pixel coverage= 2,3,4.
      vec4 rect = vec4(shape_bounds.x, shape_bounds.y, shape_bounds.z - 1.0, shape_bounds.w - 1.0);
      shape_dist = dist_to_round_rect(frag_coord, rect, corner_radius);

    } else if (cmd_type == CMD_FRAME) {

      if (clip_dist > 1.0) continue;

      float inner_corner_radius = max(corner_radius - line_width, 0.0);
      vec4 outer_rect = vec4(shape_bounds.x, shape_bounds.y, shape_bounds.z - 1.0, shape_bounds.w - 1.0);
      vec4 inner_rect = vec4(
        shape_bounds.x + line_width,
        shape_bounds.y + line_width,
        shape_bounds.z - line_width - 1.0,
        shape_bounds.w - line_width - 1.0
      );
      float dist_to_outer_rect = dist_to_round_rect(frag_coord, outer_rect, corner_radius);
      float dist_to_inner_rect = dist_to_round_rect(frag_coord, inner_rect, inner_corner_radius);
      shape_dist = max(dist_to_outer_rect, 1.0 - dist_to_inner_rect);

    } else if (cmd_type == CMD_GLYPH) {

      vec4 glyph_def = get_cmd_data(data_idx++);
      if (clip_dist > 1.0) continue;

      // Shape is the same as the rectangle with rounded corners.
      vec4 rect = vec4(shape_bounds.x, shape_bounds.y, shape_bounds.z - 1.0, shape_bounds.w - 1.0);
      shape_dist = dist_to_round_rect(frag_coord, rect, 0.0);

      // Color of each fragment is given by a glyph atlas texture lookup.
      vec2 cmd_rect_coord = vec2(
        (frag_coord.x - rect.x) / (rect.z - rect.x),
        (frag_coord.y - rect.y) / (rect.w - rect.y));

      vec2 glyph_idx = vec2(glyph_def[0], glyph_def[1]);
      float glyph_px_size = 24.0;
      vec2 glyph_atlas_size = vec2(480.0, 120.0);
      vec2 glyph_size_in_atlas = glyph_px_size / glyph_atlas_size;

      vec2 tex_coord = (glyph_idx + cmd_rect_coord) * glyph_size_in_atlas;

      float alpha = shape_color.a;
      shape_color = texture(text_glyph_sampler, tex_coord);
      shape_color.a *= alpha;

    } else if (cmd_type == CMD_IMAGE) {

      vec4 shape_def = get_cmd_data(data_idx++);
      if (clip_dist > 1.0) continue;

      // Shape is the same as the rectangle with rounded corners.
      vec4 rect = vec4(shape_bounds.x, shape_bounds.y, shape_bounds.z - 1.0, shape_bounds.w - 1.0);
      shape_dist = dist_to_round_rect(frag_coord, rect, corner_radius);

      // Color of each fragment is given by a texture lookup.
      float alpha = shape_color.a;
      int sampler_idx = int(shape_def[0]);
      float slice = shape_def[1]; // Used for texture arrays only.
      vec2 tex_coord = vec2(
        (frag_coord.x - rect.x) / (rect.z - rect.x),
        (frag_coord.y - rect.y) / (rect.w - rect.y));
      shape_color = sample_texture(sampler_idx, tex_coord, slice);
      shape_color.a *= alpha;

    }

    float shape_coverage_mask = clamp(1.0 - shape_dist, 0.0, 1.0);

    // Mix the contribution of this shape into the final pixel color.
    float shape_alpha = shape_color.a * shape_coverage_mask;
    px_alpha = shape_alpha + px_alpha * (1.0 - shape_alpha);
    px_color = mix(px_color, shape_color.rgb, shape_alpha);

    // Process next shape.
  }

  fragColor = vec4(px_color, px_alpha);

  /*
  // Debug print the command texture
  ivec2 tex_coord = ivec2(frag_coord.x, frag_coord.y);
  vec4 texel = texelFetch(cmd_data, tex_coord, 0);
  fragColor = vec4(texel.x/1.0, texel.y/1.0, texel.z/1.0, 1.0);
  */
}
