"use strict";
import util_makeShaderModule_GLSL from "../material/util_makeShaderModule_GLSL.js";
import RedSampler from "../material/RedSampler.js";

let TABLE = new Map();
let makeUniformBindLayout = function (redGPU, uniformsBindGroupLayoutDescriptor) {
	let uniformsBindGroupLayout;
	if (!(uniformsBindGroupLayout = TABLE.get(uniformsBindGroupLayoutDescriptor))) {
		uniformsBindGroupLayout = redGPU.device.createBindGroupLayout(uniformsBindGroupLayoutDescriptor);
		TABLE.set(uniformsBindGroupLayoutDescriptor, uniformsBindGroupLayout)
	}
	return uniformsBindGroupLayout
};
export default class RedBaseMaterial {
	static GLSL_SystemUniforms = `
	layout(set=0,binding = 0) uniform SystemUniforms {
        mat4 perspectiveMTX;
        mat4 cameraMTX;
    } systemUniforms;
    `;
	vShaderModule;
	fShaderModule;
	uniformsBindGroupLayout;
	vertexStage;
	fragmentStage;
	sampler;

	constructor(redGPU, vertexGLSL, fragmentGLSL, uniformsBindGroupLayoutDescriptor) {
		let vShaderModule, fShaderModule;
		if (!(vShaderModule = TABLE.get(vertexGLSL))) TABLE.set(vertexGLSL, vShaderModule = util_makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'vertex', vertexGLSL));
		if (!(fShaderModule = TABLE.get(fragmentGLSL))) TABLE.set(fragmentGLSL, fShaderModule = util_makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'fragment', fragmentGLSL));
		this.uniformsBindGroupLayout = makeUniformBindLayout(redGPU, uniformsBindGroupLayoutDescriptor);
		this.vertexStage = {
			module: this.vShaderModule = vShaderModule,
			entryPoint: 'main'
		};
		this.fragmentStage = {
			module: this.fShaderModule = fShaderModule,
			entryPoint: 'main'
		};

		this.sampler = new RedSampler(redGPU).sampler;
	}
}