import {useEffect, useRef, useState} from "react";
import checkGPU from "../helper/checkGPU/checkGPU.ts";
import FailMsg from "../helper/checkGPU/FailMsg.tsx";
import LimitInfo from "../helper/checkGPU/LimitInfo.tsx";

const SampleCheckGPU = () => {
    const cvsRef = useRef();
    const [initInfo, setInitInfo] = useState()
    useEffect(() => {
        checkGPU()
            .then(result => setInitInfo(result))
            .catch(result => setInitInfo(result))
    }, [])
    return <div>
        <canvas ref={cvsRef}/>
        {initInfo && initInfo['passYn'] &&  <LimitInfo initInfo={initInfo}/>}
        {initInfo && !initInfo['passYn'] && <FailMsg/>}
    </div>
}
export default SampleCheckGPU