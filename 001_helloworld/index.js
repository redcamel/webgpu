

// gpu엔 뭐가 있나...
// requestAdapter를 가지는 GPU객체를 반환해 주는군...

glslang().then(function (glslang) {
	let gpu = navigator.gpu;
	let swapChain;
	console.log(gpu);


	const vertexShaderGLSL = `#version 450
          const vec2 pos[3] = vec2[3](vec2(0.0f, 0.5f), vec2(-0.5f, -0.5f), vec2(0.5f, -0.5f));
          void main() {
              gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
          }
        `;

	const fragmentShaderGLSL = `#version 450
          layout(location = 0) out vec4 outColor;
          void main() {
              outColor = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `;


// gpu객체에서 어댑터를 얻어와야한다.
	gpu.requestAdapter().then(adapter => {

		console.log('adapter', adapter)
		// ??? 어댑터는 시스템상에 구현된 webGPU의 구현을 나타난다고 한다. (정확히 먼소린지는 알아봐야겠군..)
		// 어댑터를 얻어와서 디바이스를 또 요청해야함
		adapter.requestDevice().then(device => {
			console.log('device', device)
			// GPUAdapter를 반환하는데 어떤 어댑터를 가지고 왔는지와
			// lost 핸들링 프라미스를 가진 GPUDevice  인스턴스가 반환됨
			// 실질적인 GPU 명령 집합체군..

			// 디바이스를 얻었으면 캔버스와 연결을 해야하나봄봄
			const canvas = document.querySelector('canvas');
			const context = canvas.getContext('gpupresent');
			const swapChainFormat = "bgra8unorm";
			const swapChainDescriptor = {
				device: device,
				format:swapChainFormat
			};
			// 캔버스 컨텍스트를 실제로 구성하나봄
			swapChain = context.configureSwapChain(swapChainDescriptor);
			console.log(swapChain)

			/**
			 * 컴파일 과정이군...
			 **/
			const shaderModuleDescriptor_vertex = {
				code: glslang.compileGLSL(vertexShaderGLSL, "vertex"),
				source : vertexShaderGLSL
			};
			console.log(shaderModuleDescriptor_vertex)
			const shaderModule_vertex = device.createShaderModule(shaderModuleDescriptor_vertex);
			console.log('shaderModule_vertex', shaderModule_vertex)
			const shaderModuleDescriptor_fragment = {
				code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),
				source : fragmentShaderGLSL
			};
			console.log(shaderModuleDescriptor_fragment)
			const shaderModule_fragment = device.createShaderModule(shaderModuleDescriptor_fragment);
			console.log('shaderModule_fragment', shaderModule_fragment)
			/**
			 * 파이프 라인이란걸 만드어야 되나봄
			 * */
			const pipeline = device.createRenderPipeline({
				// 레이아웃은 아직 뭔지 모르곘고
				layout: device.createPipelineLayout({bindGroupLayouts: []}),
				// 버텍스와 프레그먼트는 아래와 같이 붙인다..
				vertexStage : {
					module : shaderModule_vertex,
					entryPoint : 'main'
				},
				fragmentStage : {
					module : shaderModule_fragment,
					entryPoint : 'main'
				},
				// 컬러모드 지정하고
				colorStates :[
					{
						format : swapChainFormat
					}
				],
				// 드로잉 방법을 결정함
				primitiveTopology : 'triangle-list'
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
			 * 이제 실제로 그려야함
			 */
			function draw(time){
				const commandEncoder = device.createCommandEncoder({}); // 이건또뭐야!
				const textureView = swapChain.getCurrentTexture().createView();
				const renderPassDescriptor = {
					colorAttachments: [{
						attachment: textureView,
						loadValue: { r: Math.cos(time/1000), g: Math.sin(time/1000), b: 0.0, a: 1.0 },
					}],
				};
				const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
				passEncoder.setPipeline(pipeline);
				passEncoder.draw(3, 1, 0, 0);
				passEncoder.endPass();

				device.getQueue().submit([commandEncoder.finish()]);
				requestAnimationFrame(draw)
			}
			requestAnimationFrame(draw)
		});
	}).catch(error => {
		console.log(error)
		alert('WebGPU is unsupported, or no adapters or devices are available.')

	});

})