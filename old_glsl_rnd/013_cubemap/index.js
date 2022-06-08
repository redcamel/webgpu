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
	layout(set = 0, binding = 2) uniform textureCube uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor = texture(samplerCube(uTexture,uSampler), vec3(vUV,1.0)) ;
		// outColor = vec4(1.0, 0,0,1);
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
  
  
  // 화면에 표시하기 위해서 캔버스 컨텍스트를 가져오고
  // 얻어온 컨텍스트에 얻어온 GPU 넣어준다.??
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
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
        1, -1, 1, 1, 1, 0, 1, 1, 1, 1,
        -1, -1, 1, 1, 0, 0, 1, 1, 0, 1,
        -1, -1, -1, 1, 0, 0, 0, 1, 0, 0,
        1, -1, -1, 1, 1, 0, 0, 1, 1, 0,
        1, -1, 1, 1, 1, 0, 1, 1, 1, 1,
        -1, -1, -1, 1, 0, 0, 0, 1, 0, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, -1, 1, 1, 1, 0, 1, 1, 0, 1,
        1, -1, -1, 1, 1, 0, 0, 1, 0, 0,
        1, 1, -1, 1, 1, 1, 0, 1, 1, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, -1, -1, 1, 1, 0, 0, 1, 0, 0,
        -1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
        1, 1, -1, 1, 1, 1, 0, 1, 0, 0,
        -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
        -1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
        1, 1, -1, 1, 1, 1, 0, 1, 0, 0,
        -1, -1, 1, 1, 0, 0, 1, 1, 1, 1,
        -1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
        -1, 1, -1, 1, 0, 1, 0, 1, 0, 0,
        -1, -1, -1, 1, 0, 0, 0, 1, 1, 0,
        -1, -1, 1, 1, 0, 0, 1, 1, 1, 1,
        -1, 1, -1, 1, 0, 1, 0, 1, 0, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        -1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
        -1, -1, 1, 1, 0, 0, 1, 1, 0, 0,
        -1, -1, 1, 1, 0, 0, 1, 1, 0, 0,
        1, -1, 1, 1, 1, 0, 1, 1, 1, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, -1, -1, 1, 1, 0, 0, 1, 1, 1,
        -1, -1, -1, 1, 0, 0, 0, 1, 0, 1,
        -1, 1, -1, 1, 0, 1, 0, 1, 0, 0,
        1, 1, -1, 1, 1, 1, 0, 1, 1, 0,
        1, -1, -1, 1, 1, 0, 0, 1, 1, 1,
        -1, 1, -1, 1, 0, 1, 0, 1, 0, 0
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
          type: "float",
          viewDimension: 'cube',
        },

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
  const testTexture = await createTextureFromImage(device,
    [
      // '../assets/cubemap/SwedishRoyalCastle/px.jpg',
      // '../assets/cubemap/SwedishRoyalCastle/nx.jpg',
      // '../assets/cubemap/SwedishRoyalCastle/py.jpg',
      // '../assets/cubemap/SwedishRoyalCastle/ny.jpg',
      // '../assets/cubemap/SwedishRoyalCastle/pz.jpg',
      // '../assets/cubemap/SwedishRoyalCastle/nz.jpg'
      '../assets/crate.png',
      '../assets/crate.png',
      '../assets/crate.png',
      '../assets/crate.png',
      '../assets/crate.png',
      '../assets/crate.png'
    ], GPUTextureUsage.TEXTURE_BINDING);
  console.log('testTexture', testTexture);
  const testSampler = device.createSampler({});
  const uniformBindGroupDescriptor = {
    layout: uniformsBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: uniformBufferSize
        }
      },
      {
        binding: 1,
        resource: testSampler,
      },
      {
        binding: 2,
        resource: testTexture.createView({
          format: 'rgba8unorm',
          dimension: 'cube',
          aspect: 'all',
          baseMipLevel: 0,
          mipLevelCount: testTexture.mipMaps + 1,
          baseArrayLayer: 0,
          arrayLayerCount: 6
        }),
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
              // normal
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

    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },
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
  const depthTexture = device.createTexture({
    size: {
      width: cvs.width,
      height: cvs.height,
      depthOrArrayLayers: 1
    },
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
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
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadValue: 1.0,
        depthStoreOp: "store",
        stencilLoadValue: 0,
        stencilStoreOp: "store",
      }
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setVertexBuffer(0, renderData['vertexBuffer']);
    passEncoder.setPipeline(renderData['pipeline']);
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, [Math.sin(time / 1000), Math.cos(time / 1000), -5]);
    mat4.rotateX(modelMatrix, modelMatrix, time / 1000);
    mat4.rotateY(modelMatrix, modelMatrix, time / 1000);
    mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
    mat4.scale(modelMatrix, modelMatrix, [1, 1, 1]);
    passEncoder.setBindGroup(0, renderData['uniformBindGroup']);
    device.queue.writeBuffer(renderData['uniformBuffer'], 0, projectionMatrix);
    device.queue.writeBuffer(renderData['uniformBuffer'], 4 * 16, modelMatrix);
    passEncoder.draw(36, 1, 0, 0);
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

