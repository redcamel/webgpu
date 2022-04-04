interface IResult{
    passYn: boolean;
    gpu:any;
    adapter:any;
    device:any;
}
interface IProps{
    initInfo :IResult
}
const LimitInfo = (props:IProps) => {
    const {limits} = props.initInfo.device
    console.log(limits)
    const list = []
    for (const k in limits) {
        list.push(
            <div>
                {k} : <span>{limits[k].toLocaleString()}</span>
            </div>
        )
    }
    return <div>
        <div>LimitInfo</div>
        <div>{list}</div>
    </div>
}
export default LimitInfo