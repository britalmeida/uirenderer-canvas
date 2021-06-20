#version 300 es

in vec2 v_pos;

void main() {
  gl_Position = vec4(v_pos, 0.0, 1.0);
}
