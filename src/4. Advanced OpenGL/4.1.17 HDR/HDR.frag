#version 330 core
out vec4 FragColor;

in vec2 TexCoords;

uniform sampler2D hdrBuffer;
uniform float exposure;
uniform float max_white;

void main()
{
	const float gamma = 2.2;
	vec3 hdrColor = texture(hdrBuffer, TexCoords).rgb;

	//reinhard
	vec3 numerator = hdrColor * (1.0f + (hdrColor / vec3(max_white * max_white)));
	vec3 mapped = numerator / (1.0f + hdrColor);

	mapped = pow(mapped, vec3(1.0 / gamma));

	FragColor = vec4(mapped, 1.0);
}