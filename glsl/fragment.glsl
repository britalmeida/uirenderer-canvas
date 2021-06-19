#version 300 es
precision highp float;
precision highp sampler2DArray;

// Command types
const int CMD_LINE     = 1;
const int CMD_TRIANGLE = 2;
const int CMD_RECT     = 3;
const int CMD_FRAME    = 4;
const int CMD_IMAGE    = 5;

// Inputs
uniform float viewport_height;
uniform int num_cmds;
uniform sampler2D cmd_data;

uniform sampler2DArray bundle_sampler0;
uniform sampler2DArray bundle_sampler1;
uniform sampler2DArray bundle_sampler2;
uniform sampler2D sampler0;
uniform sampler2D sampler1;
uniform sampler2D sampler2;
uniform sampler2D sampler3;
uniform sampler2D sampler4;

out vec4 fragColor;

// Helpers

float scalar_triple_product(vec2 a, vec2 b, vec3 c) {
  vec3 base_normal = vec3(0.0, 0.0, a.x * b.y - a.y * b.x); // cross(a, b)
  return dot(base_normal, c);
}
float dot2(vec2 v) { return dot(v, v); }
float dot2(vec3 v) { return dot(v, v); }

vec4 get_cmd_data(int data_idx) {
  ivec2 tex_coord = ivec2(data_idx % 512, int(data_idx / 512));
  return texelFetch(cmd_data, tex_coord, 0);
}

vec4 get_style_data(int style_idx) {
  ivec2 tex_coord = ivec2(style_idx % 512, 511);
  return texelFetch(cmd_data, tex_coord, 0);
}

vec4 sample_texture(int sampler_ID, vec2 tex_coord, float slice) {
  if      (sampler_ID == 0) return texture(sampler0, tex_coord);
  else if (sampler_ID == 1) return texture(sampler1, tex_coord);
  else if (sampler_ID == 2) return texture(sampler2, tex_coord);
  else if (sampler_ID == 3) return texture(sampler3, tex_coord);
  else if (sampler_ID == 4) return texture(sampler4, tex_coord);
  else if (sampler_ID == 10) return texture(bundle_sampler0, vec3(tex_coord.x, tex_coord.y, slice));
  else if (sampler_ID == 11) return texture(bundle_sampler1, vec3(tex_coord.x, tex_coord.y, slice));
  else if (sampler_ID == 12) return texture(bundle_sampler2, vec3(tex_coord.x, tex_coord.y, slice));
  return texture(sampler0, tex_coord);
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

// Calculate distance to a triangle defined by the given points.
float dist_to_triangle(vec2 pos, vec2 a, vec2 b, vec2 c) {
  vec2 ab = b - a; vec2 ap = pos - a;
  vec2 bc = c - b; vec2 bp = pos - b;
  vec2 ca = a - c; vec2 cp = pos - c;
  vec3 nor = vec3(0.0, 0.0, ab.x * ca.y - ab.y * ca.x); // cross(ab, ca)

  return sqrt(
    ( sign(scalar_triple_product(ap, ab, nor)) +
      sign(scalar_triple_product(bp, bc, nor)) +
      sign(scalar_triple_product(cp, ca, nor)) < 2.0
    ) ?
        min(min(
          dot2(ab * clamp(dot(ab,ap)/dot2(ab), 0.0,1.0) - ap),
          dot2(bc * clamp(dot(bc,bp)/dot2(bc), 0.0,1.0) - bp)),
          dot2(ca * clamp(dot(ca,cp)/dot2(ca), 0.0,1.0) - cp))
      : 0.0f // 2D case
  );
}

// Calculate distance to a rectangle with round corners.
float dist_to_round_rect(vec2 pos, vec4 rect, float corner_radius) {
  // Divide the rectangle in quadrants and calculate the distance from the given
  // fragment's position to the center. First pad with the corner size and then
  // take that from the resulting distance.
  vec2 mid = vec2((rect.x + rect.z), (rect.y + rect.w)) * 0.5;
  float dist_x = (pos.x < mid.x) ? (rect.x - pos.x) : (pos.x - rect.z);
  float dist_y = (pos.y < mid.y) ? (rect.y - pos.y) : (pos.y - rect.w);

  // Clamp to zero so that any point inside the rect has distance 0.
  dist_x = max(dist_x + corner_radius, 0.0);
  dist_y = max(dist_y + corner_radius, 0.0);
  return sqrt(dist_x*dist_x + dist_y*dist_y) - corner_radius;
}


void main() {
  // OpenGL provides the fragment coordinate in pixels where (0,0) is bottom-left.
  // Because the renderer and client UI code has (0,0) top-left, flip the y.
  // Use pixel top-left coordinates instead of center. (0.5, 0.5) -> (0.0, 0.0)
  vec2 frag_coord = vec2(gl_FragCoord.x, viewport_height - gl_FragCoord.y);
  frag_coord -= 0.5;

  // Default fragment background color and opacity.
  // Will be overwritten if this pixel is determined to be inside shapes.
  vec3 px_color = vec3(0.18, 0.18, 0.18);
  float px_alpha = 1.0;

  // Process the commands with the procedural shape definitions in order.
  // Check if this pixel is inside (or partially inside) each shape and update its color.
  int data_idx = 0;
  while (data_idx < num_cmds) {

    vec4 cmd = get_cmd_data(data_idx++);
    int cmd_type = int(cmd[0]);
    int style_idx = int(cmd[1]);

    vec4 style = get_style_data(style_idx);
    float line_width = style[0];
    float corner_radius = style[1];
    vec4 shape_color = get_style_data(style_idx+1);
    vec4 shape_bounds = get_cmd_data(data_idx++);

    vec2 clip_clamp = vec2(
      clamp(frag_coord.x, shape_bounds.x, shape_bounds.z),
      clamp(frag_coord.y, shape_bounds.y, shape_bounds.w));
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

    } else if (cmd_type == CMD_TRIANGLE) {

      vec4 shape_def1 = get_cmd_data(data_idx++);
      vec4 shape_def2 = get_cmd_data(data_idx++);
      if (clip_dist > 1.0) continue;

      shape_dist = dist_to_triangle(frag_coord, vec2(shape_def1.xy), vec2(shape_def1.zw), vec2(shape_def2.xy));

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
