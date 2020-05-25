const ready = glslang();
ready.then(init);
const vertexShaderGLSL = `
	#version 450
	layout(location = 0) in float startTime;
	layout(location = 1) in float easeType;
    layout(location = 2) in float life;
    layout(location = 3) in float age;
    layout(location = 4) in float particleX;
    layout(location = 5) in float particleY;
    layout(location = 6) in float particleZ;
    layout(location = 7) in float movementX;
    layout(location = 8) in float movementY;
    layout(location = 9) in float movementZ;
    layout(location = 10) in float alpha;
    layout(location = 11) in float alphaEnd;
    layout(location = 12) in vec3 scaleInfo;
    layout(location = 13) in vec4 a_pos;
    layout(location = 14) in vec2 a_uv;
    layout(location = 0) out vec2 tUV;
    layout(location = 1) out float vAlpha;
	void main() {
		gl_Position = vec4(a_pos.xyz * scaleInfo.x  + vec3(particleX, particleY, particleZ), 1);
		tUV = a_uv;
		vAlpha = alpha;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
    layout(location = 0) in vec2 tUV;
    layout(location = 1) in float vAlpha;
    layout(set = 0, binding = 0) uniform sampler uSampler;
	layout(set = 0, binding = 1) uniform texture2D uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor =  texture(sampler2D(uTexture, uSampler), tUV);
		outColor.a *= vAlpha;
	}
`;
const PARTICLE_NUM = 1000
const computeShader = `
	#version 450
	// 파티클 구조체 선언
	struct Particle {
		float startTime;
	    float easeType;
	    float life;
	    float age;
	    float particleX;
	    float particleY;
	    float particleZ;
	    float movementX;
	    float movementY;
	    float movementZ;
	    float alpha;
	    float alphaEnd;
	    vec3 scaleInfo;
	};
	
	// 이건 설정값인듯 하고
	layout(std140, set = 0, binding = 0) uniform SimParams {
	    float time;
	    float easeType;
	    float life;
	    float age;
	    float particleX;
	    float particleY;
	    float particleZ;
	    float movementX;
	    float movementY;
	    float movementZ;
	    float alpha;
	    float alphaEnd;
	} params;
	
	// 여기다 쓰곘다는건가	
	layout(std140, set = 0, binding = 1) buffer ParticlesA {
	    Particle particles[${PARTICLE_NUM}];
	} particlesA;
	
	// 여기다 쓰곘다는건가
	layout(std140, set = 0, binding = 2) buffer ParticlesB {
	    Particle particles[${PARTICLE_NUM}];
	} particlesB;

	void main() {
		uint index = gl_GlobalInvocationID.x;
		Particle targetParticle = particlesA.particles[index];
	
		vec3 movement = vec3(
			targetParticle.movementX,
			targetParticle.movementY,
			targetParticle.movementZ
		);
		float n;
		float age = params.time - targetParticle.startTime;
		float lifeRatio = age/targetParticle.life;
		if(lifeRatio>=1) {
			particlesA.particles[index].startTime = params.time;
			lifeRatio = 0;
		}
		n = lifeRatio;
		n =  ((n = n * 2) < 1) ? n * n * n * n * n * 0.5 : 0.5 * ((n -= 2) * n * n * n * n + 2);	
		particlesA.particles[index].particleX = movement.x * n;
		particlesA.particles[index].particleY = movement.y * n;
		particlesA.particles[index].particleZ = movement.z * n;
		particlesA.particles[index].scaleInfo.x = targetParticle.scaleInfo.y + (targetParticle.scaleInfo.z-targetParticle.scaleInfo.y) * n;
		particlesA.particles[index].alpha = 1-targetParticle.alphaEnd * n;
	
	}
`

