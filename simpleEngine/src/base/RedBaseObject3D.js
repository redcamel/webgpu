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

	get rotationX() {
		return this.#rotationX;
	}

	set rotationX(v) {
		this.#rotationX = v;
		this.#isDirty = true;
	}
	get rotationY() {
		return this.#rotationY;
	}

	set rotationY(v) {
		this.#rotationY = v;
		this.#isDirty = true;
	}
	get rotationZ() {
		return this.#rotationZ;
	}

	set rotationZ(v) {
		this.#rotationZ = v;
		this.#isDirty = true;
	}



}