import './App.css';
import SampleTexture from "./006_texture/SampleTexture";
import test from "./006_texture/SampleTexture";
import SampleSimpleOOP from "./008_simpleOOP/SampleSimpleOOP";

function App() {
	// console.log(SampleSimpleOop.toString())
	// console.log(SampleSimpleOop())
	// console.log(SampleSimpleOop()._source)
	console.log('SampleTexture',test)
  return (
    <>
      {/*<SampleCheckGPU/>*/}
      {/*<SampleHelloWorld/>*/}
      {/*<SampleVertexBuffer/>*/}
      {/*<SampleTransform/>*/}
      {/*<SampleAttribute/>*/}
      {/*<SampleTexture/>*/}
      {/*<SampleMultiObjectRender/>*/}
			<SampleSimpleOOP/>
    </>
  );
}

export default App;
