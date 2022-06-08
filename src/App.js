import './App.css';
import SampleTexture from "./006_texture/SampleTexture";
import test from "./006_texture/SampleTexture";
import SampleIndexBuffer from "./009_indexBuffer/SampleIndexBuffer";
import SampleSimpleLight from "./010_simpleLight/SampleSimpleLight";

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
			{/*<SampleSimpleLight/>*/}
			{/*<SampleMultiObjectRender/>*/}
			{/*<SampleIndexBuffer/>*/}
			<SampleSimpleLight/>
			{/*<SampleSimpleOOP/>*/}
		</>
	);
}

export default App;
