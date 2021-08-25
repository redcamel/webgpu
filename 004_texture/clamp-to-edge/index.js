const ready = glslang();
ready.then(init);
const vertexShaderGLSL = `
	#version 450
    layout(set=0,binding = 0) uniform Uniforms {
        mat4 projectionMatrix;
        mat4 modelMatrix;
    } uniforms;
	layout(location = 0) in vec4 position;
	layout(location = 1) in vec4 color;
	layout(location = 2) in vec2 uv;
	layout(location = 0) out vec4 vColor;
	layout(location = 1) out vec2 vUV;
	void main() {
		gl_Position = uniforms.projectionMatrix * uniforms.modelMatrix * position;
		vColor = color;
		vUV = uv;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
	layout(location = 0) in vec4 vColor;
	layout(location = 1) in vec2 vUV;
	layout(set = 0, binding = 1) uniform sampler uSampler;
	layout(set = 0, binding = 2) uniform texture2D uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor = texture(sampler2D(uTexture, uSampler), vUV) ;
	}
`;

async function init(glslang) {
  // glslang을 이용하여 GLSL소스를 Uint32Array로 변환합니다.
  console.log('glslang', glslang);
  // 초기 GPU 권한을 얻어온다.
  const gpu = navigator['gpu']; //
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice();
  console.log('gpu', gpu);
  console.log('adapter', adapter);
  console.log('device', device);
  // 화면에 표시하기 위해서 캔버스 컨텍스트를 가져오고
  // 얻어온 컨텍스트에 얻어온 GPU 넣어준다.??
  const cvs = document.createElement('canvas');
  cvs.width = 1024;
  cvs.height = 768;
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('webgpu');
  const swapChainFormat = "bgra8unorm";
  const swapChain = configure(device, swapChainFormat, ctx);
  const presentationFormat = ctx.getPreferredFormat(adapter);
  console.log('ctx', ctx);
  console.log('swapChain', swapChain);
  // 쉐이더를 이제 만들어야함.
  let vShaderModule = makeShaderModule_GLSL(glslang, device, 'vertex', vertexShaderGLSL);
  let fShaderModule = makeShaderModule_GLSL(glslang, device, 'fragment', fragmentShaderGLSL);
  // 쉐이더 모듈을 만들었으니 버텍스 버퍼를 만들어볼꺼임
  let vertexBuffer = makeVertexBuffer(
    device,
    new Float32Array(
      [
        -1.0, -1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0, -1.0, -1.0,
        1.0, -1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0, -1.0, 2.0,
        -1.0, 1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0, 2.0, -1.0,
        -1.0, 1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0, 2.0, -1.0,
        1.0, -1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0, -1.0, 2.0,
        1.0, 1.0, 0.0, 1.0, Math.random(), Math.random(), Math.random(), 1.0, 2.0, 2.0
      ]
    )
  );
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 프로젝션을 하기위한 유니폼 매트릭스를 넘겨보자
  // 파이프 라인의 바운딩 레이아웃 리스트에 들어갈 녀석이닷!
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
  console.log('uniformsBindGroupLayout', uniformsBindGroupLayout);
  const matrixSize = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix
  const uniformBufferSize = Math.max(matrixSize, 128);
  // 유니폼 버퍼를 생성하고
  const uniformBuffer = await device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  console.log('uniformBuffer', uniformBuffer);
  /**
   * 텍스쳐를 만들어보자
   */
  const testTexture = await createTextureFromImage(device, '../../assets/crate.png', GPUTextureUsage.TEXTURE_BINDING);
  const testSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge"
    // 	enum GPUAddressMode {
    // 	    "clamp-to-edge",
    // 		"repeat",
    // 		"mirror-repeat"
    //  };
  });
  console.log('cubeTexture', testTexture);
  const uniformBindGroupDescriptor = {
    layout: uniformsBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          uniformBufferSize
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
  console.log('uniformBindGroupDescriptor', uniformBindGroupDescriptor);
  const uniformBindGroup = device.createBindGroup(uniformBindGroupDescriptor);
  console.log('uniformBindGroup', uniformBindGroup);
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 그리기위해서 파이프 라인이란걸 또만들어야함 -_-;;
  const pipeline = device.createRenderPipeline({
    // 레이아웃은 아직 뭔지 모르곘고
    layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
    // 버텍스와 프레그먼트는 아래와 같이 붙인다..
    vertex: {
      module: vShaderModule,
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 10 * 4,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: 0,
              format: "float32x4"
            },
            {
              // color
              shaderLocation: 1,
              offset: 4 * 4,
              format: "float32x4"
            },
            {
              // uv
              shaderLocation: 2,
              offset: 8 * 4,
              format: "float32x2"
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
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add"
            },
            alpha: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add"
            }
          }
        },
      ],
    },
    // 컬러모드 지정하고
    colorStates: [
      {
        format: swapChainFormat,
        alphaBlend: {
          srcFactor: "src-alpha",
          dstFactor: "one-minus-src-alpha",
          operation: "add"
        }
      }
    ],
    // 드로잉 방법을 결정함
    primitive: {
      topology: 'triangle-list',
    },
    /*
    GPUPrimitiveTopology {
        "point-list",
        "line-list",
        "line-strip",
        "triangle-list",
        "triangle-strip"
    };
     */
  });
  let projectionMatrix = mat4.create();
  let modelMatrix = mat4.create();
  let aspect = Math.abs(cvs.width / cvs.height);
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 0.1, 100.0);
  let render = async function (time) {
    const renderData = {
      pipeline: pipeline,
      vertexBuffer: vertexBuffer,
      uniformBindGroup: uniformBindGroup,
      uniformBuffer: uniformBuffer
    };
    const commandEncoder = device.createCommandEncoder();
    const textureView = ctx.getCurrentTexture().createView();
    // console.log(ctx.getCurrentTexture())
    const renderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        loadValue: {r: 1, g: 1, b: 0.0, a: 1.0},
      }]
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setVertexBuffer(0, renderData['vertexBuffer']);
    passEncoder.setPipeline(renderData['pipeline']);
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, [0, 0, -2]);
    // mat4.translate(modelMatrix, modelMatrix, [Math.sin(time / 1000), Math.cos(time / 1000), -5]);
    // mat4.rotateX(modelMatrix, modelMatrix, time / 1000)
    // mat4.rotateY(modelMatrix, modelMatrix, time / 1000)
    mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
    mat4.scale(modelMatrix, modelMatrix, [1, 1, 1]);
    passEncoder.setBindGroup(0, renderData['uniformBindGroup']);
    device.queue.writeBuffer(renderData['uniformBuffer'], 0, projectionMatrix);
    device.queue.writeBuffer(renderData['uniformBuffer'], 4 * 16, modelMatrix);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.endPass();
    const test = commandEncoder.finish();
    device.queue.submit([test]);
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}

