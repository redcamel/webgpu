"use strict";
export default class RedSampler {
	constructor(redGPU) {
		this.sampler = redGPU.device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter: "linear",
			addressModeU: "mirror-repeat",
			addressModeV: "mirror-repeat",
			addressModeW: "mirror-repeat"
		});

	}

}