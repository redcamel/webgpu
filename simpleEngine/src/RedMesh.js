"use strict"
import RedBaseObjectContainer from "./base/RedBaseObjectContainer.js";
import RedSphere from "./geometry/RedSphere.js";

let table = new Map()
export default class RedMesh extends RedBaseObjectContainer {
	#material;
	#geometry;
	#redGPU;
	constructor(redGPU, material) {
		super()
		this.#redGPU = redGPU;
		console.log(this)
		this.geometry = new RedSphere(redGPU);
		this.material = material
		console.log(this.uniformBuffer)
	}
	get geometry() {
		return this.#geometry
	}

	set geometry(v) {
		this.#geometry = v
		this.pipeline = null
		this.isDirty = true
	}
	get material() {
		return this.#material
	}

	set material(v) {
		this.#material = v
		this.uniformBuffer = this.#redGPU.device.createBuffer(v.uniformBufferDescripter);
		this.pipeline = null
		this.isDirty = true
	}

	createPipeline(redGPU) {
		this.uniformBindGroup=null
		const device = redGPU.device;
		const descriptor = {
			// 레이아웃은 재질이 알고있으니 들고옴
			layout: device.createPipelineLayout({bindGroupLayouts: [this.#material.uniformsBindGroupLayout, redGPU.system_uniformBindGroupLayout]}),
			// 버텍스와 프레그먼트는 재질에서 들고온다.
			vertexStage: {
				module: this.#material.vShaderModule,
				entryPoint: 'main'
			},
			fragmentStage: {
				module: this.#material.fShaderModule,
				entryPoint: 'main'
			},
			// 버텍스 상태는 지오메트리가 알고있음으로 들고옴
			vertexState: this.#geometry.vertexState,
			// 컬러모드 지정하고
			colorStates: [
				{
					format: redGPU.swapChainFormat,
					alphaBlend: {
						srcFactor: "src-alpha",
						dstFactor: "one-minus-src-alpha",
						operation: "add"
					}
				}
			],
			// 드로잉 방법을 결정함
			primitiveTopology: 'triangle-list',
			depthStencilState: {
				depthWriteEnabled: true,
				depthCompare: "less",
				format: "depth24plus-stencil8",
			},
			/*
			GPUPrimitiveTopology {
				"point-list",
				"line-list",
				"line-strip",
				"triangle-list",
				"triangle-strip"
			};
			 */
		};
		// console.log(table.get(this.#material))

		if (table.has(this.#material)) return this.pipeline = table.get(this.#material)
		// this.uniformBindGroup = null
		let pipeline = device.createRenderPipeline(descriptor);
		this.pipeline = pipeline
		table.set(this.#material, pipeline);
		console.log('파이프라인생성')
		console.log('table', table)
		return this.pipeline
	}


}