function configure(device, swapChainFormat, context) {
  const swapChainDescriptor = {
    device: device,
    format: swapChainFormat
  };
  console.log('swapChainDescriptor', swapChainDescriptor);
  return context.configure(swapChainDescriptor);
}

function makeShaderModule_GLSL(glslang, device, type, source) {
  console.log(`// makeShaderModule_GLSL start : ${type}/////////////////////////////////////////////////////////////`);
  let shaderModuleDescriptor = {
    code: glslang.compileGLSL(source, type),
    source: source
  };
  console.log('shaderModuleDescriptor', shaderModuleDescriptor);
  let shaderModule = device.createShaderModule(shaderModuleDescriptor);
  console.log(`shaderModule_${type}}`, shaderModule);
  console.log(`// makeShaderModule_GLSL end : ${type}/////////////////////////////////////////////////////////////`);
  return shaderModule;
}

function makeVertexBuffer(device, data) {
  console.log(`// makeVertexBuffer start /////////////////////////////////////////////////////////////`);
  let bufferDescriptor = {
    size: data.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  };
  let verticesBuffer = device.createBuffer(bufferDescriptor);
  console.log('bufferDescriptor', bufferDescriptor);
  device.queue.writeBuffer(verticesBuffer, 0, data);
  console.log('verticesBuffer', verticesBuffer);
  console.log(`// makeVertexBuffer end /////////////////////////////////////////////////////////////`);
  return verticesBuffer;
}

async function createTextureFromImage(device, src, usage) {
  // 귀찮아서 텍스쳐 맹그는 놈은 들고옴
  const img = document.createElement('img');
  console.log('여긴오곘고');
  img.src = src;
  await img.decode();
  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = img.width;
  imageCanvas.height = img.height;
  const imageCanvasContext = imageCanvas.getContext('2d');
  imageCanvasContext.translate(0, img.height);
  imageCanvasContext.scale(1, -1);
  imageCanvasContext.drawImage(img, 0, 0, img.width, img.height);
  const imageData = imageCanvasContext.getImageData(0, 0, img.width, img.height);
  let data = null;
  const bytesPerRow = Math.ceil(img.width * 4 / 256) * 256;
  if (bytesPerRow == img.width * 4) {
    data = imageData.data;
  } else {
    data = new Uint8Array(bytesPerRow * img.height);
    for (let y = 0; y < img.height; ++y) {
      for (let x = 0; x < img.width; ++x) {
        let i = x * 4 + y * bytesPerRow;
        data[i] = imageData.data[i];
        data[i + 1] = imageData.data[i + 1];
        data[i + 2] = imageData.data[i + 2];
        data[i + 3] = imageData.data[i + 3];
      }
    }
  }
  const texture = device.createTexture({
    size: {
      width: img.width,
      height: img.height,
      depthOrArrayLayers: 1,
    },
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | usage,
  });
  const textureDataBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  device.queue.writeBuffer(textureDataBuffer, 0, data);
  const commandEncoder = device.createCommandEncoder({});
  commandEncoder.copyBufferToTexture({
    buffer: textureDataBuffer,
    bytesPerRow: bytesPerRow,
    imageHeight: 0,
  }, {
    texture: texture,
  }, {
    width: img.width,
    height: img.height,
    depthOrArrayLayers: 1,
  });
  device.queue.submit([commandEncoder.finish()]);
  return texture;
}
