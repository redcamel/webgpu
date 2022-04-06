import {useEffect, useRef, useState} from "react";
import checkGPU from "../helper/checkGPU/checkGPU";
import IWebGPUInitInfo from "../helper/checkGPU/IWebGPUInitInfo";
import LimitInfo from "../helper/checkGPU/comp/LimitInfo";
import FailMsg from "../helper/checkGPU/comp/FailMsg";
//
import srcSourceVert from "./vertex.wgsl";
import srcSourceFrag from "./fragment.wgsl";
import SourceView from "../helper/checkGPU/comp/SourceView";


const SampleHelloWorld = () => {
    const cvsRef = useRef<HTMLCanvasElement>(null);
    const [initInfo, setInitInfo] = useState<IWebGPUInitInfo>()
    const {adapter, device, ableWebGPU} = initInfo || {}
    const setMain = async () => {
        const cvs = cvsRef.current
        const ctx = cvs?.getContext('webgpu');
        if (cvs) {
            const setCvsSize = (cvs: HTMLCanvasElement) => {
                cvs.style.width = '256px'
                cvs.style.height = '256px'
            }
            setCvsSize(cvs)
        }
        if (ctx) {
            const presentationFormat: GPUTextureFormat = ctx.getPreferredFormat(adapter);
            ////////////////////////////////////////////////////////////////////////
            // configure
            const configurationDescription: GPUCanvasConfiguration = {
                device: device,
                format: presentationFormat,
            };
            console.log('configurationDescription', configurationDescription);
            ctx.configure(configurationDescription);
            ////////////////////////////////////////////////////////////////////////
            // shaderModules
            const vShaderModule: GPUShaderModule = await makeShaderModule(device, srcSourceVert)
            const fShaderModule: GPUShaderModule = await makeShaderModule(device, srcSourceFrag)
            console.log(vShaderModule, fShaderModule)
            ////////////////////////////////////////////////////////////////////////
            // pipeline
            const descriptor: GPURenderPipelineDescriptor = {
                vertex: {
                    module: vShaderModule,
                    entryPoint: 'main'
                },
                fragment: {
                    module: fShaderModule,
                    entryPoint: 'main',
                    targets: [
                        {
                            format: presentationFormat,
                        },
                    ],
                },
            }
            const pipeline: GPURenderPipeline = device.createRenderPipeline(descriptor);
            ////////////////////////////////////////////////////////////////////////
            // render
            const render = () => {
                const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();
                const textureView: GPUTextureView = ctx.getCurrentTexture().createView();
                const renderPassDescriptor: GPURenderPassDescriptor = {
                    colorAttachments: [
                        {
                            view: textureView,
                            clearValue: {r: 1.0, g: 1.0, b: 1.0, a: 1.0},
                            loadOp: 'clear',
                            storeOp: 'store',
                        },
                    ],
                };

                const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
                passEncoder.setPipeline(pipeline);
                passEncoder.draw(3, 1, 0, 0);
                passEncoder.end();
                device.queue.submit([commandEncoder.finish()]);
                requestAnimationFrame(render)
            }
            render()
        }

    }
    useEffect(() => {
        checkGPU().then(result => setInitInfo(result)).catch(result => setInitInfo(result))
    }, [])
    useEffect(() => {
        if (ableWebGPU) setMain()
    }, [initInfo])
    return <>
        <canvas ref={cvsRef}/>
        {initInfo && (ableWebGPU ? <LimitInfo initInfo={initInfo}/> : <FailMsg/>)}
        <SourceView dataList={[
            {
                label: 'SourceVert',
                url : srcSourceVert
            },
            {
                label: 'SourceFrag',
                url : srcSourceFrag
            }
        ]}/>
    </>
}
export default SampleHelloWorld

async function makeShaderModule(device: GPUDevice, sourceSrc: string) {
    return await fetch(sourceSrc).then(v => v.text()).then(source => {
        const shaderModuleDescriptor: GPUShaderModuleDescriptor = {
            code: source
        };
        return device.createShaderModule(shaderModuleDescriptor);
    })
}