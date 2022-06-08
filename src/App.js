import './App.css';
import SampleTexture from "./006_texture/SampleTexture";
import SampleIndexBuffer from "./009_indexBuffer/SampleIndexBuffer";
import SampleSimpleLight from "./010_simpleLight/SampleSimpleLight";
import SampleCheckGPU from "./001_checkGPU/SampleCheckGPU";
import SampleHelloWorld from "./002_helloWorld/SampleHelloWorld";
import SampleVertexBuffer from "./003_vertexBuffer/SampleVertexBuffer";
import SampleTransform from "./004_transform/SampleTransform";
import SampleAttribute from "./005_attribute/SampleAttribute";
import SampleMultiObjectRender from "./008_multiObjectRender/SampleMultiObjectRender";
import {useEffect, useState} from "react";

function App() {
	const [idx, setIdx] = useState(0)
	const sampleList = [
		['SampleHelloWorld', SampleHelloWorld],
		['SampleVertexBuffer', SampleVertexBuffer],
		['SampleTransform', SampleTransform],
		['SampleAttribute', SampleAttribute],
		['SampleTexture', SampleTexture],
		['SampleSimpleLight', SampleSimpleLight],
		['SampleMultiObjectRender', SampleMultiObjectRender],
		['SampleIndexBuffer', SampleIndexBuffer],
	]
	const Comp = sampleList[idx][1]
	useEffect(() => {
		const idx = +(window.location.search?.replace('?idx=', '') || 0);
		setIdx(idx);
	}, []);
	return (
		<>
			<select value={idx} onChange={e => setIdx(+e.target.value)} style={{margin : '10px',fontSize: '11px',padding : '4px'}}>
				{
					sampleList.map((v, index) => <option value={index}>{v[0]}</option>)
				}
			</select>
			<Comp/>
		</>
	);
}

export default App;
