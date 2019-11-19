"use strict";
export default class RedInterleaveInfo {
	static STRIDE_TABLE = {
		'float': 1 * Float32Array.BYTES_PER_ELEMENT,
		'float2': 2 * Float32Array.BYTES_PER_ELEMENT,
		'float3': 3 * Float32Array.BYTES_PER_ELEMENT,
		'float4': 4 * Float32Array.BYTES_PER_ELEMENTy
	}

	constructor(attributeKey, format) {
		this['attributeKey'] = attributeKey;
		this['format'] = format
		this['stride'] = RedInterleaveInfo.STRIDE_TABLE[format]
		console.log(this)
	}
}