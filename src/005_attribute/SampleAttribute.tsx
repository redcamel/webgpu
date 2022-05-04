import {useEffect, useRef, useState} from "react";
import checkGPU from "../helper/checkGPU/checkGPU";
import IWebGPUInitInfo from "../helper/checkGPU/IWebGPUInitInfo";
import LimitInfo from "../helper/checkGPU/comp/LimitInfo";
import FailMsg from "../helper/checkGPU/comp/FailMsg";
//
import srcSourceVert from "./vertex.wgsl";
import srcSourceFrag from "./fragment.wgsl";
import SourceView from "../helper/checkGPU/comp/SourceView";
import {mat4} from "gl-matrix"

const SampleAttribute = () => {
    const cvsRef = useRef<HTMLCanvasElement>(null);
    const [initInfo, setInitInfo] = useState<IWebGPUInitInfo>()
    const {adapter, device, ableWebGPU} = initInfo || {}
    const setMain = async () => {
        const cvs = cvsRef.current
        const ctx = cvs?.getContext('webgpu');

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
            // make vertexBuffer
            const vertexBuffer = makeVertexBuffer(
                device,
                // add rgba data !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                new Float32Array(
                    [
                        //x,y,z,w, r,g,b,a
                        -1.0, -1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0,
                        0.0, 1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0,
                        1.0, -1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0
                    ]
                )
            );
            // make BindGroup
            const uniformsBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: {
                            type: 'uniform',
                        },
                    }
                ]
            });
            const matrix44Size = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix
            const uniformBuffer = device.createBuffer({
                size: matrix44Size,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            const uniformBindGroupDescriptor = {
                layout: uniformsBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: uniformBuffer,
                            offset: 0,
                            size: matrix44Size
                        }
                    }
                ]
            };
            const uniformBindGroup = device.createBindGroup(uniformBindGroupDescriptor);
            const modelMatrix = mat4.create();
            ////////////////////////////////////////////////////////////////////////
            // pipeline
            const pipeLineDescriptor: GPURenderPipelineDescriptor = {
                // set bindGroupLayouts
                layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
                vertex: {
                    module: vShaderModule,
                    entryPoint: 'main',

                    buffers: [
                        {
                            // xyzwrgba 8 !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                            arrayStride: 8 * Float32Array.BYTES_PER_ELEMENT,
                            attributes: [
                                {
                                    // position
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x4"
                                },
                                // set color location info !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                {
                                    // color
                                    shaderLocation: 1,
                                    offset: 4 * Float32Array.BYTES_PER_ELEMENT,
                                    format: "float32x4"
                                }
                            ]
                        }
                    ]
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
            const pipeline: GPURenderPipeline = device.createRenderPipeline(pipeLineDescriptor);
            ////////////////////////////////////////////////////////////////////////
            // render
            const render = (time: number) => {
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
                ///////////////////////////////////////////////////////////////////
                // setBindGroup
                passEncoder.setBindGroup(0, uniformBindGroup);
                mat4.identity(modelMatrix)
                mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
                mat4.scale(modelMatrix, modelMatrix, [0.5, 0.5, 1]);
                // update Uniform
                device.queue.writeBuffer(uniformBuffer, 0, modelMatrix);
                ///////////////////////////////////////////////////////////////////
                // setVertexBuffer
                passEncoder.setVertexBuffer(0, vertexBuffer);
                passEncoder.draw(3, 1, 0, 0);
                passEncoder.end();
                device.queue.submit([commandEncoder.finish()]);
                requestAnimationFrame(render)
            }
            render(0)
        }

    }
    useEffect(() => {
        checkGPU().then(result => setInitInfo(result)).catch(result => setInitInfo(result))
    }, [])
    useEffect(() => {
        if (ableWebGPU) setMain()
    }, [initInfo])
    return <div className={'sampleContainer'}>
        <canvas ref={cvsRef} width={'512px'} height={'512px'}/>
        {initInfo && (ableWebGPU ? <LimitInfo initInfo={initInfo}/> : <FailMsg/>)}
        <SourceView
            dataList={[
                {
                    label: 'SourceVert',
                    url: srcSourceVert
                },
                {
                    label: 'SourceFrag',
                    url: srcSourceFrag
                }
            ]}/>
    </div>
}
export default SampleAttribute

async function makeShaderModule(device: GPUDevice, sourceSrc: string) {
    return await fetch(sourceSrc).then(v => v.text()).then(source => {
        const shaderModuleDescriptor: GPUShaderModuleDescriptor = {
            code: source
        };
        return device.createShaderModule(shaderModuleDescriptor);
    })
}

function makeVertexBuffer(device: GPUDevice, data: Float32Array) {
    console.log(`// makeVertexBuffer start /////////////////////////////////////////////////////////////`);
    let bufferDescriptor: GPUBufferDescriptor = {
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    };
    let verticesBuffer: GPUBuffer = device.createBuffer(bufferDescriptor);
    console.log('bufferDescriptor', bufferDescriptor);
    device.queue.writeBuffer(verticesBuffer, 0, data);
    console.log('verticesBuffer', verticesBuffer);
    console.log(`// makeVertexBuffer end /////////////////////////////////////////////////////////////`);
    return verticesBuffer;
}
