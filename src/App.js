import './App.css';
import SampleCheckGPU from "./001_checkGPU/SampleCheckGPU.tsx";
import SampleHelloWorld from "./002_helloWorld/SampleHelloWorld";
import SampleVertexBuffer from "./003_vertexBuffer/SampleVertexBuffer";
import SampleTransform from "./004_transform/SampleTransform";
import SampleAttribute from "./005_attribute/SampleAttribute";
import SampleTexture from "./006_texture/SampleTexture";
function App() {
	console.log(SampleTexture.toString())
	console.log(SampleTexture())
	console.log(SampleTexture()._source)
  return (
    <>
      {/*<SampleCheckGPU/>*/}
      {/*<SampleHelloWorld/>*/}
      {/*<SampleVertexBuffer/>*/}
      {/*<SampleTransform/>*/}
      {/*<SampleAttribute/>*/}
      <SampleTexture/>
    </>
  );
}

export default App;
