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
const SampleTexture = () => {
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
            // make vertexBuffer
            const vertexBuffer = makeVertexBuffer(
                device,
                new Float32Array(
                    [
                        //x,y,z,w,
                        -1.0, -1.0, 0.0, 1.0,
                        0.0, 1.0, 0.0, 1.0,
                        1.0, -1.0, 0.0, 1.0
                    ]
                )
            );
            ////////////////////////////////////////////////////////////////////////
            // makeTexture !!!!!!!!!!!!!!!
            const testTexture = await webGPUTextureFromImageUrl(device,'/assets/crate.png')
            console.log('testTexture',testTexture)
            const testSampler = device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
                mipmapFilter: "linear"
            });
            // make BindGroup
            const uniformsBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: {
                            type: 'uniform',
                        },

                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {
                            type: 'filtering',
                        },
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {
                            type: "float"
                        }
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
                    },
                    {
                        binding: 1,
                        resource: testSampler,
                    },
                    {
                        binding: 2,
                        resource: testTexture.createView(),
                    }
                ]
            };
            const uniformBindGroup = device.createBindGroup(uniformBindGroupDescriptor);
            const modelMatrix = mat4.create();
            ////////////////////////////////////////////////////////////////////////
            // pipeline
            const descriptor: GPURenderPipelineDescriptor = {
                // set bindGroupLayouts
                layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
                vertex: {
                    module: vShaderModule,
                    entryPoint: 'main',

                    buffers: [
                        {
                            arrayStride: 4 * Float32Array.BYTES_PER_ELEMENT,
                            attributes: [
                                {
                                    // position
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x4"
                                },
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
            const pipeline: GPURenderPipeline = device.createRenderPipeline(descriptor);

            ////////////////////////////////////////////////////////////////////////
            // render
            const render = (time:number) => {
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
                mat4.scale(modelMatrix, modelMatrix, [0.5,0.5,1]);
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
        <canvas ref={cvsRef}/>
        {initInfo && (ableWebGPU ? <LimitInfo initInfo={initInfo}/> : <FailMsg/>)}
        <SourceView
            dataList={[
                {
                label: 'SourceVert',
                url : srcSourceVert
            },
            {
                label: 'SourceFrag',
                url : srcSourceFrag
            }
        ]}/>
    </div>
}
export default SampleTexture

async function makeShaderModule(device: GPUDevice, sourceSrc: string) {
    return await fetch(sourceSrc).then(v => v.text()).then(source => {
        const shaderModuleDescriptor: GPUShaderModuleDescriptor = {
            code: source
        };
        return device.createShaderModule(shaderModuleDescriptor);
    })
}

function makeVertexBuffer(device:GPUDevice, data:Float32Array) {
    console.log(`// makeVertexBuffer start /////////////////////////////////////////////////////////////`);
    let bufferDescriptor:GPUBufferDescriptor = {
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    };
    let verticesBuffer:GPUBuffer = device.createBuffer(bufferDescriptor);
    console.log('bufferDescriptor', bufferDescriptor);
    device.queue.writeBuffer(verticesBuffer, 0, data);
    console.log('verticesBuffer', verticesBuffer);
    console.log(`// makeVertexBuffer end /////////////////////////////////////////////////////////////`);
    return verticesBuffer;
}

function webGPUTextureFromImageBitmapOrCanvas(device : GPUDevice, source:ImageBitmap) {
    const textureDescriptor:GPUTextureDescriptor = {
        size: { width: source.width, height: source.height },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    };
    const texture = device.createTexture(textureDescriptor);

    device.queue.copyExternalImageToTexture({ source }, { texture }, textureDescriptor.size);

    return texture;
}

async function webGPUTextureFromImageUrl(device:GPUDevice, url:string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);
    console.log('imgBitmap',imgBitmap)
    return webGPUTextureFromImageBitmapOrCanvas(device, imgBitmap);
}