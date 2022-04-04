interface IResult{
    passYn: boolean;
    gpu:any;
    adapter:any;
    device:any;
}

const checkGPU = async () => {
    let gpu:any, adapter, device:any;
    let result:IResult;
    let newVariable: any;
    newVariable = window.navigator;
    try {
        gpu = newVariable.gpu;
        adapter = await gpu.requestAdapter();
        device = await adapter.requestDevice();
        result = {
            passYn: true,
            gpu,
            adapter,
            device
        }
    } catch (e) {
        result = {
            passYn: false,
            gpu,
            adapter,
            device
        }
    }
    return new Promise<IResult>((resolve, reject) => {
        if (device) resolve(result)
        else reject(result)
    })
}
export default checkGPU