async function init(glslang) {
	// glslang을 이용하여 GLSL소스를 Uint32Array로 변환합니다.
	console.log('glslang', glslang);

	// 초기 GPU 권한을 얻어온다.
	const gpu = navigator['gpu']; //
	const adapter = await gpu.requestAdapter();
	const device = await adapter.requestDevice();
	console.log('gpu', gpu);
	console.log('adapter', adapter);
	console.log('device', device);

	// 화면에 표시하기 위해서 캔버스 컨텍스트를 가져오고
	// 얻어온 컨텍스트에 얻어온 GPU 넣어준다.??
	const cvs = document.createElement('canvas');
	cvs.width = 768;
	cvs.height = 768;
	document.body.appendChild(cvs);
	const ctx = cvs.getContext('gpupresent');

	const swapChainFormat = "bgra8unorm";
	const swapChain = configureSwapChain(device, swapChainFormat, ctx);
	console.log('ctx', ctx);
	console.log('swapChain', swapChain);

	// 쉐이더를 이제 만들어야함.
	let vShaderModule = makeShaderModule_GLSL(glslang, device, 'vertex', vertexShaderGLSL);
	let fShaderModule = makeShaderModule_GLSL(glslang, device, 'fragment', fragmentShaderGLSL);
	let computeModule = makeShaderModule_GLSL(glslang, device, 'compute', computeShader);

	let simParamData = new Float32Array(
		[
			performance.now(), // startTime time
			0, // type of ease
			2000, // life
			0, // age
			0, // x
			0, // y
			0, // z
			0.01, // movementX
			0.01, // movementY
			0.01 // movementZ
		]
	)

	let simParamBuffer = makeUniformBuffer(
		device,
		simParamData
	);
	const PROPERTY_NUM = 16
	const initialParticleData = new Float32Array(PARTICLE_NUM * PROPERTY_NUM);
	const currentTime = performance.now();
	for (let i = 0; i < PARTICLE_NUM; ++i) {
		let life = Math.random() * 7000 + 2000;
		let age = Math.random() * life;
		initialParticleData[PROPERTY_NUM * i + 0] = currentTime - age // start time
		initialParticleData[PROPERTY_NUM * i + 1] = 0 // typeof ease
		initialParticleData[PROPERTY_NUM * i + 2] = life; // life
		initialParticleData[PROPERTY_NUM * i + 3] = age; // age of particle;
		//
		initialParticleData[PROPERTY_NUM * i + 4] = Math.random() * 2 - 1; // x
		initialParticleData[PROPERTY_NUM * i + 5] = Math.random() * 2 - 1; // y
		initialParticleData[PROPERTY_NUM * i + 6] = Math.random() * 2 - 1; // z
		initialParticleData[PROPERTY_NUM * i + 7] = Math.random() * 2 - 1; // movementX
		initialParticleData[PROPERTY_NUM * i + 8] = Math.random() * 2 - 1; // movementY
		initialParticleData[PROPERTY_NUM * i + 9] = Math.random() * 2 - 1; // movementZ
		//
		initialParticleData[PROPERTY_NUM * i + 10] = 1; // alpha
		initialParticleData[PROPERTY_NUM * i + 11] = 1; // alpha change
		//
		initialParticleData[PROPERTY_NUM * i + 12] = 1; // scale
		initialParticleData[PROPERTY_NUM * i + 13] = 10; // scaleStart
		initialParticleData[PROPERTY_NUM * i + 14] = 50; // scaleEnd

	}

	// 쉐이더 모듈을 만들었으니  버퍼를 만들어야함
	let tScale = 0.005
	let vertexBuffer = makeVertexBuffer(
		device,
		new Float32Array(
			[
				// -0.01, -0.02, 0.01, -0.02, 0.00, 0.0
				-tScale, -tScale, 0.0, 1, 0.0, 0.0,
				tScale, -tScale, 0.0, 1, 0.0, 1.0,
				-tScale, tScale, 0.0, 1, 1.0, 0.0,
				//
				-tScale, tScale, 0.0, 1, 1.0, 0.0,
				tScale, -tScale, 0.0, 1, 0.0, 1.0,
				tScale, tScale, 0.0, 1, 1.0, 1.0
			]
		)
	);

	const particleBuffers = new Array(2);
	const particleBindGroups = new Array(2);
	for (let i = 0; i < 2; ++i) {
		particleBuffers[i] = device.createBuffer({
			size: initialParticleData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
		});
		particleBuffers[i].setSubData(0, initialParticleData);
	}

	const computeBindGroupLayout = device.createBindGroupLayout({
		bindings: [
			{binding: 0, visibility: GPUShaderStage.COMPUTE, type: "uniform-buffer"},
			{binding: 1, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer"},
			{binding: 2, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer"},
		],
	});

	const computePipelineLayout = device.createPipelineLayout({
		bindGroupLayouts: [computeBindGroupLayout],
	});

	for (let i = 0; i < 2; ++i) {
		particleBindGroups[i] = device.createBindGroup({
			layout: computeBindGroupLayout,
			bindings: [{
				binding: 0,
				resource: {
					buffer: simParamBuffer,
					offset: 0,
					size: simParamData.byteLength
				},
			},
				{
					binding: 1,
					resource: {
						buffer: particleBuffers[i],
						offset: 0,
						size: initialParticleData.byteLength,
					},
				},
				{
					binding: 2,
					resource: {
						buffer: particleBuffers[(i + 1) % 2],
						offset: 0,
						size: initialParticleData.byteLength,
					},
				}],
		});
	}


	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// 그리기위해서 파이프 라인이란걸 또만들어야함 -_-;;
	const computePipeline = device.createComputePipeline({
		layout: computePipelineLayout,
		computeStage: {
			module: computeModule,
			entryPoint: "main"
		},
	});

	const depthTexture = device.createTexture({
		size: {width: cvs.width, height: cvs.height, depth: 1},
		format: "depth24plus-stencil8",
		usage: GPUTextureUsage.OUTPUT_ATTACHMENT
	});

	const uniformsBindGroupLayout = device.createBindGroupLayout({
		bindings: [

			{
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				type: "sampler"
			},
			{
				binding: 1,
				visibility: GPUShaderStage.FRAGMENT,
				type: "sampled-texture"
			}
		]
	});

	/**
	 * 텍스쳐를 만들어보자
	 */
	const testTexture = await createTextureFromImage(device, '../assets/particle.png', GPUTextureUsage.SAMPLED);
	const testSampler = device.createSampler({
		magFilter: "linear",
		minFilter: "linear",
		mipmapFilter: "linear"
	});
	console.log('testTexture', testTexture);

	const uniformBindGroupDescriptor = {
		layout: uniformsBindGroupLayout,
		bindings: [
			{
				binding: 0,
				resource: testSampler,
			},
			{
				binding: 1,
				resource: testTexture.createView(),
			}
		]
	};
	console.log('uniformBindGroupDescriptor', uniformBindGroupDescriptor);
	const uniformBindGroup = device.createBindGroup(uniformBindGroupDescriptor);
	console.log('uniformBindGroup', uniformBindGroup);
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	const renderPipeline = device.createRenderPipeline({
		layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
		vertexStage: {
			module: vShaderModule,
			entryPoint: 'main'
		},
		fragmentStage: {
			module: fShaderModule,
			entryPoint: 'main'
		},
		primitiveTopology: "triangle-list",
		depthStencilState: {
			depthWriteEnabled: false,
			depthCompare: "always",
			format: "depth24plus-stencil8",
		},
		vertexState: {
			vertexBuffers: [
				{
					// instanced particles buffer
					arrayStride: PROPERTY_NUM * 4,
					stepMode: "instance",
					attributes: [
						{
							/* startTime*/
							shaderLocation: 0, offset: 0, format: "float"
						},
						{
							/* easeType*/
							shaderLocation: 1, offset: 1 * 4, format: "float"
						},
						{
							/* life*/
							shaderLocation: 2, offset: 2 * 4, format: "float"
						},
						{
							/* age*/
							shaderLocation: 3, offset: 3 * 4, format: "float"
						},
						{
							/* particleX*/
							shaderLocation: 4, offset: 4 * 4, format: "float"
						},
						{
							/* particleY*/
							shaderLocation: 5, offset: 5 * 4, format: "float"
						},
						{
							/* particleZ*/
							shaderLocation: 6, offset: 6 * 4, format: "float"
						},
						{
							/* movementX*/
							shaderLocation: 7, offset: 7 * 4, format: "float"
						},
						{
							/* movementY*/
							shaderLocation: 8, offset: 8 * 4, format: "float"
						},
						{
							/* movementZ*/
							shaderLocation: 9, offset: 9 * 4, format: "float"
						},
						{
							/* alpha*/
							shaderLocation: 10, offset: 10 * 4, format: "float"
						},
						{
							/* alphaEnd*/
							shaderLocation: 11, offset: 11 * 4, format: "float"
						},
						{
							/* scale*/
							shaderLocation: 12, offset: 12 * 4, format: "float3"
						}
					]
				},
				{
					// vertex buffer
					arrayStride: 6 * 4,
					stepMode: "vertex",
					attributes: [
						{
							// vertex positions
							shaderLocation: 13,
							offset: 0,
							format: "float4",
						},
						{
							// vertex uv
							shaderLocation: 14,
							offset: 4 * 4,
							format: "float2"
						}
					],
				}
			],
		},

		colorStates: [{
			format: "bgra8unorm",
			colorBlend: {
				srcFactor: 'src-alpha',
				dstFactor: 'one',
				operation: "add"
			},
			alphaBlend: {
				srcFactor: 'src-alpha',
				dstFactor: 'one',
				operation: "add"
			}
		}],
	});


	let t = 0;
	let render = async function (time) {
		simParamBuffer.setSubData(0, new Float32Array([time]))
		const renderPassDescriptor = {
			colorAttachments: [{
				attachment: swapChain.getCurrentTexture().createView(),  // Assigned later
				loadValue: {r: 0.0, g: 0.0, b: 0.0, a: 1.0},
			}],
			depthStencilAttachment: {
				attachment: depthTexture.createView(),
				depthLoadValue: 1.0,
				depthStoreOp: "store",
				stencilLoadValue: 0,
				stencilStoreOp: "store",
			}
		};

		const commandEncoder = device.createCommandEncoder({});
		{
			const passEncoder = commandEncoder.beginComputePass();
			passEncoder.setPipeline(computePipeline);
			passEncoder.setBindGroup(0, particleBindGroups[0]);
			passEncoder.dispatch(PARTICLE_NUM);
			passEncoder.endPass();
		}
		{
			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
			passEncoder.setViewport(0, 0, 768, 768, 0, 1);
			passEncoder.setScissorRect(0, 0, 768, 768);
			passEncoder.setPipeline(renderPipeline);
			passEncoder.setVertexBuffer(0, particleBuffers[0]);
			passEncoder.setVertexBuffer(1, vertexBuffer);
			passEncoder.setBindGroup(0, uniformBindGroup);
			passEncoder.draw(6, PARTICLE_NUM, 0, 0);
			passEncoder.endPass();
		}
		device.defaultQueue.submit([commandEncoder.finish()]);
		++t;
		requestAnimationFrame(render)
	};
	requestAnimationFrame(render)

}

function configureSwapChain(device, swapChainFormat, context) {
	const swapChainDescriptor = {
		device: device,
		format: swapChainFormat
	};
	console.log('swapChainDescriptor', swapChainDescriptor);
	return context.configureSwapChain(swapChainDescriptor);
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

function makeVertexBuffer(device, data) {
	console.log(`// makeVertexBuffer start /////////////////////////////////////////////////////////////`);
	let bufferDescriptor = {
		size: data.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
	};
	let verticesBuffer = device.createBuffer(bufferDescriptor);
	console.log('bufferDescriptor', bufferDescriptor);
	verticesBuffer.setSubData(0, data);
	console.log('verticesBuffer', verticesBuffer);
	console.log(`// makeVertexBuffer end /////////////////////////////////////////////////////////////`);
	return verticesBuffer
}

function makeUniformBuffer(device, data) {
	console.log(`// makeUniformBuffer start /////////////////////////////////////////////////////////////`);
	let bufferDescriptor = {
		size: data.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	};
	let buffer = device.createBuffer(bufferDescriptor);
	console.log('bufferDescriptor', bufferDescriptor);
	buffer.setSubData(0, data);
	console.log('UniformBuffer', buffer);
	console.log(`// makeUniformBuffer end /////////////////////////////////////////////////////////////`);
	return buffer
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
	imageCanvas.style.cssText = 'width:768px;height:768px'

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
		format: "bgra8unorm",
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

	device.defaultQueue.submit([commandEncoder.finish()]);

	return texture;
}