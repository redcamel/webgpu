"use strict"
import RedBaseObject3D from "./RedBaseObject3D.js";

export default class RedBaseObjectContainer extends RedBaseObject3D {
	#children = [];
	addChild(v){
		this.#children.push(v)
	}
	get children(){
		return this.#children
	}
}