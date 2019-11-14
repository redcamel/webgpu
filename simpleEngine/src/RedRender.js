export default class RedRender {
	render(time, redGPU, depthTexture) {
		let projectionMatrix = mat4.create();
		let aspect = Math.abs(redGPU.canvas.width / redGPU.canvas.height);
		mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 0.1, 100.0);

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
		let i = redGPU.children.length
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


			let modelMatrix = tMesh.localMatrix
			mat4.identity(modelMatrix);
			mat4.translate(modelMatrix, modelMatrix, [tMesh.x, tMesh.y, tMesh.z]);
			mat4.rotateX(modelMatrix, modelMatrix, time / 1000);
			mat4.rotateY(modelMatrix, modelMatrix, time / 1000);
			mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
			mat4.multiply(modelMatrix, projectionMatrix, modelMatrix)
			// mat4.scale(modelMatrix, modelMatrix, [1, 1, 1]);
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
				tMesh.uniformBuffer.setSubData(0, modelMatrix);
				passEncoder.drawIndexed(tMesh.geometry.indexBuffer.pointNum, 1, 0, 0, 0);

			}


		}
		passEncoder.endPass();

		const test = commandEncoder.finish();
		redGPU.device.getQueue().submit([test]);
	}
}