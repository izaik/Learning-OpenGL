#version 330 core
in vec3 Normal;
in vec3 FragPos;

in vec2 TexCoords;

struct Material {
    sampler2D diffuse;  
    sampler2D specular;
    float     shininess;
};

struct Light {
    vec3 position;
    vec3 direction;
    float cutOff;
    float outerCutOff;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

uniform Light light;  
uniform Material material;

uniform vec3 viewPos;

out vec4 FragColor;

void main()
{
    vec3 norm       = normalize(Normal);
    vec3 lightDir   = normalize(light.position - FragPos);
    vec3 viewDir    = normalize(viewPos - FragPos);
    vec3 reflectDir = reflect(-lightDir, norm);

    float theta     = dot(lightDir, normalize(-light.direction));
    float epsilon   = light.cutOff - light.outerCutOff;
    float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

    if(theta > light.outerCutOff)
    {
        // ambient
        vec3 ambient = light.ambient * vec3(texture(material.diffuse, TexCoords).rgb);
        
        // diffuse
        float diff   = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = light.diffuse * diff * vec3(texture(material.diffuse, TexCoords));

        // specular
        float spec    = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
        vec3 specular = light.specular * spec * vec3(texture(material.specular, TexCoords));

        diffuse  *= intensity;
        specular *= intensity;

        FragColor = vec4(ambient + diffuse + specular, 1.0);
    }

    else
        FragColor = vec4(light.ambient * vec3(texture(material.diffuse, TexCoords)), 1.0);
}