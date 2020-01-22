const ready = glslang();
ready.then(init);
const vertexShaderGLSL = `
	#version 450
	layout(location = 0) in vec2 a_particlePos;
	layout(location = 1) in float a_particleAlpha;
	layout(location = 2) in float a_particleScale;
	layout(location = 3) in vec4 movementInfo;
    layout(location = 4) in vec4 a_pos;
    layout(location = 5) in vec2 a_uv;
    layout(location = 0) out float tAlpha;
    layout(location = 1) out vec2 tUV;
	void main() {
		gl_Position = vec4(a_pos.xy * a_particleScale + a_particlePos, 0, 1);
		tAlpha = a_particleAlpha;
		tUV = a_uv;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
    layout(location = 0) in float tAlpha;
    layout(location = 1) in vec2 tUV;
    layout(set = 0, binding = 0) uniform sampler uSampler;
	layout(set = 0, binding = 1) uniform texture2D uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor =  texture(sampler2D(uTexture, uSampler), tUV);
		outColor.a *= tAlpha;
	}
`;
const PARTICLE_NUM = 10000
const computeShader = `
	#version 450
	// 파티클 구조체 선언
	struct Particle {
	    vec2 pos;
	    float alpha;
	    float scale;
	    vec4 movementInfo;
	};
	
	// 이건 설정값인듯 하고
	layout(std140, set = 0, binding = 0) uniform SimParams {
	    float deltaT;
	    float rule1Distance;
	    float rule2Distance;
	    float rule3Distance;
	    float rule1Scale;
	    float rule2Scale;
	    float rule3Scale;
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
		
		vec2 vPos = particlesA.particles[index].pos;
		float alpha = particlesA.particles[index].alpha;
		float scale = particlesA.particles[index].scale;
		vec4 movementInfo = particlesA.particles[index].movementInfo;
	
		// kinematic update
		float movementX = movementInfo.x;
		float speedMovementX =  movementInfo.y;
		float movementY =  movementInfo.z ;
		float speedMovementY =  movementInfo.w;
		vPos.x += (vPos.x + movementX) * speedMovementX;
		vPos.y += (vPos.y + movementY) * speedMovementY;
		alpha -= 0.005;
		if(alpha<0) alpha = 0;
		scale += 0.1;
		
		// Wrap around boundary
		if (vPos.x < -1.0) {
			vPos.x = 0;
			vPos.y = 0;
			alpha = 1;
			scale = 0;
		}
		if (vPos.x > 1.0) {
			vPos.x = 0;
			vPos.y = 0;
			alpha = 1;
			scale = 0;
		}
		if (vPos.y < -1.0) {
			vPos.x = 0;
			vPos.y = 0;
			alpha = 1;
			scale = 0;
		}
		if (vPos.y > 1.0) {
			vPos.x = 0;
			vPos.y = 0;
			alpha = 1;
			scale = 0;
		}
				
		particlesB.particles[index].pos = vPos;				
		particlesB.particles[index].alpha = alpha;
		particlesB.particles[index].scale = scale;
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

	const swapChainFormat = "rgba8unorm";
	const swapChain = configureSwapChain(device, swapChainFormat, ctx);
	console.log('ctx', ctx);
	console.log('swapChain', swapChain);

	// 쉐이더를 이제 만들어야함.
	let vShaderModule = makeShaderModule_GLSL(glslang, device, 'vertex', vertexShaderGLSL);
	let fShaderModule = makeShaderModule_GLSL(glslang, device, 'fragment', fragmentShaderGLSL);
	let computeModule = makeShaderModule_GLSL(glslang, device, 'compute', computeShader);

	let simParamData = new Float32Array(
		[
			0.04,  // deltaT;
			0.1,   // rule1Distance;
			0.025, // rule2Distance;
			0.025, // rule3Distance;
			0.02,  // rule1Scale;
			0.05,  // rule2Scale;
			0.005  // rule3Scale;
		]
	)
	let simParamBuffer = makeUniformBuffer(
		device,
		simParamData
	);
	const initialParticleData = new Float32Array(PARTICLE_NUM * 8);
	for (let i = 0; i < PARTICLE_NUM; ++i) {
		initialParticleData[8 * i + 0] = Math.random() * 2 - 1; //x
		initialParticleData[8 * i + 1] = Math.random() * 2 - 1; //y
		initialParticleData[8 * i + 2] = Math.random() // alpha
		initialParticleData[8 * i + 3] = Math.random()

		initialParticleData[8 * i + 4] = Math.random() > 0.5 ? 0.001 * Math.random() : -0.001 * Math.random() //moveX
		initialParticleData[8 * i + 5] = Math.random() * 0.05
		initialParticleData[8 * i + 6] = Math.random() > 0.5 ? 0.001 * Math.random() : -0.001 * Math.random() //moveY
		initialParticleData[8 * i + 7] = Math.random() * 0.05
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
					arrayStride: 8 * 4,
					stepMode: "instance",
					attributes: [
						{
							// instance position
							shaderLocation: 0,
							offset: 0,
							format: "float2"
						},
						{
							// instance alpha
							shaderLocation: 1,
							offset: 2 * 4,
							format: "float"
						},
						{
							// instance scale
							shaderLocation: 2,
							offset: 3 * 4,
							format: "float"
						},
						{
							// instance movement
							shaderLocation: 3,
							offset: 4 * 4,
							format: "float4"
						}
					],
				},
				{
					// vertex buffer
					arrayStride: 6 * 4,
					stepMode: "vertex",
					attributes: [
						{
							// vertex positions
							shaderLocation: 4,
							offset: 0,
							format: "float4",
						},
						{
							// vertex uv
							shaderLocation: 5,
							offset: 4 * 4,
							format: "float2"
						}
					],
				}
			],
		},

		colorStates: [{
			format: "rgba8unorm",
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
			passEncoder.setBindGroup(0, particleBindGroups[t % 2]);
			passEncoder.dispatch(PARTICLE_NUM);
			passEncoder.endPass();
		}
		{
			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
			passEncoder.setViewport(0, 0, 768, 768,0,1);
			passEncoder.setScissorRect(0, 0, 768, 768);
			passEncoder.setPipeline(renderPipeline);
			passEncoder.setVertexBuffer(0, particleBuffers[(t + 1) % 2]);
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

	device.defaultQueue.submit([commandEncoder.finish()]);

	return texture;
}