#version 330 core
out vec4 FragColor;
in vec2 TexCoords;
in vec3 WorldPos;
in vec3 Normal;

uniform vec3 camPos;

// material information
uniform sampler2D texture_albedo1;
uniform sampler2D texture_normal1;
uniform sampler2D texture_metalness1;
uniform sampler2D texture_roughness1;
uniform sampler2D texture_ao1;

// lights
struct Light {
    vec3 Position;
    vec3 Color;
};
const int NR_LIGHTS = 32;
uniform Light lights[NR_LIGHTS];

// ibl
uniform samplerCube irradianceMap;
uniform samplerCube prefilterMap;
uniform sampler2D brdfLUT;

const float PI = 3.14159265359;

vec3 getNormalFromMap()
{
    vec3 tangentNormal = texture(texture_normal1, TexCoords).xyz * 2.0 - 1.0;

    vec3 Q1  = dFdx(WorldPos);
    vec3 Q2  = dFdy(WorldPos);
    vec2 st1 = dFdx(TexCoords);
    vec2 st2 = dFdy(TexCoords);

    vec3 N   = normalize(Normal);
    vec3 T  = normalize(Q1*st2.t - Q2*st1.t);
    vec3 B  = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}  

float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a      = roughness*roughness;
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;
	
    float num   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
	
    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float num   = NdotV;
    float denom = NdotV * (1.0 - k) + k;
	
    return num / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2  = GeometrySchlickGGX(NdotV, roughness);
    float ggx1  = GeometrySchlickGGX(NdotL, roughness);
	
    return ggx1 * ggx2;
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}   


void main()
{
    vec3 albedo = pow(texture(texture_albedo1, TexCoords).rgb, vec3(2.2));
    vec3 normal = getNormalFromMap();
    float metallic = texture(texture_metalness1, TexCoords).r;
    float roughness = texture(texture_roughness1, TexCoords).r;
    float ao = texture(texture_ao1, TexCoords).r;

	vec3 N = normalize(Normal);
	vec3 V = normalize(camPos - WorldPos);
    vec3 R = reflect(-V, N); 

    vec3 F0 = vec3(0.04); 
	F0      = mix(F0, albedo, metallic);

    // reflectance equation
	vec3 Lo = vec3(0.0);
	for(int i = 0; i < NR_LIGHTS; ++i)
	{
        // calculate per light radiance
		vec3 L = normalize(lights[i].Position - WorldPos);
		vec3 H = normalize(V + L);
		float distance    = length(lights[i].Position - WorldPos);
		float attenuation = 1.0 / (distance * distance);
		vec3 radiance     = lights[i].Color * attenuation;

        // cook-torrance brdf
	    vec3 F  = fresnelSchlick(max(dot(H, V), 0.0), F0);
        float NDF = DistributionGGX(N, H, roughness);       
        float G   = GeometrySmith(N, V, L, roughness);   

        vec3 numerator    = NDF * G * F;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0)  + 0.0001; //add 0.0001 to prevent value being 0
        vec3 specular     = numerator / denominator;  

        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;

        // add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);        
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
	}
    
    // ambient lighting (we now use IBL as the ambient term)
    vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);

    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;	  

    vec3 irradiance = texture(irradianceMap, N).rgb;
    vec3 diffuse      = irradiance * albedo;

    // sample both the pre-filter map and the BRDF lut and combine them together as per the Split-Sum approximation to get the IBL specular part.
    const float MAX_REFLECTION_LOD = 4.0;
    vec3 prefilteredColor = textureLod(prefilterMap, R,  roughness * MAX_REFLECTION_LOD).rgb;    
    vec2 brdf  = texture(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);

    vec3 ambient = (kD * diffuse + specular) * ao;
    
    vec3 color = ambient + Lo;

    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2)); 

    FragColor = vec4(color, 1.0);
}