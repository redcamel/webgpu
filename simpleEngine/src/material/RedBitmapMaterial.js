"use strict";
import util_createTextureFromImage from './util_createTextureFromImage.js'
import util_makeShaderModule_GLSL from './util_makeShaderModule_GLSL.js'

const vertexShaderGLSL = `
	#version 450
	layout(set=0,binding = 0) uniform SystemUniforms {
        mat4 perspectiveMTX;
        mat4 cameraMTX;
    } systemUniforms;
    layout(set=1,binding = 0) uniform Uniforms {
        mat4 modelMatrix;
    } uniforms;
	layout(location = 0) in vec3 position;
	layout(location = 1) in vec3 normal;
	layout(location = 2) in vec2 uv;
	layout(location = 0) out vec3 vNormal;
	layout(location = 1) out vec2 vUV;
	void main() {
		gl_Position = systemUniforms.perspectiveMTX * systemUniforms.cameraMTX * uniforms.modelMatrix* vec4(position,1.0);
		vNormal = normal;
		vUV = uv;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
	layout(location = 0) in vec3 vNormal;
	layout(location = 1) in vec2 vUV;
	layout(set = 1, binding = 1) uniform sampler uSampler;
	layout(set = 1, binding = 2) uniform texture2D uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor = texture(sampler2D(uTexture, uSampler), vUV) ;
	}
`;
let vShaderModule;
let fShaderModule;
let uniformsBindGroupLayout;
let get_uniformsBindGroupLayout = function (redGPU) {
	if (!uniformsBindGroupLayout) {
		uniformsBindGroupLayout = redGPU.device.createBindGroupLayout({
			bindings: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer"
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampler"
				},
				{
					binding: 2,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampled-texture"
				},
			]
		});
	}
	return uniformsBindGroupLayout
};

export default class RedBitmapMaterial {
	static matrixSize = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix
	static uniformBufferSize = RedBitmapMaterial.matrixSize;
	#diffuseTexture;
	#redGPU;

	constructor(redGPU, diffuseSrc) {
		if (!vShaderModule) {
			vShaderModule = util_makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'vertex', vertexShaderGLSL);
			fShaderModule = util_makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'fragment', fragmentShaderGLSL);
		}
		this.#redGPU = redGPU;
		this.vShaderModule = vShaderModule;
		this.fShaderModule = fShaderModule;
		this.uniformsBindGroupLayout = get_uniformsBindGroupLayout(redGPU);

		this.vertexStage = {
			module: vShaderModule,
			entryPoint: 'main'
		};
		this.fragmentStage = {
			module: fShaderModule,
			entryPoint: 'main'
		};

		this.sampler = redGPU.device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter: "linear",
			addressModeU: "mirror-repeat",
			addressModeV: "mirror-repeat",
			addressModeW: "mirror-repeat"
			// 	enum GPUAddressMode {
			// 	    "clamp-to-edge",
			// 		"repeat",
			// 		"mirror-repeat"
			//  };
		});

		// 유니폼 버퍼를 생성하고
		this.uniformBufferDescripter = {
			size: RedBitmapMaterial.uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		};

		this.diffuseTexture = diffuseSrc
	}

	set diffuseTexture(src) {
		let self = this;
		self.bindings = null;
		(async function (v) {
			self.#diffuseTexture = await util_createTextureFromImage(self.#redGPU.device, v, GPUTextureUsage.SAMPLED);
			console.log('로딩됨', v);
			self.resetBindingInfo()
		})(src);
	}

	get diffuseTexture() {
		return this.#diffuseTexture
	}

	resetBindingInfo() {
		this.bindings = [
			{
				binding: 0,
				resource: {
					buffer: null,
					offset: 0,
					size: RedBitmapMaterial.matrixSize
				}
			},
			{
				binding: 1,
				resource: this.sampler,
			},
			{
				binding: 2,
				resource: this.#diffuseTexture.createView(),
			}
		];
		this.uniformBindGroupDescriptor = {
			layout: this.uniformsBindGroupLayout,
			bindings: this.bindings
		};
		console.log(this.#diffuseTexture)
	}
}
