import RedGPU from "./src/RedGPU.js";
import RedMesh from "./src/object/RedMesh.js";
import RedStandardMaterial from "./src/material/RedStandardMaterial.js";
import RedRender from "./src/renderer/RedRender.js";
import RedBitmapMaterial from "./src/material/RedBitmapMaterial.js";
import RedCamera from "./src/controller/RedCamera.js";
import RedSphere from "./src/primitives/RedSphere.js";


(async function () {
	const cvs = document.createElement('canvas');
	const glslangModule = await import(/* webpackIgnore: true */ 'https://unpkg.com/@webgpu/glslang@0.0.9/dist/web-devel/glslang.js');
	document.body.appendChild(cvs);

	const glslang = await glslangModule.default();
	console.log(glslang);
	let redGPU = new RedGPU(cvs, glslang);
	redGPU.camera = new RedCamera();
	requestAnimationFrame(function () {
		let MAX = 2000;
		let i = MAX;
		let tMat = new RedStandardMaterial(redGPU, '../assets/Brick03_col.jpg', '../assets/Brick03_nrm.jpg');
		let tMat2 = new RedBitmapMaterial(redGPU, '../assets/UV_Grid_Sm.jpg');
		setInterval(function () {
			i = MAX;
			if (i > 2000) i = 2000;
			while (i--) {
				let testMesh = redGPU.children[i];
				testMesh.material = Math.random() > 0.5 ? tMat : tMat2

			}
		}, 2000);
		if (i > 2000) i = 2000;
		while (i--) {
			let testMesh = new RedMesh(redGPU, new RedSphere(redGPU, Math.random() > 0.5 ? 1 : 0.5), i > MAX / 2 ? tMat : tMat2);
			testMesh.x = Math.random() * 30 - 15;
			testMesh.y = Math.random() * 30 - 15;
			testMesh.z = Math.random() * 30 - 15;
			testMesh.scaleX = testMesh.scaleY = testMesh.scaleZ = Math.random();
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
		const depthTextureView = depthTexture.createView()
		let renderer = new RedRender();
		let render = function (time) {

			redGPU.camera.x = Math.sin(time / 3000) * 20;
			redGPU.camera.y = Math.cos(time / 5000) * 20;
			redGPU.camera.z = Math.cos(time / 3000) * 20;
			redGPU.camera.lookAt(0, 0, 0);
			renderer.render(time, redGPU, depthTextureView);
			let i = MAX;
			// while (i--) {
			// 	redGPU.children[i].rotationX+=1
			// 	redGPU.children[i].rotationY+=1
			// 	redGPU.children[i].rotationZ+=1
			// }
			requestAnimationFrame(render)
		};
		requestAnimationFrame(render)
	}, 1000)

})();
