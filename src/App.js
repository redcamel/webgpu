import './App.css';
import SampleCheckGPU from "./001_checkGPU/SampleCheckGPU.tsx";
import SampleHelloWorld from "./002_helloWorld/SampleHelloWorld";
import SampleVertexBuffer from "./003_vertexBuffer/SampleVertexBuffer";
import SampleTransform from "./004_transform/SampleTransform";
function App() {
  return (
    <>
      {/*<SampleCheckGPU/>*/}
      {/*<SampleHelloWorld/>*/}
      {/*<SampleVertexBuffer/>*/}
      <SampleTransform/>
    </>
  );
}

export default App;
