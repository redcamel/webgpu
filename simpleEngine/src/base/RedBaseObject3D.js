"use strict"
export default class RedBaseObject3D {
	#x = 0;
	#y = 0;
	#z = 0;
	#rotationX = 0;
	#rotationY = 0;
	#rotationZ = 0;
	#scaleX = 0;
	#scaleY = 0;
	#scaleZ = 0;
	#isDirty = true;
	constructor(){
		this.localMatrix = mat4.create()
	}
	get isDirty(){
		return this.#isDirty
	}
	set isDirty(v){
		 this.#isDirty=v
	}

	get x() {
		return this.#x
	}

	set x(v) {
		this.#x = v;
		this.#isDirty = true;
	}

	get y() {
		return this.#y
	}

	set y(v) {
		this.#y = v;
		this.#isDirty = true;
	}

	get z() {
		return this.#z;
	}

	set z(v) {
		this.#z = v;
		this.#isDirty = true;
	}

	calculateLocalMatrix() {
		var tMTX = this.localMatrix;
		mat4.identity(tMTX)
		mat4.translate(tMTX, tMTX, [this.#x, this.#y, this.#z])
		mat4.rotateX(tMTX, tMTX, this.#rotationX * Math.PI / 180)
		mat4.rotateY(tMTX, tMTX, this.#rotationY * Math.PI / 180)
		mat4.rotateZ(tMTX, tMTX, this.#rotationZ * Math.PI / 180)
		mat4.scale(tMTX, tMTX, [this.#scaleX, this.#scaleY, this.#scaleZ])
		this.localMatrix = tMTX
	}
}