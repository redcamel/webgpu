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

async function makeShaderModule(device: GPUDevice, sourceSrc: string) {
    console.log(device,sourceSrc)
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

function webGPUTextureFromImageBitmapOrCanvas(device: GPUDevice, source: ImageBitmap, url: string) {
    const textureDescriptor: GPUTextureDescriptor = {
        label: url,
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
    return webGPUTextureFromImageBitmapOrCanvas(device, imgBitmap, url);
}

class RedGPUObject {
    protected _device: GPUDevice
    get device() {
        return this._device;
    }

    constructor(device: GPUDevice) {
        this._device = device
    }
}

class RedGeometry extends RedGPUObject {
    private _data: Float32Array
    get data(): Float32Array {
        return this._data;
    }

    private _buffer: GPUBuffer
    get buffer(): GPUBuffer {
        return this._buffer;
    }

    constructor(device: GPUDevice, data: Float32Array) {
        super(device)
        this._data = data
        this._buffer = makeVertexBuffer(device, data)
    }
}

// const testTexture = await webGPUTextureFromImageUrl(device, '/assets/crate.png')
class RedTexture extends RedGPUObject {
    get texture(): GPUTexture {
        return this._texture;
    }

    private _src: string
    get src(): string {
        return this._src;
    }

     set src(value: string) {
        this._src = value;
        this.load()
    }

    private _texture: GPUTexture

    private async load() {
        this._texture = await webGPUTextureFromImageUrl(this._device, this._src)
    }

    constructor(device: GPUDevice, src: string) {
        super(device)
        this.src = src
    }
}

class RedBitmapMaterial extends RedGPUObject {
    get fShaderModule(): GPUShaderModule {
        return this._fShaderModule;
    }
    get vShaderModule(): GPUShaderModule {
        return this._vShaderModule;
    }

    private _fShaderModule: GPUShaderModule
    private _vShaderModule: GPUShaderModule
    private _uniformsBindGroupLayout: GPUBindGroupLayout
    get uniformsBindGroupLayout(): GPUBindGroupLayout {
        return this._uniformsBindGroupLayout;
    }

    private async _initShaderModule() {
        this._uniformsBindGroupLayout = this._device.createBindGroupLayout({
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
                        // type: "float"
                    }
                }
            ]
        });



    }

    private _texture: RedTexture
    get texture(): RedTexture {
        return this._texture;
    }

    set texture(value: RedTexture) {
        this._texture = value;
    }

    private _sampler: GPUSampler
    get sampler(): GPUSampler {
        return this._sampler;
    }

    constructor(device: GPUDevice, texture: RedTexture,vShaderModule:GPUShaderModule,fShaderModule:GPUShaderModule) {
        super(device)
        this._vShaderModule=vShaderModule
        this._fShaderModule=fShaderModule
        this._initShaderModule()
        this._sampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "nearest"
        });
        this.texture = texture
    }
}

class RedMesh extends RedGPUObject {

    get uniformBindGroup(): GPUBindGroup {
        return this._uniformBindGroup;
    }
    get pipeline(): GPURenderPipeline {
        return this._pipeline;
    }
    get geometry(): RedGeometry {
        return this._geometry;
    }

    set geometry(value: RedGeometry) {
        this._geometry = value;
    }


    public matrix: mat4
    private _uniformBindGroupDescriptor: GPUBindGroupDescriptor
    private _geometry: RedGeometry
    private _material: RedBitmapMaterial
    private _uniformBuffer: GPUBuffer
    private _presentationFormat: GPUTextureFormat
    private _pipeline: GPURenderPipeline
    private _uniformBindGroup: GPUBindGroup
    get uniformBuffer(): GPUBuffer {
        return this._uniformBuffer;
    }

    set uniformBuffer(value: GPUBuffer) {
        this._uniformBuffer = value;
    }

    get material(): RedBitmapMaterial {
        return this._material;
    }

