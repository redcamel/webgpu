"use strict"
import RedBaseObject3D from "./RedBaseObject3D.js";

export default class RedBaseObjectContainer extends RedBaseObject3D {
	#children = new Set();
	addChild(v){
		this.#children.add(v)
	}
	get children(){
		return this.#children
	}
}