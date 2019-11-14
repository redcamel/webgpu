import RedGPU from "./src/RedGPU.js";
import RedMesh from "./src/RedMesh.js";


(async function () {
	const cvs = document.createElement('canvas')
	const glslangModule = await import(/* webpackIgnore: true */ 'https://unpkg.com/@webgpu/glslang@0.0.9/dist/web-devel/glslang.js');
	document.body.appendChild(cvs)

	const glslang = await glslangModule.default();
	console.log(glslang)
	let redGPU = new RedGPU(cvs, glslang)
	requestAnimationFrame(function () {
		let testMesh = new RedMesh(redGPU)
		testMesh.x = Math.random()
		testMesh.y = Math.random()
		testMesh.z = Math.random()
		redGPU.addChild(testMesh)

		let render = function (time) {
			for (const tMesh of redGPU.children) {
				if (tMesh.isDirty) {
					tMesh.calculateLocalMatrix()
					tMesh.isDirty = false
				}
				// console.log(tMesh)
			}
			requestAnimationFrame(render)
		}
		requestAnimationFrame(render)
	})

})();
