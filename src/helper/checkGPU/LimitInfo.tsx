const LimitInfo = ({initInfo}) => {
    const {limits} = initInfo.device
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