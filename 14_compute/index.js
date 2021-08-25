const ready = glslang();
ready.then(init);
const vertexShaderGLSL = `
	#version 450
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 scale;
    layout(location = 2) in float alpha;
    layout(location = 3) in vec4 a_pos;
    layout(location = 4) in vec2 a_uv;
    layout(location = 0) out vec2 tUV;
    layout(location = 1) out float vAlpha;
	void main() {
		float ratio = 976.0/1920.0; 
		mat4 scaleMTX = mat4(
			scale.x, 0, 0, 0,
			0, scale.y , 0, 0,
			0, 0, scale.z, 0,
			position, 1
		);
		gl_Position = scaleMTX * vec4(a_pos.x, a_pos.y/ratio, a_pos.z , 1);
		tUV = a_uv;
		vAlpha = alpha;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
    layout(location = 0) in vec2 tUV;
    layout(location = 1) in float vAlpha;
    layout(set = 0, binding = 0) uniform sampler uSampler;
	layout(set = 0, binding = 1) uniform texture2D uTexture;
	layout(location = 0) out vec4 outColor;
	void main() {
		outColor =  texture(sampler2D(uTexture, uSampler), tUV);
		outColor.rgb = mix(outColor.rgb,vec3(vAlpha,0,0),1-vAlpha);
	
		outColor.a *= vAlpha;
	}
`;
const PARTICLE_NUM = 60000;
const computeShader = `
	#version 450
	// 파티클 구조체 선언
	struct Info {
		float startValue;
		float endValue;
		float easeType;
		float value;
	};
	struct InfoGroup {
		Info infoX;
		Info infoY;
		Info infoZ;
	};
	struct Particle {
		float startTime;
	    float life;
	    vec4 valuePosition;
	    vec4 valueScale;
	    InfoGroup infoPosition;
	    InfoGroup infoScale;
	    Info infoAlpha;
	};
	
	// 이건 설정값인듯 하고
	layout(std140, set = 0, binding = 0) uniform SimParams {
	    float time;
	    float minLife;
	    float maxLife;
	} params;
	
	// 여기다 쓰곘다는건가	
	layout(std140, set = 0, binding = 1) buffer ParticlesA {
	    Particle particles[${PARTICLE_NUM}];
	} particlesA;
	
	

	float rand(vec2 co)
	{
	    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
	}
	const float PI = 3.141592653589793;
	const float HPI = PI * 0.5;
	const float PI2 = PI * 2;
	float calEasing(float n, float type){
		switch( int(type) ){
			// linear
			case 0 : break;
			// QuintIn
			case 1 : n = n * n * n * n * n; break;
			// QuintOut
			case 2 : n = ((n -= 1) * n * n * n * n) + 1; break;
			// QuintInOut
			case 3 : n = ((n = n * 2) < 1) ? n * n * n * n * n * 0.5 : 0.5 * ((n -= 2) * n * n * n * n + 2); break;
			////////////////////////
			// BackIn
			case 4 : n = n * n * (n * 1.70158 + n - 1.70158); break;
			// BackOut
			case 5 : n = (n -= 1) * n * (n * 1.70158 + n + 1.70158) + 1; break;
			// BackInOut
			case 6 : n = ((n = n * 2) < 1) ? 0.5 * n * n * (n * 1.70158 + n - 1.70158) : 0.5 * (n -= 2) * n * (n * 1.70158 + n + 1.70158) + 1; break;
			////////////////////////
			// CircIn
			case 7 : n = -1 * (sqrt(1 - n * n) - 1); break;
			// CircOut
			case 8 : n = sqrt(1 - (n -= 1) * n); break;
			// CircInOut
			case 9 : n = ((n = n * 2) < 1) ? -0.5 * (sqrt(1 - n * n) - 1) : 0.5 * sqrt(1 - (n -= 2) * n) + 0.5; break;
			////////////////////////
			// CubicIn
			case 10 : n = n * n * n; break;
			// CubicOut
			case 11 : n = ((n -= 1) * n * n) + 1; break;
			// CubicInOut
			case 12 : n = ((n = n * 2) < 1) ? n * n * n * 0.5 : 0.5 * ((n -= 2) * n * n + 2); break;
			////////////////////////
			// ExpoIn
			case 13 : n = n == 0.0 ? 0.0 : pow(2, 10 * (n - 1)); break;
			// ExpoOut
			case 14 : n = n == 1.0 ? 1.0 : -pow(2, -10 * n) + 1; break;
			// ExpoInOut
			case 15 : n = ((n = n * 2) < 1) ? (n == 0.0 ? 0.0 : 0.5 * pow(2, 10 * (n - 1))) : (n == 2.0 ? 1.0 : -0.5 * pow(2, -10 * (n - 1)) + 1); break;
			////////////////////////
			// QuadIn
			case 16 : n = n * n; break;
			// QuadOut
			case 17 : n = ((2 - n) * n); break;
			// QuadInOut
			case 18 : n = ((n = n * 2) < 1) ? n * n * 0.5 : 0.5 * ((2 - (n -= 1)) * n + 1); break;
			////////////////////////
			// QuartIn
			case 19 : n = n * n * n * n; break;
			// QuartOut
			case 20 : n = 1 - ((n -= 1) * n * n * n); break;
			// QuartInOut
			case 21 : n = ((n = n * 2) < 1) ? n * n * n * n * 0.5 : 1 - ((n -= 2) * n * n * n * 0.5); break;
			////////////////////////
			// SineIn
			case 22 : n = -cos(n * HPI) + 1; break;
			// SineOut
			case 23 : n = sin(n * HPI); break;
			// SineInOut
			case 24 : n = (-cos(n * PI) + 1) * 0.5; break;
			////////////////////////
			// ElasticIn
			case 25 : n = n == 0.0 ? 0.0 : n == 1.0 ? 1.0 : -1 * pow(2, 10 * (n -= 1)) * sin((n - 0.075) * (PI2) / 0.3); break;
			// ElasticOut
			case 26 : n = n == 0.0 ? 0.0 : n == 1.0 ? 1.0 : pow(2, -10 * n) * sin((n - 0.075) * (PI2) / 0.3) + 1; break;
			// ElasticInOut
			case 27 : n =( (n == 0.0 ? 0.0 : (n == 1.0 ? 1.0 : n *= 2)), (n < 1) ? -0.5 * pow(2, 10 * (n -= 1)) * sin((n - 0.075) * (PI2) / 0.3) : 0.5 * pow(2, -10 * (n -= 1)) * sin((n - 0.075) * (PI2) / 0.3) + 1); break;
		}
		return n;
	}
	
	void main() {
		uint index = gl_GlobalInvocationID.x;
		Particle targetParticle = particlesA.particles[index];
	
		float n;
		float age = params.time - targetParticle.startTime;
		float lifeRatio = age/targetParticle.life;
		if(lifeRatio>=1) {
			particlesA.particles[index].startTime = params.time;
			float t0 = rand(vec2(params.minLife,params.maxLife)+params.time)*params.maxLife;
			t0 = max(params.minLife,t0);
			particlesA.particles[index].life = t0;
			lifeRatio = 0;
		}
		// position
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoPosition.infoX.easeType);
		particlesA.particles[index].valuePosition.x = targetParticle.infoPosition.infoX.startValue +  (targetParticle.infoPosition.infoX.endValue - targetParticle.infoPosition.infoX.startValue) * n;
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoPosition.infoY.easeType);;
		particlesA.particles[index].valuePosition.y = targetParticle.infoPosition.infoX.startValue +  (targetParticle.infoPosition.infoY.endValue - targetParticle.infoPosition.infoY.startValue) * n;
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoPosition.infoZ.easeType);;
		particlesA.particles[index].valuePosition.z = targetParticle.infoPosition.infoX.startValue +  (targetParticle.infoPosition.infoZ.endValue - targetParticle.infoPosition.infoZ.startValue) * n;
		
		// scale
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoScale.infoX.easeType);;
		particlesA.particles[index].valueScale.x = targetParticle.infoScale.infoX.startValue + (targetParticle.infoScale.infoX.endValue - targetParticle.infoScale.infoX.startValue) * n;
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoScale.infoY.easeType);;
		particlesA.particles[index].valueScale.y = targetParticle.infoScale.infoY.startValue + (targetParticle.infoScale.infoY.endValue - targetParticle.infoScale.infoY.startValue) * n;
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoScale.infoZ.easeType);;
		particlesA.particles[index].valueScale.z = targetParticle.infoScale.infoZ.startValue +  (targetParticle.infoScale.infoZ.endValue - targetParticle.infoScale.infoZ.startValue) * n;
		
		// alpha
		n = lifeRatio;
		n =  calEasing(n, targetParticle.infoAlpha.easeType);;
		particlesA.particles[index].infoAlpha.value = targetParticle.infoAlpha.startValue +  (targetParticle.infoAlpha.endValue - targetParticle.infoAlpha.startValue) * n;
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
  cvs.width = 1920;
  cvs.height = 976;
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
  let computeModule = makeShaderModule_GLSL(glslang, device, 'compute', computeShader);
  let simParamData = new Float32Array(
    [
      performance.now(), // startTime time
      2000, 10000 // lifeRange
    ]
  );
  let simParamBuffer = makeUniformBuffer(
    device,
    simParamData
  );
  const PROPERTY_NUM = 40;
  const initialParticleData = new Float32Array(PARTICLE_NUM * PROPERTY_NUM);
  const currentTime = performance.now();
  for (let i = 0; i < PARTICLE_NUM; ++i) {
    let life = Math.random() * 8000 + 2000;
    let age = Math.random() * life;
    initialParticleData[PROPERTY_NUM * i + 0] = currentTime - age; // start time
    initialParticleData[PROPERTY_NUM * i + 1] = life; // life
    // position
    initialParticleData[PROPERTY_NUM * i + 4] = Math.random() * 2 - 1; // x
    initialParticleData[PROPERTY_NUM * i + 5] = Math.random() * 2 - 1; // y
    initialParticleData[PROPERTY_NUM * i + 6] = Math.random() * 2 - 1; // z
    initialParticleData[PROPERTY_NUM * i + 7] = 0;
    // scale
    initialParticleData[PROPERTY_NUM * i + 8] = 0; // scaleX
    initialParticleData[PROPERTY_NUM * i + 9] = 0; // scaleY
    initialParticleData[PROPERTY_NUM * i + 10] = 0; // scaleZ
    initialParticleData[PROPERTY_NUM * i + 11] = 0;
    // x
    initialParticleData[PROPERTY_NUM * i + 12] = 0; // startValue
    initialParticleData[PROPERTY_NUM * i + 13] = Math.random() * 2 - 1; // endValue
    initialParticleData[PROPERTY_NUM * i + 14] = parseInt(Math.random() * 27); // ease
    // y
    initialParticleData[PROPERTY_NUM * i + 16] = 0; // startValue
    initialParticleData[PROPERTY_NUM * i + 17] = Math.random() * 2 - 1; // endValue
    initialParticleData[PROPERTY_NUM * i + 18] = parseInt(Math.random() * 27); // ease
    // z
    initialParticleData[PROPERTY_NUM * i + 20] = 0; // startValue
    initialParticleData[PROPERTY_NUM * i + 21] = Math.random() * 2 - 1; // endValue
    initialParticleData[PROPERTY_NUM * i + 22] = parseInt(Math.random() * 27); // ease
    // scaleX
    let tScale = Math.random() * 12;
    initialParticleData[PROPERTY_NUM * i + 24] = 0; // startValue
    initialParticleData[PROPERTY_NUM * i + 25] = tScale; // endValue
    initialParticleData[PROPERTY_NUM * i + 26] = 0; // ease
    // scaleY
    initialParticleData[PROPERTY_NUM * i + 28] = 0; // startValue
    initialParticleData[PROPERTY_NUM * i + 29] = tScale; // endValue
    initialParticleData[PROPERTY_NUM * i + 30] = 0; // ease
    // scaleZ
    initialParticleData[PROPERTY_NUM * i + 32] = 0; // startValue
    initialParticleData[PROPERTY_NUM * i + 33] = tScale; // endValue
    initialParticleData[PROPERTY_NUM * i + 34] = 0; // ease
    // alpha
    initialParticleData[PROPERTY_NUM * i + 36] = Math.min(Math.random()); // startValue
    initialParticleData[PROPERTY_NUM * i + 37] = 0; // endValue
    initialParticleData[PROPERTY_NUM * i + 38] = parseInt(Math.random() * 27); // ease
    initialParticleData[PROPERTY_NUM * i + 39] = 0; // value
  }
  // 쉐이더 모듈을 만들었으니  버퍼를 만들어야함
  let tScale = 0.005;
  let vertexBuffer = makeVertexBuffer(
    device,
    new Float32Array(
      [
        // -0.01, -0.02, 0.01, -0.02, 0.00, 0.0
        -tScale, -tScale, 0.0, 1, 0.0, 0.0,
        tScale, -tScale, 0.0, 1, 0.0, 1.0,
        -tScale, tScale, 0.0, 1, 1.0, 0.0,
        //
        -tScale, tScale, 0.0, 1, 1.0, 0.0,
        tScale, -tScale, 0.0, 1, 0.0, 1.0,
        tScale, tScale, 0.0, 1, 1.0, 1.0
      ]
    )
  );
  const particleBuffer = device.createBuffer({
    size: initialParticleData.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
  });
  device.queue.writeBuffer(particleBuffer, 0, initialParticleData);
  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: {
          type: 'uniform',
        },
      },
      {binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: {
          type: 'storage',
        }}
    ],
  });
  const computePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [computeBindGroupLayout],
  });
  const particleBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: simParamBuffer,
          offset: 0,
          size: simParamData.byteLength
        },
      },
      {
        binding: 1,
        resource: {
          buffer: particleBuffer,
          offset: 0,
          size: initialParticleData.byteLength,
        },
      }
    ],
  });
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 그리기위해서 파이프 라인이란걸 또만들어야함 -_-;;
  const computePipeline = device.createComputePipeline({
    layout: computePipelineLayout,
    compute: {
      module: computeModule,
      entryPoint: "main"
    },
  });
  const depthTexture = device.createTexture({
    size: {width: cvs.width, height: cvs.height, depth: 1},
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
  const uniformsBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: 'filtering',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          type: "float"
        }
      }
    ]
  });
  /**
   * 텍스쳐를 만들어보자
   */
  const testTexture = await createTextureFromImage(device, '../assets/particle.png', GPUTextureUsage.TEXTURE_BINDING);
  // const testTexture = await createTextureFromImage(device, '../assets/crate.png', GPUTextureUsage.TEXTURE_BINDING );
  const testSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear"
  });
  console.log('testTexture', testTexture);
  const uniformBindGroupDescriptor = {
    layout: uniformsBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: testSampler,
      },
      {
        binding: 1,
        resource: testTexture.createView(),
      }
    ]
  };
  console.log('uniformBindGroupDescriptor', uniformBindGroupDescriptor);
  const uniformBindGroup = device.createBindGroup(uniformBindGroupDescriptor);
  console.log('uniformBindGroup', uniformBindGroup);
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({bindGroupLayouts: [uniformsBindGroupLayout]}),
    vertex: {
      module: vShaderModule,
      entryPoint: 'main',
      buffers: [
        {
          // instanced particles buffer
          arrayStride: PROPERTY_NUM * 4,
          stepMode: "instance",
          attributes: [
            {
              /* position*/
              shaderLocation: 0, offset: 4 * 4, format: "float32x3"
            },
            {
              /* scale*/
              shaderLocation: 1, offset: 8 * 4, format: "float32x3"
            },
            {
              /* alpha*/
              shaderLocation: 2, offset: 39 * 4, format: "float32"
            }
          ]
        },
        {
          // vertex buffer
          arrayStride: 6 * 4,
          stepMode: "vertex",
          attributes: [
            {
              // vertex positions
              shaderLocation: 3,
              offset: 0,
              format: "float32x4",
            },
            {
              // vertex uv
              shaderLocation: 4,
              offset: 4 * 4,
              format: "float32x2"
            }
          ],
        }
      ],
    },
    fragment: {
      module: fShaderModule,
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
          blend : {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: "add"
            },
            alpha: {
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: "add"
            }
          }
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
    depthStencil: {
      depthWriteEnabled: false,
      depthCompare: "always",
      format: "depth24plus-stencil8",
    },

  });
  let t = 0;
  let render = async function (time) {
    device.queue.writeBuffer(simParamBuffer, 0, new Float32Array([time]));
    const renderPassDescriptor = {
      colorAttachments: [{
        view: ctx.getCurrentTexture().createView(),  // Assigned later
        loadValue: {r: 0.0, g: 0.0, b: 0.0, a: 1.0},
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadValue: 1.0,
        depthStoreOp: "store",
        stencilLoadValue: 0,
        stencilStoreOp: "store",
      }
    };
    const commandEncoder = device.createCommandEncoder({});
    {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, particleBindGroup);
      passEncoder.dispatch(PARTICLE_NUM);
      passEncoder.endPass();
    }
    {
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      // passEncoder.setViewport(0, 0, 976, 976, 0, 1);
      // passEncoder.setScissorRect(0, 0, 976, 976);
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setVertexBuffer(0, particleBuffer);
      passEncoder.setVertexBuffer(1, vertexBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.draw(6, PARTICLE_NUM, 0, 0);
      passEncoder.endPass();
    }
    device.queue.submit([commandEncoder.finish()]);
    ++t;
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

function makeUniformBuffer(device, data) {
  console.log(`// makeUniformBuffer start /////////////////////////////////////////////////////////////`);
  let bufferDescriptor = {
    size: data.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  };
  let buffer = device.createBuffer(bufferDescriptor);
  console.log('bufferDescriptor', bufferDescriptor);
  device.queue.writeBuffer(buffer, 0, data);
  console.log('UniformBuffer', buffer);
  console.log(`// makeUniformBuffer end /////////////////////////////////////////////////////////////`);
  return buffer;
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
      depth: 1,
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
    depth: 1,
  });
  device.queue.submit([commandEncoder.finish()]);
  return texture;
}
