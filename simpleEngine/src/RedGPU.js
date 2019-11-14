"use strict"
import RedBaseObjectContainer from "./base/RedBaseObjectContainer.js";

let redGPUList = new Set();
let setGlobalResizeEvent = function () {
	// window.addEventListener('resize', _ => {
	// 	for (const redGPU of redGPUList) redGPU.setSize()
	// })
}
export default class RedGPU extends RedBaseObjectContainer {

	#width = 0;
	#height = 0;
	#init = async function (canvas) {
		const gpu = navigator['gpu']; //
		const adapter = await gpu.requestAdapter();
		const device = await adapter.requestDevice();
		this.device = device
		this.swapChainFormat = "bgra8unorm";
		this.swapChain = await configureSwapChain(this.device, this.swapChainFormat, canvas.getContext('gpupresent'));

	}

	constructor(canvas, glslang) {
		super();
		this.#init(canvas);
		this.glslang = glslang;
		this.canvas = canvas;



		this.setSize('100%', '100%');
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
		this.canvas.style.width = tW+'px';
		this.canvas.style.height = tH+'px';
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