import './App.css';
import SampleCheckGPU from "./001_checkGPU/SampleCheckGPU.tsx";
import SampleHelloWorld from "./002_helloWorld/SampleHelloWorld";
import SampleVertexBuffer from "./003_vertexBuffer/SampleVertexBuffer";
import test from './003_vertexBuffer/SampleVertexBuffer.tsx';
function App() {

  return (
    <>
      {/*<SampleCheckGPU/>*/}
      {/*<SampleHelloWorld/>*/}
      <SampleVertexBuffer/>
      {test.toString()}

    </>
  );
}

export default App;