    set material(value: RedBitmapMaterial) {
        this._material = value;
        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            // set bindGroupLayouts
            layout: this._device.createPipelineLayout({bindGroupLayouts: [this._material.uniformsBindGroupLayout]}),
            vertex: {
                module: this._material.vShaderModule,
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
                module: this._material.fShaderModule,
                entryPoint: 'main',
                targets: [
                    {
                        format: this._presentationFormat,
                    },
                ],
            },
        }
        console.log('this._device',this._device)
        console.log('this._device',pipelineDescriptor)
        this._pipeline = this._device.createRenderPipeline(pipelineDescriptor);
    }

    private static matrix44Size = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix

    constructor(device: GPUDevice, geometry: RedGeometry, material: RedBitmapMaterial,presentationFormat:GPUTextureFormat) {
        super(device)
        this._presentationFormat = presentationFormat
        this.geometry = geometry
        this.uniformBuffer = device.createBuffer({
            size: RedMesh.matrix44Size,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.material = material
        this._uniformBindGroupDescriptor = {
            layout: this.material.uniformsBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer,
                        offset: 0,
                        size: RedMesh.matrix44Size
                    }
                },
                {
                    binding: 1,
                    resource: this.material.sampler,
                },
                {
                    binding: 2,
                    resource: this.material.texture.texture.createView(),
                }
            ]
        };
        this._uniformBindGroup  = device.createBindGroup(this._uniformBindGroupDescriptor )
        this.matrix = mat4.create()
        mat4.identity(this.matrix)
        mat4.translate(this.matrix, this.matrix, [Math.sin(Math.random() * Math.PI), Math.cos(Math.random() * Math.PI), 1]);
        mat4.rotateZ(this.matrix, this.matrix, Math.random() * Math.PI);
        mat4.scale(this.matrix, this.matrix, [0.25, 0.25, 1]);
    }
}

const SampleSimpleOOP = (props: any) => {
    console.log('props.hostInfo', props?.hostInfo)
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


            const testGometry: RedGeometry = new RedGeometry(device, new Float32Array(
                [
                    //x,y,z,w, u,v
                    -1.0, -1.0, 0.0, 1.0, 0.0, 0.0,
                    1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
                    -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
                    -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
                    1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
                    1.0, 1.0, 0.0, 1.0, 1.0, 1.0
                ]
            ));
            const testTexture2: RedTexture =  new RedTexture(device, '/assets/crate.png')

            const vShaderModule = await makeShaderModule(device, srcSourceVert)
            const fShaderModule = await makeShaderModule(device, srcSourceFrag)
            const testMaterial: RedBitmapMaterial = new RedBitmapMaterial(device, testTexture2,vShaderModule,fShaderModule)
            console.log(testTexture2)
            console.log(testMaterial)

            const testList = [
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
                new RedMesh(device,testGometry,testMaterial,presentationFormat),
            ]

            ////////////////////////////////////////////////////////////////////////
            // pipeline


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

                ///////////////////////////////////////////////////////////////////
                let i = testList.length
                while (i--) {
                    const tMesh = testList[i]
                    passEncoder.setPipeline(tMesh.pipeline);
                    let modelMatrix = tMesh.matrix
                    const uniformBuffer = tMesh.uniformBuffer
                    const uniformBindGroup = tMesh.uniformBindGroup
                    // console.log(tMesh)
                    mat4.identity(modelMatrix)
                    mat4.translate(modelMatrix, modelMatrix, [Math.sin(i * Math.PI * 2 / testList.length), Math.cos(i * Math.PI * 2 / testList.length), 1]);
                    mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
                    mat4.scale(modelMatrix, modelMatrix, [0.25, 0.25, 1]);

                    device.queue.writeBuffer(uniformBuffer, 0, modelMatrix);
                    passEncoder.setBindGroup(0, uniformBindGroup);
                    passEncoder.setVertexBuffer(0, tMesh.geometry.buffer);
                    passEncoder.draw(6, 1, 0, 0);
                }

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
                    url: srcSourceVert
                },
                {
                    label: 'SourceFrag',
                    url: srcSourceFrag
                }
            ]}/>
    </div>
}
export default SampleSimpleOOP
