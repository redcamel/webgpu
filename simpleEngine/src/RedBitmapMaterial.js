const vertexShaderGLSL = `
	#version 450
    layout(set=0,binding = 0) uniform Uniforms {
        mat4 modelMTX;
    } uniforms;
     layout(set=1,binding = 0) uniform Uniforms2 {
        mat4 perspectiveMTX;
        mat4 cameraMTX;
    } systemUniforms;
	layout(location = 0) in vec3 position;
	layout(location = 1) in vec3 normal;
	layout(location = 2) in vec2 uv;
	layout(location = 0) out vec3 vNormal;
	layout(location = 1) out vec2 vUV;
	void main() {
		gl_Position = systemUniforms.perspectiveMTX * systemUniforms.cameraMTX * uniforms.modelMTX* vec4(position,1.0);
		vNormal = normal;
		vUV = uv;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
	layout(location = 0) in vec3 vNormal;
	layout(location = 1) in vec2 vUV;
	layout(set = 0, binding = 1) uniform sampler uSampler;
	layout(set = 0, binding = 2) uniform texture2D uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor = texture(sampler2D(uTexture, uSampler), vUV) ;
	}
`;
let vShaderModule;
let fShaderModule;
let uniformsBindGroupLayout;
let get_uniformsBindGroupLayout = function (redGPU) {
	if (!uniformsBindGroupLayout) {
		uniformsBindGroupLayout = redGPU.device.createBindGroupLayout({
			bindings: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer"
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampler"
				},
				{
					binding: 2,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampled-texture"
				},
			]
		});
	}
	return uniformsBindGroupLayout
}
let diffuseTexture
export default class RedBitmapMaterial {
	constructor(redGPU, src) {
		if (!vShaderModule) {
			vShaderModule = makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'vertex', vertexShaderGLSL);
			fShaderModule = makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'fragment', fragmentShaderGLSL);
		}
		this.vShaderModule = vShaderModule;
		this.fShaderModule = fShaderModule;
		this.uniformsBindGroupLayout = get_uniformsBindGroupLayout(redGPU)

		this.vertexStage = {
			module: vShaderModule,
			entryPoint: 'main'
		};
		this.fragmentStage = {
			module: fShaderModule,
			entryPoint: 'main'
		};

		const testSampler = redGPU.device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter: "linear",
			addressModeU: "mirror-repeat",
			addressModeV: "mirror-repeat",
			addressModeW: "mirror-repeat"
			// 	enum GPUAddressMode {
			// 	    "clamp-to-edge",
			// 		"repeat",
			// 		"mirror-repeat"
			//  };
		});
		const matrixSize = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix
		const uniformBufferSize = matrixSize ;
		// 유니폼 버퍼를 생성하고
		this.uniformBufferDescripter = {
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		}

		let self = this;
		(async function(){
			 if(!diffuseTexture) diffuseTexture = await createTextureFromImage(redGPU.device, src, GPUTextureUsage.SAMPLED);
			self.bindings =  [
				{
					binding: 0,
					resource: {
						buffer: null,
						offset: 0,
						size: matrixSize
					}
				},
				{
					binding: 1,
					resource: testSampler,
				},
				{
					binding: 2,
					resource: diffuseTexture.createView(),
				}
			]

		})()


	}


}

async function createTextureFromImage(device, src, usage) {
	// 귀찮아서 텍스쳐 맹그는 놈은 들고옴
	const img = document.createElement('img');
	console.log('여긴오곘고');
	img.src = src;
	await img.decode();

	const imageCanvas = document.createElement('canvas');
	imageCanvas.width = img.width;
	imageCanvas.height = img.height;

	const imageCanvasContext = imageCanvas.getContext('2d');
	imageCanvasContext.translate(0, img.height);
	imageCanvasContext.scale(1, -1);
	imageCanvasContext.drawImage(img, 0, 0, img.width, img.height);
	const imageData = imageCanvasContext.getImageData(0, 0, img.width, img.height);

	let data = null;

	const rowPitch = Math.ceil(img.width * 4 / 256) * 256;
	if (rowPitch == img.width * 4) {
		data = imageData.data;
	} else {
		data = new Uint8Array(rowPitch * img.height);
		for (let y = 0; y < img.height; ++y) {
			for (let x = 0; x < img.width; ++x) {
				let i = x * 4 + y * rowPitch;
				data[i] = imageData.data[i];
				data[i + 1] = imageData.data[i + 1];
				data[i + 2] = imageData.data[i + 2];
				data[i + 3] = imageData.data[i + 3];
			}
		}
	}

	const texture = device.createTexture({
		size: {
			width: img.width,
			height: img.height,
			depth: 1,
		},
		format: "rgba8unorm",
		usage: GPUTextureUsage.COPY_DST | usage,
	});

	const textureDataBuffer = device.createBuffer({
		size: data.byteLength,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
	});

	textureDataBuffer.setSubData(0, data);

	const commandEncoder = device.createCommandEncoder({});
	commandEncoder.copyBufferToTexture({
		buffer: textureDataBuffer,
		rowPitch: rowPitch,
		imageHeight: 0,
	}, {
		texture: texture,
	}, {
		width: img.width,
		height: img.height,
		depth: 1,
	});

	device.getQueue().submit([commandEncoder.finish()]);

	return texture;
}

function makeShaderModule_GLSL(glslang, device, type, source) {
	console.log(`// makeShaderModule_GLSL start : ${type}/////////////////////////////////////////////////////////////`);
	let shaderModuleDescriptor = {
		code: glslang.compileGLSL(source, type),
		source: source
	};
	console.log('shaderModuleDescriptor', shaderModuleDescriptor);
	let shaderModule = device.createShaderModule(shaderModuleDescriptor);
	console.log(`shaderModule_${type}}`, shaderModule);
	console.log(`// makeShaderModule_GLSL end : ${type}/////////////////////////////////////////////////////////////`);
	return shaderModule;
}