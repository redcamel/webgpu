"use strict"
import RedBaseObjectContainer from "./base/RedBaseObjectContainer.js";

let redGPUList = new Set();
let setGlobalResizeEvent = function () {
	window.addEventListener('resize', _ => {
		// for (const redGPU of redGPUList) redGPU.setSize()
	})
}
export default class RedGPU extends RedBaseObjectContainer {

	#width = 0;
	#height = 0;
	#init = async function (canvas) {
		const gpu = navigator['gpu']; //
		const adapter = await gpu.requestAdapter({
			powerPreference: "high-performance"
		});
		const device = await adapter.requestDevice();
		this.device = device
		this.swapChainFormat = "bgra8unorm";
		this.swapChain = await configureSwapChain(this.device, this.swapChainFormat, canvas.getContext('gpupresent'));
		this.system_uniformBindGroupLayout = device.createBindGroupLayout({
			bindings: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer"
				}
			]
		});
		let uniformBufferSize = 4 * 4 * Float32Array.BYTES_PER_ELEMENT * 2
		let uniformBufferDescripter = {
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		}
		this.system_uniformBuffer = await device.createBuffer(uniformBufferDescripter);
		console.log(this.system_uniformBuffer)
		this.system_bindGroup = device.createBindGroup(
			{
				layout: this.system_uniformBindGroupLayout,
				bindings: [
					{
						binding: 0,
						resource: {
							buffer: this.system_uniformBuffer,
							offset: 0,
							size: uniformBufferSize
						}
					}
				]
			}
		)

		this.projectionMatrix = mat4.create();
		this.setSize('100%', '100%');
	}

	constructor(canvas, glslang) {
		super();
		this.glslang = glslang;
		this.canvas = canvas;
		this.#init(canvas);


		if (!redGPUList.size) setGlobalResizeEvent();
		redGPUList.add(this);
		console.log(redGPUList)
	}


	setSize(w = this.#width, h = this.#height) {
		this.#width = w;
		this.#height = h;
		console.log(w, h)
		let tW, tH;
		let rect = document.body.getBoundingClientRect();
		if (typeof w != 'number' && w.includes('%')) tW = rect.width;
		else tW = w;
		if (typeof h != 'number' && h.includes('%')) tH = rect.height;
		else tH = h;
		this.canvas.width = tW;
		this.canvas.height = tH;
		this.canvas.style.width = tW + 'px';
		this.canvas.style.height = tH + 'px';

		let aspect = Math.abs(this.canvas.width / this.canvas.height);
		mat4.perspective(this.projectionMatrix, (Math.PI / 180) * 60, aspect, 0.01, 10000.0);

		requestAnimationFrame(_ => {
			const swapChainTexture = this.swapChain.getCurrentTexture();
			const commandEncoder = this.device.createCommandEncoder();
			const textureView = swapChainTexture.createView();
			const passEncoder = commandEncoder.beginRenderPass({
				colorAttachments: [{
					attachment: textureView,
					loadValue: {r: 1, g: 1, b: 0.0, a: 1.0}
				}]
			});
			console.log(tW, tH)
			passEncoder.setViewport(0, 0, tW, tH, 0, 1)
			passEncoder.setScissorRect(0, 0, tW, tH)
			passEncoder.endPass();
			const test = commandEncoder.finish();
			this.device.getQueue().submit([test]);
		})
	}


}

function configureSwapChain(device, swapChainFormat, context) {
	const swapChainDescriptor = {
		device: device,
		format: swapChainFormat,

	};
	console.log('swapChainDescriptor', swapChainDescriptor);
	return context.configureSwapChain(swapChainDescriptor);
}