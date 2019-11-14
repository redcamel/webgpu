export default class RedRender {
	render(time, redGPU, depthTexture) {
		let projectionMatrix = mat4.create();
		let aspect = Math.abs(redGPU.canvas.width / redGPU.canvas.height);
		mat4.perspective(projectionMatrix, ( Math.PI/180) *60, aspect, 0.01, 10000.0);

		let cameraMatrix = mat4.create()
		var up = new Float32Array([0, 1, 0]);
		var tPosition = [0,0,0];
		mat4.lookAt(cameraMatrix, [Math.sin(time/5000)*15,Math.cos(time/3000)*15,Math.sin(time/2500)*15], tPosition, up);

		const swapChainTexture = redGPU.swapChain.getCurrentTexture();
		const commandEncoder = redGPU.device.createCommandEncoder();
		const textureView = swapChainTexture.createView();
		// console.log(swapChain.getCurrentTexture())
		const renderPassDescriptor = {
			colorAttachments: [{
				attachment: textureView,
				loadValue: {r: 1, g: 1, b: 0.0, a: 1.0}
			}],
			depthStencilAttachment: {
				attachment: depthTexture.createView(),
				depthLoadValue: 1.0,
				depthStoreOp: "store",
				stencilLoadValue: 0,
				stencilStoreOp: "store",
			}
		};
		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
		passEncoder.setViewport(0, 0, redGPU.canvas.width, redGPU.canvas.height,0,1)
		passEncoder.setScissorRect(0, 0, redGPU.canvas.width, redGPU.canvas.height)
		let i = redGPU.children.length
		let tempMTX = mat4.create()
		while (i--) {
			let tMesh = redGPU.children[i]
			if (tMesh.isDirty) {
				tMesh.calculateLocalMatrix()
				tMesh.isDirty = false
				// console.log(tMesh.localMatrix)
			}
			if (!tMesh.pipeline) tMesh.pipeline = tMesh.createPipeline(redGPU)
			const pipeline = tMesh.pipeline
			passEncoder.setPipeline(pipeline);
			passEncoder.setVertexBuffer(0, tMesh.geometry.vertexBuffer);
			passEncoder.setIndexBuffer(tMesh.geometry.indexBuffer);



			mat4.identity(tempMTX);
			mat4.translate(tempMTX, tempMTX, [tMesh.x, tMesh.y, tMesh.z]);
			mat4.rotateX(tempMTX, tempMTX, time / 1000);
			mat4.rotateY(tempMTX, tempMTX, time / 1000);
			mat4.rotateZ(tempMTX, tempMTX, time / 1000);
			mat4.scale(tempMTX, tempMTX, [tMesh.scaleX, tMesh.scaleY, tMesh.scaleZ]);
			mat4.multiply(tempMTX, cameraMatrix, tempMTX)
			mat4.multiply(tempMTX, projectionMatrix, tempMTX)

			// mat4.scale(tempMTX, tempMTX, [1, 1, 1]);
			///////////////////////////////////////////////////////////////////////////
			// Chrome currently crashes with |setSubData| too large.
			///////////////////////////////////////////////////////////////////////////
			if (tMesh.material.bindings) {

				tMesh.material.bindings[0]['resource']['buffer'] = tMesh.uniformBuffer
				if (!tMesh.uniformBindBuffer) {
					tMesh.uniformBindBuffer = redGPU.device.createBindGroup(
						{
							layout: tMesh.material.uniformsBindGroupLayout,
							bindings: tMesh.material.bindings
						}
					)
				}
				passEncoder.setBindGroup(0, tMesh.uniformBindBuffer);
				tMesh.uniformBuffer.setSubData(0, tempMTX);
				passEncoder.drawIndexed(tMesh.geometry.indexBuffer.pointNum, 1, 0, 0, 0);

			}


		}
		passEncoder.endPass();

		const test = commandEncoder.finish();
		redGPU.device.getQueue().submit([test]);
	}
}