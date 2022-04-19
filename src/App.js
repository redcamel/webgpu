import './App.css';
import SampleCheckGPU from "./001_checkGPU/SampleCheckGPU.tsx";
import SampleHelloWorld from "./002_helloWorld/SampleHelloWorld";
import SampleVertexBuffer from "./003_vertexBuffer/SampleVertexBuffer";
import SampleTransform from "./004_transform/SampleTransform";
import SampleAttribute from "./005_attribute/SampleAttribute";
import SampleTexture from "./006_texture/SampleTexture";
import SampleMultiObjectRender from "./007_multiObjectRender/SampleMultiObjectRender";
function App() {
	// console.log(SampleMultiObjectRender.toString())
	// console.log(SampleMultiObjectRender())
	// console.log(SampleMultiObjectRender()._source)
	// console.log('SampleTexture',test.toString())
  return (
    <>
      {/*<SampleCheckGPU/>*/}
      {/*<SampleHelloWorld/>*/}
      {/*<SampleVertexBuffer/>*/}
      {/*<SampleTransform/>*/}
      {/*<SampleAttribute/>*/}
      {/*<SampleTexture/>*/}
      <SampleMultiObjectRender/>
    </>
  );
}

export default App;
