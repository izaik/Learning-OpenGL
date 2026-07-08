#version 330 core
out vec4 FragColor;
  
in vec2 TexCoords;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;

uniform int kernelSize;

uniform vec3 samples[64];
uniform mat4 projection;

uniform float sWidth;
uniform float sHeight;

// tile noise texture over screen, based on screen dimensions divided by noise size
vec2 noiseScale = vec2(sWidth/4.0, sHeight/4.0);

void main()
{
	vec3 fragPos   = texture(gPosition, TexCoords).xyz;
	vec3 normal    = texture(gNormal, TexCoords).rgb;
	vec3 randomVec = texture(texNoise, TexCoords * noiseScale).xyz;  

	vec3 tangent   = normalize(randomVec - normal * dot(randomVec, normal));
	vec3 bitangent = cross(normal, tangent);
	mat3 TBN       = mat3(tangent, bitangent, normal);  

	float occlusion = 0.0;
	float radius = 0.5;
	float bias = 0.025; // bias used to tweak original fragments depth value and prevent acne effects

	for(int i = 0; i < kernelSize; ++i)
	{
	    // get sample position
	    vec3 samplePos = TBN * samples[i]; // from tangent to view-space
	    samplePos = fragPos + samplePos * radius; 
	    
	    vec4 offset = vec4(samplePos, 1.0);
		offset      = projection * offset;    // from view to clip-space
		offset.xyz /= offset.w;               // perspective divide
		offset.xyz  = offset.xyz * 0.5 + 0.5; // transform to range 0.0 - 1.0  

		float sampleDepth = texture(gPosition, offset.xy).z; 

		occlusion += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0);  

		float rangeCheck = smoothstep(0.0, 1.0, radius / abs(fragPos.z - sampleDepth));
		occlusion       += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0) * rangeCheck;  

		occlusion = 1.0 - (occlusion / kernelSize);
	}  

	FragColor = vec4(occlusion, 0.0, 0.0, 1.0);
}