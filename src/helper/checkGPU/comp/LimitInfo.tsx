import IWebGPUInitInfo from "../IWebGPUInitInfo";

import "./LimitInfo.css"
interface IProps{
    initInfo :IWebGPUInitInfo
}
const LimitInfo = (props:IProps) => {
    const {limits} = props.initInfo.device
    console.log(limits)
    const list = []
    for (const k in limits) {
        list.push(
            <div className={'LimitInfoItem'}>
                {k} : <span>{limits[k].toLocaleString()}</span>
            </div>
        )
    }
    return <div className={'LimitInfoContainer'}>
        <div className={'LimitInfoTitle'}>LimitInfo</div>
        <div>{list}</div>
    </div>
}
export default LimitInfo


