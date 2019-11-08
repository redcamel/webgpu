// gpu엔 뭐가 있나...
// requestAdapter를 가지는 GPU객체를 반환해 주는군...

let gpu = navigator.gpu;
console.log(gpu);

function init(glslang) {
	console.log(glslang)
	gpu.requestAdapter().then(adapter => {
		console.log('adapter', adapter)
		adapter.requestDevice().then(device => {
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
			const vec2 pos[3] = vec2[3](vec2(0.0f, 0.5f), vec2(-0.5f, -0.5f), vec2(0.5f, -0.5f));
			void main() {
				gl_Position = uniforms.modelViewProjectionMatrix * vec4(pos[gl_VertexIndex], 0.0, 1.0);
			}
			`;

			const fragmentShaderGLSL = `#version 450
	          layout(location = 0) out vec4 outColor;
	          void main() {
	              outColor = vec4(1.0+gl_FragCoord.x/500.0, gl_FragCoord.y/768.0, 0.0, 1.0);
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
			 * 유니폼 바운드 그룹을 정함 뭔가. GLTF 로우데이터 같다 ;;;
			 * 만들고 파이프라인 바인딩 그룹에 넣어줌
			 */

			const uniformsBindGroupLayout = device.createBindGroupLayout({
				bindings: [{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer"
				}]
			});
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
			const matrixSize = 4 * 16 * (MAX - 1); // 4x4 matrix
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
					position: [Math.random() * 30 - 15, Math.random() * 30 - 15, -15],
					rotations: [(Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI * 2],
					uniformBindGroupData: tData,
					uniformBindGroup: device.createBindGroup({
						layout: uniformsBindGroupLayout,
						bindings: [tData]
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
		});
	}).catch(error => {
		console.log(error)
		alert('WebGPU is unsupported, or no adapters or devices are available.')

	});
}

glslang().then(init)