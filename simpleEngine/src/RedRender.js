export default class RedRender {
	render(time, redGPU, depthTexture) {
		let projectionMatrix = mat4.create();
		let aspect = Math.abs(redGPU.canvas.width / redGPU.canvas.height);
		mat4.perspective(projectionMatrix, (Math.PI / 180) * 60, aspect, 0.01, 10000.0);

		let cameraMatrix = mat4.create()
		var up = new Float32Array([0, 1, 0]);
		var tPosition = [0, 0, 0];
		mat4.lookAt(cameraMatrix, [Math.sin(time / 5000) * 15, Math.cos(time / 3000) * 15, Math.sin(time / 2500) * 15], tPosition, up);

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
		let prevPipeline;
		let prevVertexBuffer
		let prevIndexBuffer
		let prevBindBuffer
		let projectCameraMTX = mat4.create()
		mat4.multiply(projectCameraMTX, projectionMatrix, cameraMatrix)
		passEncoder.setBindGroup(1, redGPU.system_bindGroup)
		redGPU.system_uniformBuffer.setSubData(0, projectionMatrix);
		redGPU.system_uniformBuffer.setSubData(4 * 4 * Float32Array.BYTES_PER_ELEMENT, cameraMatrix);
		while (i--) {
			let tMesh = redGPU.children[i]
			if (tMesh.isDirty) {
				tMesh.getTransform()
				tMesh.uniformBuffer.setSubData(0, tMesh.localMatrix)
				tMesh.rotationX+=1

			}
			if (!tMesh.pipeline) tMesh.createPipeline(redGPU)
			if (prevPipeline != tMesh.pipeline) passEncoder.setPipeline(prevPipeline = tMesh.pipeline);
			if (prevVertexBuffer != tMesh.geometry.vertexBuffer) passEncoder.setVertexBuffer(0, prevVertexBuffer = tMesh.geometry.vertexBuffer);
			if (prevIndexBuffer != tMesh.geometry.indexBuffer) passEncoder.setIndexBuffer(prevIndexBuffer = tMesh.geometry.indexBuffer);

			///////////////////////////////////////////////////////////////////////////
			// Chrome currently crashes with |setSubData| too large.
			///////////////////////////////////////////////////////////////////////////
			if (tMesh.material.bindings) {
				tMesh.material.bindings[0]['resource']['buffer'] = tMesh.uniformBuffer
				if (!tMesh.uniformBindGroup) {
					tMesh.uniformBindGroup = redGPU.device.createBindGroup(
						{
							layout: tMesh.material.uniformsBindGroupLayout,
							bindings: tMesh.material.bindings
						}
					)
				}

				// if (prevBindBuffer != tMesh.uniformBindGroup)
				passEncoder.setBindGroup(0, prevBindBuffer = tMesh.uniformBindGroup);


				passEncoder.drawIndexed(tMesh.geometry.indexBuffer.pointNum, 1, 0, 0, 0);

			}
			tMesh.isDirty = false
		}
		passEncoder.endPass();

		const test = commandEncoder.finish();
		redGPU.device.getQueue().submit([test]);

	}
}