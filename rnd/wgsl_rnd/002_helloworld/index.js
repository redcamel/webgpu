import checkGPU from "../helper/checkGPU/checkGPU.js";
import makeFailMsg from "../helper/checkGPU/makeFailMsg.js";
import makeLimitDebug from "../helper/checkGPU/makeLimitDebug.js";
checkGPU()
	.then(async result => {
		console.log('result', result)
		document.body.appendChild(makeLimitDebug(result))
		const {adapter, device} = result
		const cvs = makeCanvas()
		////////////////////////////////////////////////////////////////////////
		// configure
		const ctx = cvs.getContext('webgpu');
		const presentationFormat = ctx.getPreferredFormat(adapter);
		configure(device, presentationFormat, ctx)
		////////////////////////////////////////////////////////////////////////
		// shaderModules
		const vShaderModule = await makeShaderModule(device, "./vertex.wgsl")
		const fShaderModule = await makeShaderModule(device, "./fragment.wgsl")
		console.log(vShaderModule,fShaderModule)
		// pipeline
		const pipeline = device.createRenderPipeline({
			vertex: {
				module: vShaderModule,
				entryPoint: 'main'
			},
			fragment: {
				module: fShaderModule,
				entryPoint: 'main',
				targets: [
					{
						format: presentationFormat,
					},
				],
			},
			primitive: {
				topology: 'triangle-list',
			}
		});
		// render
		const render = () => {
			const commandEncoder = device.createCommandEncoder();
			const textureView = ctx.getCurrentTexture().createView();
			/**
			 *
			 * @type {{colorAttachments: [GPURenderPassColorAttachment]}}
			 */
			const renderPassDescriptor = {
				colorAttachments: [
					{
						view: textureView,
						clearValue: {r: 1.0, g: 1.0, b: 1.0, a: 1.0},
						loadOp: 'clear',
						storeOp: 'store',
					},
				],
			};

			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
			passEncoder.setPipeline(pipeline);
			passEncoder.draw(3, 1, 0, 0);
			passEncoder.end();
			device.queue.submit([commandEncoder.finish()]);
			requestAnimationFrame(render)
		}
		render()
	})
	.catch(_ => makeFailMsg())

async function makeShaderModule(device, sourceSrc) {
	let source
	await fetch(sourceSrc).then(v => v.text()).then(v => source = v)
	const shaderModuleDescriptor = {
		code: source
	};
	const shaderModule = device.createShaderModule(shaderModuleDescriptor);
	return shaderModule;
}

function configure(device, swapChainFormat, context) {
	const configurationDescription = {
		device: device,
		format: swapChainFormat,
	};
	console.log('configurationDescription', configurationDescription);
	return context.configure(configurationDescription);
}

const makeCanvas = () => {
	const cvs = document.createElement('canvas');
	cvs.width = 128;
	cvs.height = 128;
	document.body.appendChild(cvs);
	return cvs
}