import {useEffect, useRef, useState} from "react";

import checkGPU from "../helper/checkGPU/checkGPU";
import LimitInfo from "../helper/checkGPU/LimitInfo";
interface IResult{
    passYn: boolean;
    gpu:any;
    adapter:any;
    device:any;
}
const SampleCheckGPU = () => {
    const cvsRef = useRef();
    const [initInfo, setInitInfo] = useState<IResult>()
    useEffect(() => {
        checkGPU()
            .then(result => setInitInfo(result))
            .catch(result => setInitInfo(result))
    }, [])
    return <div>
        {/*<canvas ref={cvsRef}/>*/}
        {initInfo && initInfo['passYn'] &&  <LimitInfo initInfo={initInfo}/>}
        {/*{initInfo && !initInfo['passYn'] && <FailMsg/>}*/}
    </div>
}
export default SampleCheckGPU