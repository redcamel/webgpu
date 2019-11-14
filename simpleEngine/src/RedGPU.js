"use strict"
import RedBaseObjectContainer from "./base/RedBaseObjectContainer.js";

let redGPUList = new Set();
let setGlobalResizeEvent = function () {
	window.addEventListener('resize', _ => {
		for (const redGPU of redGPUList) redGPU.setSize()
	})
}
export default class RedGPU extends RedBaseObjectContainer{
	#canvas = null;
	#width = 0;
	#height = 0;
	#init = async function(){
		const gpu = navigator['gpu']; //
		const adapter = await gpu.requestAdapter();
		const device =  await adapter.requestDevice();
		this.device = device
	}
	 constructor(canvas,glslang) {
		super();
		this.#init();
		this.glslang = glslang;
		this.#canvas = canvas;
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
		this.#canvas.width = tW;
		this.#canvas.height = tH;
	}


}