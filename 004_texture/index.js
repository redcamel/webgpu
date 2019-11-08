async function createTextureFromImage(device, src, usage) {
	// 귀찮아서 텍스쳐 맹그는 놈은 들고옴
	const img = document.createElement('img');
	console.log('여긴오곘고')
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


let gpu = navigator.gpu;
console.log(gpu);

async function init(glslang) {
	console.log(glslang)
	const adapter = await gpu.requestAdapter();
	console.log('adapter', adapter)
	const device = await adapter.requestDevice();

	async function aaaaaa(device) {

		console.log('device', device)
		const canvas = document.querySelector('canvas');
		const context = canvas.getContext('gpupresent');
		const swapChainFormat = "bgra8unorm";
		const swapChainDescriptor = {
			device: device,
			format: swapChainFormat
		};
		let swapChain;
		const vertexShaderGLSL = `#version 450
	          layout(set = 0, binding = 0) uniform Uniforms {
				mat4 modelViewProjectionMatrix;
			} uniforms;
		    layout(location = 0) in vec4 position;
		    layout(location = 1) in vec4 color;
		    layout(location = 2) in vec2 uv;
		    layout(location = 0) out vec4 fColor;
		    layout(location = 1) out vec2 fUv;
			void main() {
				gl_Position = uniforms.modelViewProjectionMatrix * position;
				fColor = color;
				fUv = uv;
			}
			`;

		const fragmentShaderGLSL = `#version 450
			  layout(set = 0, binding = 1) uniform sampler uSampler;
			  layout(set = 0, binding = 2) uniform texture2D uDiffuseTexture ;
	          layout(location = 0) out vec4 outColor;
	          layout(location = 0) in vec4 fColor;
	          layout(location = 1) in vec2 fUv;
	          void main() {
	              // outColor = fColor;
	              outColor = texture(sampler2D(uDiffuseTexture, uSampler), fUv);
	          }
	        `;
		// 캔버스 컨텍스트를 실제로 구성하나봄
		swapChain = context.configureSwapChain(swapChainDescriptor);
		console.log(swapChain)


		/**
		 * 컴파일 과정이군...
		 **/
		const shaderModuleDescriptor_vertex = {
			code: glslang.compileGLSL(vertexShaderGLSL, "vertex"),
			source: vertexShaderGLSL
		};
		console.log(shaderModuleDescriptor_vertex)
		const shaderModule_vertex = device.createShaderModule(shaderModuleDescriptor_vertex);
		console.log('shaderModule_vertex', shaderModule_vertex)
		const shaderModuleDescriptor_fragment = {
			code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),
			source: fragmentShaderGLSL
		};
		console.log(shaderModuleDescriptor_fragment)
		const shaderModule_fragment = device.createShaderModule(shaderModuleDescriptor_fragment);
		console.log('shaderModule_fragment', shaderModule_fragment)


		/**
		 * 버텍스 버퍼를 만들어 볼꺼임
		 */
		const triangleArray = new Float32Array([
			-0.5, -0.5, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0,       0.5,0.0,
			0.0,  0.5, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0,     0.0,1.0,
			0.5, -0.5, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0,      1.0,1.0
		])
		const verticesBuffer = device.createBuffer({
			size: triangleArray.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		verticesBuffer.setSubData(0, triangleArray);
		console.log('verticesBuffer', verticesBuffer)

		/**
		 * 텍스쳐를 만들어보자
		 */
		const cubeTexture = await createTextureFromImage(device, 'crate.png', GPUTextureUsage.SAMPLED);
		// 오홍 샘플러도 나눠지넹
		const sampler = device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter:"linear"
		});
		console.log('cubeTexture', cubeTexture)
		/**
		 * 유니폼 바운드 그룹을 정함 뭔가. GLTF 로우데이터 같다 ;;;
		 * 만들고 파이프라인 바인딩 그룹에 넣어줌
		 */
		const uniformsBindGroupLayout = device.createBindGroupLayout({
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
					}, {
						binding: 2,
						visibility: GPUShaderStage.FRAGMENT,
						type: "sampled-texture"
					}
				]
			})
		;
		/**
		 * 파이프 라인이란걸 만드어야 되나봄
		 * */
		const pipeline = device.createRenderPipeline({
			// 레이아웃은 아직 뭔지 모르곘고
			layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
			// 버텍스와 프레그먼트는 아래와 같이 붙인다..
			vertexStage: {
				module: shaderModule_vertex,
				entryPoint: 'main'
			},
			fragmentStage: {
				module: shaderModule_fragment,
				entryPoint: 'main'
			},
			// 컬러모드 지정하고
			colorStates: [
				{
					format: swapChainFormat,
					alphaBlend: {
						srcFactor: "src-alpha",
						dstFactor: "one-minus-src-alpha",
						operation: "add"
					}
				}
			],
			// 버텍스 인풋이 어떻게 되는지 입력해야함
			vertexInput: {
				vertexBuffers: [{
					stride: 10 * 4,
					attributeSet: [
						{
							// position
							shaderLocation: 0,
							offset: 0,
							format: "float4"
						},
						{
							// color
							shaderLocation: 1,
							offset: 4 * 4,
							format: "float4"
						},
						{
							// uv
							shaderLocation: 2,
							offset: 8 * 4,
							format: "float2"
						}
					]
				}]
			},

			// 드로잉 방법을 결정함
			primitiveTopology: 'triangle-list'
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
		console.log(pipeline)


		/**
		 * 매트릭스를 가져와야겠군..
		 */


		const aspect = Math.abs(canvas.width / canvas.height);

		let projectionMatrix = new Float32Array(16);
		let viewMatrix = new Float32Array(16);


		/**
		 * 유니폼을 어떻게 바인딩 하나 봐야함
		 */
		const MAX = 500
		const matrixSize = 4 * 16 ; // 4x4 matrix
		const offset = 256; // uniformBindGroup offset must be 256-byte aligned
		const uniformBufferSize = offset * (MAX) + matrixSize;
		const uniformBuffer = device.createBuffer({
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		console.log(uniformBuffer)

		let testData = []
		let i = MAX
		while (i--) {
			let tData = {
				binding: 0,
				resource: {
					buffer: uniformBuffer,
					offset: offset * i,
					size: matrixSize
				}
			}
			testData.push({
				position: [Math.random() * 10 - 5, Math.random() * 10 - 5, -10],
				rotations: [(Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI * 2],
				uniformBindGroupData: tData,
				uniformBindGroup: device.createBindGroup({
					layout: uniformsBindGroupLayout,
					bindings: [
						tData,
						{
							binding: 1,
							resource: sampler,
						},
						{
							binding: 2,
							resource: cubeTexture.createView(),
						}
					]
				})
			})

		}
		console.log(testData)


		/**
		 * 이제 실제로 그려야함
		 */

		function draw(time) {
			//유니폼설정
			mat4.identity(projectionMatrix);
			mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 0.1, 100.0);
			let i = testData.length
			const commandEncoder = device.createCommandEncoder(); // 이건또뭐야!
			const textureView = swapChain.getCurrentTexture().createView();
			const renderPassDescriptor = {
				colorAttachments: [{
					attachment: textureView,
					loadValue: {r: 1, g: 1, b: 0.0, a: 1.0},
				}]
			};
			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
			passEncoder.setPipeline(pipeline);
			// passEncoder.setViewport(0,0,500,768,0,1)
			// passEncoder.setScissorRect(0,0,200+200*Math.abs(Math.sin(time/1000)),768)

			while (i--) {
				viewMatrix[0] = 1, viewMatrix[1] = 0, viewMatrix[2] = 0, viewMatrix[3] = 0
				viewMatrix[4] = 0, viewMatrix[5] = 1, viewMatrix[6] = 0, viewMatrix[7] = 0
				viewMatrix[8] = 0, viewMatrix[9] = 0, viewMatrix[10] = 1, viewMatrix[11] = 0
				viewMatrix[12] = 0, viewMatrix[13] = 0, viewMatrix[14] = 0, viewMatrix[15] = 1
				passEncoder.setVertexBuffer(0, verticesBuffer);
				mat4.translate(viewMatrix, viewMatrix, testData[i]['position']);
				mat4.rotateZ(viewMatrix, viewMatrix, testData[i]['rotations'][0] + time / 1000.0)
				mat4.multiply(viewMatrix, projectionMatrix, viewMatrix);
				passEncoder.setBindGroup(0, testData[i]['uniformBindGroup']);
				uniformBuffer.setSubData(testData[i]['uniformBindGroupData']['resource']['offset'], viewMatrix);
				passEncoder.draw(3, 1, 0, 0);

			}
			passEncoder.endPass();
			let test = commandEncoder.finish();

			device.getQueue().submit([test]);
			requestAnimationFrame(draw)

		}

		requestAnimationFrame(draw)
	}


	aaaaaa(device)
}

glslang().then(init)