import IWebGPUInitInfo from "./IWebGPUInitInfo";

const checkGPU = async () => {
    let gpu:any, adapter, device:any;
    let result:IWebGPUInitInfo;
    let newVariable: any;
    newVariable = window.navigator;
    try {
        gpu = newVariable.gpu;
        adapter = await gpu.requestAdapter();
        device = await adapter.requestDevice();
        result = {
            ableWebGPU: true,
            gpu,
            adapter,
            device
        }
    } catch (e) {
        result = {
            ableWebGPU: false,
            gpu,
            adapter,
            device
        }
    }
    return new Promise<IWebGPUInitInfo>((resolve, reject) => {
        if (device) resolve(result)
        else reject(result)
    })
}
export default checkGPU