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

let raf: any
const SampleIndexBuffer = (props: any) => {
    console.log('props.hostInfo', props?.hostInfo)
    const cvsRef = useRef<HTMLCanvasElement>(null);
    const [initInfo, setInitInfo] = useState<IWebGPUInitInfo>()
    const {adapter, device, ableWebGPU} = initInfo || {}
    const setMain = async () => {
        const cvs = cvsRef.current
        const ctx = cvs?.getContext('webgpu');

        if (ctx) {
            const presentationFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();
            ////////////////////////////////////////////////////////////////////////
            // configure
            const configurationDescription: GPUCanvasConfiguration = {
                device: device,
                format: presentationFormat,
                alphaMode: 'premultiplied'
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
                        //x,y,z,w, u,v
                        -1.0, -1.0, 0.0, 1.0, 0.0, 0.0,
                        1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
                        1.0, 1.0, 0.0, 1.0, 1.0, 1.0,
                        -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
                    ]
                )
            );
            const indexBufferInfo = makeIndexBufferInfo(
                device,
                new Uint32Array([
                    0, 1, 2, 0, 2, 3
                ])
            );
            ////////////////////////////////////////////////////////////////////////
            // makeTexture !!!!!!!!!!!!!!!
            const testTexture = await webGPUTextureFromImageUrl(device, './assets/crate.png')
            console.log('testTexture', testTexture)
            const testSampler = device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
                mipmapFilter: "nearest"
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
            const pipeLineDescriptor: GPURenderPipelineDescriptor = {
                // set bindGroupLayouts
                layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
                vertex: {
                    module: vShaderModule,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 6 * Float32Array.BYTES_PER_ELEMENT,
                            attributes: [
                                {
                                    // position
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x4"
                                },
                                {
                                    // uv
                                    shaderLocation: 1,
                                    offset: 4 * Float32Array.BYTES_PER_ELEMENT,
                                    format: "float32x2"
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
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus',
                },

            }
            const pipeline: GPURenderPipeline = device.createRenderPipeline(pipeLineDescriptor);


            ////////////////////////////////////////////////////////////////////////
            // depthTexture
            const depthTexture = device.createTexture({
                size: [cvs?.clientWidth, cvs?.clientHeight],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });
            const projectionMatrix = mat4.create();
            ////////////////////////////////////////////////////////////////////////
            // render
            const render = (time: number) => {
                cancelAnimationFrame(raf)
                const aspect = cvs ? cvs?.clientWidth / cvs?.clientHeight : 1;
                mat4.perspective(projectionMatrix, Math.PI * 2 / 360 * 60, aspect, 1, 1000.0);
                // console.log('aspect', aspect, [cvs?.clientWidth, cvs?.clientHeight])
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
                    depthStencilAttachment: {
                        view: depthTexture.createView(),
                        depthClearValue: 1.0,
                        depthLoadOp: 'clear',
                        depthStoreOp: 'store',
                    },
                };

                const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
                passEncoder.setPipeline(pipeline);
                ///////////////////////////////////////////////////////////////////
                // setBindGroup
                passEncoder.setBindGroup(0, uniformBindGroup);
                mat4.identity(modelMatrix)
                mat4.translate(modelMatrix, modelMatrix, [0, 0, -5]);
                mat4.rotateX(modelMatrix, modelMatrix, time / 1000);
                mat4.rotateY(modelMatrix, modelMatrix, time / 1000);
                mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
                mat4.scale(modelMatrix, modelMatrix, [1, 1, 1]);
                mat4.multiply(modelMatrix, projectionMatrix, modelMatrix);
                // update Uniform
                device.queue.writeBuffer(uniformBuffer, 0, modelMatrix);
                ///////////////////////////////////////////////////////////////////
                // setVertexBuffer
                passEncoder.setVertexBuffer(0, vertexBuffer);
                passEncoder.setIndexBuffer(indexBufferInfo.buffer, 'uint32');
                passEncoder.drawIndexed(indexBufferInfo.size, 1, 0, 0, 0);
                passEncoder.end();
                device.queue.submit([commandEncoder.finish()]);
                raf = requestAnimationFrame(render)
            }
            render(0)
        }

    }
    useEffect(() => {
        checkGPU().then(result => setInitInfo(result)).catch(result => setInitInfo(result))
        return () => cancelAnimationFrame(raf)
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
                },
                {
                    label: 'Host',
                    url: './src/009_indexBuffer/SampleIndexBuffer.tsx'
                }
            ]}/>
    </div>
}
export default SampleIndexBuffer

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

function makeIndexBufferInfo(device: GPUDevice, data: Uint32Array) {
    let indexBufferDescriptor = {
        size: data.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    };
    let indexBuffer: GPUBuffer = device.createBuffer(indexBufferDescriptor);
    console.log('bufferDescriptor', indexBufferDescriptor);
    device.queue.writeBuffer(indexBuffer, 0, data);
    console.log('indexBuffer', indexBuffer);
    return {
        buffer: indexBuffer,
        size: data.length,
        originData: data
    };
}

function webGPUTextureFromImageBitmapOrCanvas(device: GPUDevice, source: ImageBitmap) {
    const textureDescriptor: GPUTextureDescriptor = {
        size: {width: source.width, height: source.height},
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    };
    const texture = device.createTexture(textureDescriptor);

    device.queue.copyExternalImageToTexture({source}, {texture}, textureDescriptor.size);

    return texture;
}

async function webGPUTextureFromImageUrl(device: GPUDevice, url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);
    console.log('imgBitmap', imgBitmap)
    return webGPUTextureFromImageBitmapOrCanvas(device, imgBitmap);
}