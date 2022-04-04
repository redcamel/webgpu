const ready = glslang();
ready.then(init);
const vertexShaderGLSL = `
	#version 450
    layout(set=0,binding = 0) uniform Uniforms {
        mat4 projectionMatrix;
        mat4 modelMatrix;
    } uniforms;
	layout(location = 0) in vec4 position;
	void main() {
		gl_Position = uniforms.projectionMatrix * uniforms.modelMatrix * position;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor = vec4(1.0, 0.0, 0.0, 1.0);
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
  cvs.width = 1024;
  cvs.height = 768;
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('webgpu');
  const swapChainFormat = "bgra8unorm";
  const presentationFormat = ctx.getPreferredFormat(adapter);
  const swapChain = configure(device, swapChainFormat, ctx);
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
        -1.0, -1.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, -1.0, 0.0, 1.0
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
      }
    ]
  });
  const matrixSize = 16 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix
  const uniformBufferSize = matrixSize * 2;
  // 유니폼 버퍼를 생성하고
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  console.log('uniformBuffer', uniformBuffer);
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
          arrayStride: 4 * 4,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: 0,
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
  // mat4.multiply(projectionMatrix, projectionMatrix, modelMatrix);
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
    mat4.translate(modelMatrix, modelMatrix, [Math.sin(time / 1000), Math.cos(time / 1000), -5]);
    mat4.rotateX(modelMatrix, modelMatrix, time / 1000);
    mat4.rotateY(modelMatrix, modelMatrix, time / 1000);
    mat4.rotateZ(modelMatrix, modelMatrix, time / 1000);
    mat4.scale(modelMatrix, modelMatrix, [1, 1, 1]);
    passEncoder.setBindGroup(0, renderData['uniformBindGroup']);
    // renderData['uniformBuffer'].setSubData(0, projectionMatrix);
    // renderData['uniformBuffer'].setSubData(4 * 16, modelMatrix);
    device.queue.writeBuffer(renderData['uniformBuffer'], 0, projectionMatrix);
    device.queue.writeBuffer(renderData['uniformBuffer'], 4 * 16, modelMatrix);
    passEncoder.draw(3, 1, 0, 0);
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
  // device.queue.writeBuffer(verticesBuffer,0, data)
  device.queue.writeBuffer(verticesBuffer, 0, data);
  console.log('verticesBuffer', verticesBuffer);
  console.log(`// makeVertexBuffer end /////////////////////////////////////////////////////////////`);
  return verticesBuffer;
}

