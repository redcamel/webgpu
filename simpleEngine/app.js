import RedGPU from "./src/RedGPU.js";
import RedMesh from "./src/RedMesh.js";
import RedStandardMaterial from "./src/material/RedStandardMaterial.js";
import RedRender from "./src/RedRender.js";
import RedBitmapMaterial from "./src/material/RedBitmapMaterial.js";


(async function () {
	const cvs = document.createElement('canvas')
	const glslangModule = await import(/* webpackIgnore: true */ 'https://unpkg.com/@webgpu/glslang@0.0.9/dist/web-devel/glslang.js');
	document.body.appendChild(cvs)

	const glslang = await glslangModule.default();
	console.log(glslang)
	let redGPU = new RedGPU(cvs, glslang)
	requestAnimationFrame(function () {
		let MAX = 2000
		let i = MAX;
		let tMat = new RedStandardMaterial(redGPU, '../assets/Brick03_col.jpg', '../assets/Brick03_nrm.jpg');
		let tMat2 = new RedBitmapMaterial(redGPU, '../assets/UV_Grid_Sm.jpg');
		if (i > 2000) i = 2000
		while (i--) {
			let testMesh = new RedMesh(redGPU, i > MAX / 2 ? tMat : tMat2)
			testMesh.x = Math.random() * 30 - 15
			testMesh.y = Math.random() * 30 - 15
			testMesh.z = Math.random() * 30 - 15
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
			let i = MAX
			// while (i--) {
			// 	redGPU.children[i].rotationX+=1
			// 	redGPU.children[i].rotationY+=1
			// 	redGPU.children[i].rotationZ+=1
			// }
			requestAnimationFrame(render)
		}
		requestAnimationFrame(render)
	}, 1000)

})();
