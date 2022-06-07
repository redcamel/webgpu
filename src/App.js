import './App.css';
import SampleTexture from "./006_texture/SampleTexture";
import test from "./006_texture/SampleTexture";
import SampleIndexBuffer from "./009_indexBuffer/SampleIndexBuffer";

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
			{/*<SampleIndexBuffer/>*/}
			{/*<SampleMultiObjectRender/>*/}
			<SampleIndexBuffer/>
			{/*<SampleSimpleOOP/>*/}
		</>
	);
}

export default App;
