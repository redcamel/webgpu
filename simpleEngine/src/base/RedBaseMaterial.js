"use strict";
import RedShaderModule_GLSL from "../material/RedShaderModule_GLSL.js";
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

	constructor(redGPU, materialClass, vertexGLSL, fragmentGLSL, uniformsBindGroupLayoutDescriptor, programOptionList = []) {
		let vShaderModule, fShaderModule;
		if (!(vShaderModule = TABLE.get(vertexGLSL))) TABLE.set(vertexGLSL, vShaderModule = new RedShaderModule_GLSL(redGPU, 'vertex', materialClass, vertexGLSL, programOptionList));
		if (!(fShaderModule = TABLE.get(fragmentGLSL))) TABLE.set(fragmentGLSL, fShaderModule = new RedShaderModule_GLSL(redGPU, 'fragment', materialClass, fragmentGLSL, programOptionList));
		this.uniformsBindGroupLayout = makeUniformBindLayout(redGPU, uniformsBindGroupLayoutDescriptor);
		this.vShaderModule = vShaderModule
		this.fShaderModule = fShaderModule

		this.sampler = new RedSampler(redGPU).sampler;
	}
}