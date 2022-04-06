import {useEffect, useRef, useState} from "react";

import checkGPU from "../helper/checkGPU/checkGPU";

import IWebGPUInitInfo from "../helper/checkGPU/IWebGPUInitInfo";
import LimitInfo from "../helper/checkGPU/comp/LimitInfo";
import FailMsg from "../helper/checkGPU/comp/FailMsg";


const SampleCheckGPU = () => {
    const cvsRef = useRef<HTMLCanvasElement>(null);
    const [initInfo, setInitInfo] = useState<IWebGPUInitInfo>()
    const {adapter, device, ableWebGPU} = initInfo || {}


    useEffect(() => {
        checkGPU()
            .then(result => setInitInfo(result))
            .catch(result => setInitInfo(result))
    }, [])
    useEffect(() => {
        const cvs = cvsRef.current
        const setCvsSize = (cvs: HTMLCanvasElement) => {
            cvs.style.width = '256px'
            cvs.style.height = '256px'
        }
        const configure = (cvs: HTMLCanvasElement, device: GPUDevice) => {
            const ctx = cvs.getContext('webgpu');
            if (ctx) {
                const presentationFormat:GPUTextureFormat = ctx.getPreferredFormat(adapter);
                const configurationDescription: GPUCanvasConfiguration = {
                    device: device,
                    format: presentationFormat,
                };
                console.log('configurationDescription', configurationDescription);
                ctx.configure(configurationDescription);
            }
        }
        if (ableWebGPU) {
            if (cvs) {
                ////////////////////////////////////////////////////////////////////////
                // configure
                configure(cvs, device)
                setCvsSize(cvs)
            }
        }
    }, [initInfo])
    return <>
        <canvas ref={cvsRef}/>
        {initInfo && (ableWebGPU ? <LimitInfo initInfo={initInfo}/> : <FailMsg/>)}
    </>
}
export default SampleCheckGPU