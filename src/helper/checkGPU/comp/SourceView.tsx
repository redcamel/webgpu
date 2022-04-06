import {useEffect, useState} from "react";

interface IProps {
    dataList: any
}

const SourceView = (props: IProps) => {
    const [sourceList, setSourceList] = useState<any[]>([])
    useEffect(() => {
        Promise.all(props.dataList.map((v: any) => fetch(v['url']).then(v => v.text()))).then(v => {
            console.log(v)
            setSourceList(v)
        })
    }, [])
    return <div style={styleContainer}>
        {props.dataList.map((v:any, index:number) => {
            return <div key={index}>
                <h2>{v['label']}</h2>
                {sourceList[index]}
            </div>
        })}
    </div>
}
export default SourceView
const styleContainer = {
    margin : '10px',
    padding : '10px',
    borderRadius : '8px',
    border : '1px  solid #eee'
}


