import RedGPU from "./src/RedGPU.js";
import RedMesh from "./src/RedMesh.js";
import RedBitmapMaterial from "./src/RedBitmapMaterial.js";
import RedRender from "./src/RedRender.js";


(async function () {
	const cvs = document.createElement('canvas')
	const glslangModule = await import(/* webpackIgnore: true */ 'https://unpkg.com/@webgpu/glslang@0.0.9/dist/web-devel/glslang.js');
	document.body.appendChild(cvs)

	const glslang = await glslangModule.default();
	console.log(glslang)
	let redGPU = new RedGPU(cvs, glslang)
	requestAnimationFrame(function () {
		let i = 1000;
		let tMat = new RedBitmapMaterial(redGPU, '../assets/crate.png')
		let tMat2 = new RedBitmapMaterial(redGPU, '../assets/UV_Grid_Sm.jpg')
		if (i > 2000) i = 2000
		while (i--) {
			let testMesh = new RedMesh(redGPU, Math.random()>0.5 ? tMat : tMat2)
			testMesh.x = Math.random() * 30 - 15
			testMesh.y = Math.random() * 30 - 15
			testMesh.z =  Math.random() * 30 - 15
			testMesh.scaleX = testMesh.scaleY = testMesh.scaleZ = Math.random()
			redGPU.addChild(testMesh)
		}
		const depthTexture = redGPU.device.createTexture({
			size: {
				width: cvs.width,
				height: cvs.height,
				depth: 1
			},
			format: "depth24plus-stencil8",
			usage: GPUTextureUsage.OUTPUT_ATTACHMENT
		});
		let renderer = new RedRender()
		let render = function (time) {
			renderer.render(time, redGPU, depthTexture)
			requestAnimationFrame(render)
		}
		requestAnimationFrame(render)
	}, 1000)

})();
