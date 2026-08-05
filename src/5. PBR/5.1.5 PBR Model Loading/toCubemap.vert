#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 2) in vec2 aTexCoord;

out vec3 localPos;
out vec2 TexCoords;

uniform mat4 projection;
uniform mat4 view;

void main()
{
    TexCoords = aTexCoord;
    localPos = aPos;  
    gl_Position =  projection * view * vec4(localPos, 1.0);
}