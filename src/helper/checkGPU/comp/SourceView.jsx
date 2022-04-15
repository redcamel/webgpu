import {useEffect, useState} from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
const SourceView = (props) => {
	const [sourceList, setSourceList] = useState([])
	let {dataList} = props
	dataList = dataList.filter(Boolean)
	useEffect(() => {
		Promise.all(dataList.map((v) => fetch(v['url']).then(v => v.text()))).then(v => {
			console.log(v)
			setSourceList(v)
		})
	}, [])
	useEffect(() => {
		if (sourceList.length) Prism.highlightAll()
	}, [sourceList])
	return <div style={styleContainer}>
		{dataList.map((v, index) => {
			return (
				<div key={index}>
					<h2>{v['label']}</h2>
					<pre style={{borderRadius:'6px'}}>
                <code className="language-js" >
                {sourceList[index]}
                </code>
            </pre>
				</div>
			)
		})}

	</div>
}
export default SourceView
const styleContainer = {
	display: 'flex',
	flexDirection: 'column',
	margin: '10px',
	padding: '10px',
	borderRadius: '8px',
	border: '1px  solid #eee'
}


