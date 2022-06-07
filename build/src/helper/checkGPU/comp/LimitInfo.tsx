import IWebGPUInitInfo from "../IWebGPUInitInfo";

import "./LimitInfo.css"
import {useState} from "react";

interface IProps {
    initInfo: IWebGPUInitInfo;
    openYn?: boolean
}

const LimitInfo = (props: IProps) => {
    const [openYn, setOpenYn] = useState(props.openYn)
    const {limits} = props.initInfo.device
    const list = []
    const HD_toggle = () => setOpenYn(!openYn)
    for (const k in limits) {
        list.push(
            <div className={'LimitInfoItem'} key={k}>
                {k} : <span>{limits[k].toLocaleString()}</span>
            </div>
        )
    }
    return <div className={'LimitInfoContainer'}>
        <div className={'LimitInfoTitle'}>LimitInfo <button onClick={HD_toggle}>{openYn ?  'close' : 'open'}</button>
        </div>
        {openYn && <div>{list}</div>}
    </div>
}
export default LimitInfo


