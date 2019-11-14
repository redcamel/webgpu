"use strict"
import RedBaseObjectContainer from "./base/RedBaseObjectContainer.js";
import RedSphere from "./geometry/RedSphere.js";
import RedBitmapMaterial from "./RedBitmapMaterial.js";

export default class RedMesh extends RedBaseObjectContainer{
	constructor(redGPU) {
		super()
		console.log(this)
		this.geometry = new RedSphere(redGPU);
		this.material = new RedBitmapMaterial(redGPU,'../assets/crate.png')
	}

}