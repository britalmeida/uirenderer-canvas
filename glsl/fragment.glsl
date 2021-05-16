#version 300 es
precision highp float;

uniform highp vec4 fill_color;

out vec4 fragColor;

void main() {
    fragColor = fill_color;
}
