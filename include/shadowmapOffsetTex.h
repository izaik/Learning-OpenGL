#ifndef SHADOWMAPOFFSETTEX_H
#define SHADOWMAPOFFSETTEX_H

#include <glad/glad.h>
#include <glm/glm.hpp>

class ShadowMapOffsetTexture {

public:
	ShadowMapOffsetTexture(int windowSize, int filterSize);

	void Bind(GLenum textureUnit);

private:
	GLuint m_textureObj;

	void CreateTexture(int windowSize, int filterSize, const vector<float>& Data);
};

#endif