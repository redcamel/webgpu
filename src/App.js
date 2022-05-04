import './App.css';
import SampleTexture from "./006_texture/SampleTexture";
import test from "./006_texture/SampleTexture";
import SampleVertexBuffer from "./003_vertexBuffer/SampleVertexBuffer";
import SampleTransform from "./004_transform/SampleTransform";
import SampleAttribute from "./005_attribute/SampleAttribute";
import SampleMultiObjectRender from "./007_multiObjectRender/SampleMultiObjectRender";
import SampleSimpleOOP from "./008_simpleOOP/SampleSimpleOOP";
import SampleHelloWorld from "./002_helloWorld/SampleHelloWorld";

function App() {
	// console.log(SampleSimpleOop.toString())
	// console.log(SampleSimpleOop())
	// console.log(SampleSimpleOop()._source)
	console.log('SampleTexture', test)
	return (
		<>
			{/*<SampleCheckGPU/>*/}
			{/*<SampleHelloWorld/>*/}
			{/*<SampleVertexBuffer/>*/}
			{/*<SampleTransform/>*/}
			{/*<SampleAttribute/>*/}
			{/*<SampleTexture/>*/}
			<SampleMultiObjectRender/>
			{/*<SampleSimpleOOP/>*/}
		</>
	);
}

export default App;
