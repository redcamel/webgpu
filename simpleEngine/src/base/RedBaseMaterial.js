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

	constructor(redGPU, materialClass, vertexGLSL, fragmentGLSL) {
		let vShaderModule, fShaderModule;
		let programOptionList = materialClass.PROGRAM_OPTION_LIST || []
		if (!(vShaderModule = TABLE.get(vertexGLSL))) TABLE.set(vertexGLSL, vShaderModule = new RedShaderModule_GLSL(redGPU, 'vertex', materialClass, vertexGLSL, programOptionList));
		if (!(fShaderModule = TABLE.get(fragmentGLSL))) TABLE.set(fragmentGLSL, fShaderModule = new RedShaderModule_GLSL(redGPU, 'fragment', materialClass, fragmentGLSL, programOptionList));

		if (!materialClass.uniformBufferDescripter) throw new Error(`${materialClass.name} : uniformBufferDescripter 를 정의해야함`)
		if (!materialClass.uniformsBindGroupLayoutDescriptor) throw  new Error(`${materialClass.name} : uniformsBindGroupLayoutDescriptor 를  정의해야함`)

		this.uniformBufferDescripter = materialClass.uniformBufferDescripter;
		this.uniformsBindGroupLayout = makeUniformBindLayout(redGPU, materialClass.uniformsBindGroupLayoutDescriptor);
		this.vShaderModule = vShaderModule
		this.fShaderModule = fShaderModule

		this.sampler = new RedSampler(redGPU).sampler;
	}

	checkTexture(texture, textureName) {
		throw new Error(`${this.constructor.name} : must override!!!`)
	}

	resetBindingInfo() {
		throw new Error(`${this.constructor.name} : must override!!!`)
	}

	searchModules() {
		let tKey = [this.constructor.name]
		this.constructor.PROGRAM_OPTION_LIST.forEach(key => {
			if (this[key]) tKey.push(key)
		});
		this.vShaderModule.searchShaderModule(tKey.join('_'))
		this.fShaderModule.searchShaderModule(tKey.join('_'))
		console.log(this.vShaderModule)
		console.log(this.fShaderModule)
	}

	setUniformBindGroupDescriptor() {
		this.uniformBindGroupDescriptor = {
			layout: this.uniformsBindGroupLayout,
			bindings: this.bindings
		};
	}
}