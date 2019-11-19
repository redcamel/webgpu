"use strict";
import util_createTextureFromImage from './util_createTextureFromImage.js'
import RedTypeSize from "../RedTypeSize.js";
import RedBaseMaterial from "../base/RedBaseMaterial.js";

const vertexShaderGLSL = `
	#version 450
	${RedBaseMaterial.GLSL_SystemUniforms}
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
export default class RedBitmapMaterial extends RedBaseMaterial {
	static uniformsBindGroupLayoutDescriptor = {
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
	};
	#redGPU;
	#diffuseTexture;

	constructor(redGPU, diffuseSrc) {
		super(redGPU, vertexShaderGLSL, fragmentShaderGLSL, RedBitmapMaterial.uniformsBindGroupLayoutDescriptor);
		this.#redGPU = redGPU;

		this.uniformBufferDescripter = {
			size: RedTypeSize.mat4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			redStruct: [
				{offset: 0, valueName: 'localMatrix'}
			]
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
					size: this.uniformBufferDescripter.size
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