async function createTextureFromImage(device, srcList, usage) {
  // 귀찮아서 텍스쳐 맹그는 놈은 들고옴
  console.log('여긴오곘고');
  let mipMaps = Math.log2(Math.max(256, 256));
  mipMaps = Math.round(mipMaps);
  console.log('mipMaps', mipMaps);
  const textureExtent = {
    width: 256,
    height: 256,
    depthOrArrayLayers: 6
  };
  const textureDescriptor = {
    dimension: '2d',
    format: 'rgba8unorm',
    // arrayLayerCount: 6,
    mipLevelCount: mipMaps + 1,
    sampleCount: 1,
    size: textureExtent,
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
  };
  const cubeTexture = device.createTexture(textureDescriptor);
  console.log('cubeTexture', cubeTexture);
  const img = new Image();
  img.src = srcList[0];
  await img.decode();
  const faces = [0, 1, 2, 3, 4, 5];
  for (let face of faces) {
    let i = 1, len = mipMaps;
    let faceWidth = img.width;
    let faceHeight = img.height;
    updateTexture(img, faceHeight, faceHeight, 0, face);
    for (i; i <= len; i++) {
      faceWidth = Math.max(Math.floor(faceWidth / 2), 1);
      faceHeight = Math.max(Math.floor(faceHeight / 2), 1);
      updateTexture(img, faceHeight, faceHeight, i, face);
    }
  }

  function updateTexture(img, width, height, mip, face = -1) {
    const imageCanvas = document.createElement('canvas');
    document.body.appendChild(imageCanvas);
    imageCanvas.width = width;
    imageCanvas.height = height;
    const imageCanvasContext = imageCanvas.getContext('2d');
    imageCanvasContext.translate(0, height);
    imageCanvasContext.scale(1, -1);
    imageCanvasContext.drawImage(img, 0, 0, width, height);
    const imageData = imageCanvasContext.getImageData(0, 0, width, height);
    // console.log('imageData', imageData);
    let data = null;
    const bytesPerRow = Math.ceil(width * 4 / 256) * 256;
    if (bytesPerRow === width * 4) {
      data = imageData.data;
      console.log('여기냐', width, data);
    } else {
      // data = new Uint8Array(bytesPerRow * img.height);
      // for (let y = 0; y < img.height; ++y) {
      // 	for (let x = 0; x < img.width; ++x) {
      // 		let i = x * 4 + y * bytesPerRow;
      // 		data[i] = imageData.data[i];
      // 		data[i + 1] = imageData.data[i + 1];
      // 		data[i + 2] = imageData.data[i + 2];
      // 		data[i + 3] = imageData.data[i + 3];
      // 	}
      // }
      data = new Uint8Array(bytesPerRow * height);
      let pixelsIndex = 0;
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          let i = x * 4 + y * bytesPerRow;
          data[i] = imageData.data[pixelsIndex];
          data[i + 1] = imageData.data[pixelsIndex + 1];
          data[i + 2] = imageData.data[pixelsIndex + 2];
          data[i + 3] = imageData.data[pixelsIndex + 3];
          pixelsIndex += 4;
        }
      }
      console.log('여기냐2', width, data);
    }
    const textureDataBuffer = device.createBuffer({
      size: data.byteLength + data.byteLength % 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(textureDataBuffer, 0, data);
    const bufferView = {
      buffer: textureDataBuffer,
      bytesPerRow: bytesPerRow,
      rowsPerImage: height,
    };
    const textureView = {
      texture: cubeTexture,
      mipLevel: mip,
      origin: {
        z: Math.max(face, 0)
      },
    };
    const textureExtent = {
      width: width,
      height: height,
      depthOrArrayLayers: 1
    };
    const commandEncoder = device.createCommandEncoder({});
    console.log('흠', bufferView, textureView, textureExtent);
    commandEncoder.copyBufferToTexture(bufferView, textureView, textureExtent);
    device.queue.submit([commandEncoder.finish()]);
    // textureDataBuffer.destroy()
    console.log('mip', mip, 'width', width, 'height', height);
  }

  cubeTexture.mipMaps = mipMaps;
  console.log('cubeTexture', cubeTexture);
  return cubeTexture;
}
