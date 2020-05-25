const ready = glslang();
ready.then(init);
const vertexShaderGLSL = `
	#version 450
	layout(location = 0) in vec4 position;
	void main() {
		gl_Position = position;
	}
			`;
const fragmentShaderGLSL = `
	#version 450
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor = vec4(1.0, 0.0, 0.0, 1.0);
	}
`;

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
	cvs.width = 1024;
	cvs.height = 768;
	document.body.appendChild(cvs);
	const ctx = cvs.getContext('gpupresent');
	console.log(cvs)
	console.log('ctx', ctx);
	const swapChainFormat = "bgra8unorm";
	const swapChain = configureSwapChain(device, swapChainFormat, ctx);
	console.log('ctx', ctx);
	console.log('swapChain', swapChain);

	// 쉐이더를 이제 만들어야함.
	let vShaderModule = makeShaderModule_GLSL(glslang, device, 'vertex', vertexShaderGLSL);
	let fShaderModule = makeShaderModule_GLSL(glslang, device, 'fragment', fragmentShaderGLSL);

	// 쉐이더 모듈을 만들었으니 버텍스 버퍼를 만들어볼꺼임
	let vertexBuffer = makeVertexBuffer(
		device,
		new Float32Array(
			[
				-1.0, -1.0, 0.0, 1.0,
				0.0, 1.0, 0.0, 1.0,
				1.0, -1.0, 0.0, 1.0
			]
		)
	);

	// 그리기위해서 파이프 라인이란걸 또만들어야함 -_-;;
	const pipeline = device.createRenderPipeline({
		// 레이아웃은 아직 뭔지 모르곘고
		layout: device.createPipelineLayout({bindGroupLayouts: []}),
		// 버텍스와 프레그먼트는 아래와 같이 붙인다..
		vertexStage: {
			module: vShaderModule,
			entryPoint: 'main'
		},
		fragmentStage: {
			module: fShaderModule,
			entryPoint: 'main'
		},
		vertexState: {
			indexFormat: 'uint32',
			vertexBuffers: [
				{
					arrayStride: 4 * 4,
					attributes: [
						{
							// position
							shaderLocation: 0,
							offset: 0,
							format: "float4"
						}
					]
				}
			]
		},
		// 컬러모드 지정하고
		colorStates: [
			{
				format: swapChainFormat
			}
		],
		// 드로잉 방법을 결정함
		primitiveTopology: 'triangle-list',
		/*
		GPUPrimitiveTopology {
			"point-list",
			"line-list",
			"line-strip",
			"triangle-list",
			"triangle-strip"
		};
		 */
	});

	let render = function () {
		const commandEncoder = device.createCommandEncoder();
		const textureView = swapChain.getCurrentTexture().createView();
		// console.log(swapChain.getCurrentTexture())
		const renderPassDescriptor = {
			colorAttachments: [{
				attachment: textureView,
				loadValue: {r: 1, g: 1, b: 0.0, a: 0.0},
			}]
		};
		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
		passEncoder.setVertexBuffer(0, vertexBuffer);
		passEncoder.setPipeline(pipeline);
		passEncoder.draw(3, 1, 0, 0);
		passEncoder.endPass();
		const test = commandEncoder.finish();
		console.log(device)
		device.defaultQueue.submit([test]);
	};
	requestAnimationFrame(render)

}

function configureSwapChain(device, swapChainFormat, context) {
	const swapChainDescriptor = {
		device: device,
		format: swapChainFormat,
	};
	console.log(context)
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

