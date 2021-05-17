#version 300 es

in vec2 v_pos;
uniform mat4 mvp;

void main() {
  gl_Position = mvp * vec4(v_pos, 0.0, 1.0);
}
