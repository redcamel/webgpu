"use strict";
import util_createTextureFromImage from './util_createTextureFromImage.js'
import util_makeShaderModule_GLSL from './util_makeShaderModule_GLSL.js'

const vertexShaderGLSL = `
	#version 450
    layout(set=0,binding = 0) uniform Uniforms {
        mat4 modelMTX;
    } uniforms;
     layout(set=1,binding = 0) uniform SystemUniforms {
        mat4 perspectiveMTX;
        mat4 cameraMTX;
    } systemUniforms;
	layout(location = 0) in vec3 position;
	layout(location = 1) in vec3 normal;
	layout(location = 2) in vec2 uv;
	layout(location = 0) out vec3 vNormal;
	layout(location = 1) out vec2 vUV;
	layout(location = 2) out vec4 vVertexPosition;	
	void main() {
		gl_Position = systemUniforms.perspectiveMTX * systemUniforms.cameraMTX * uniforms.modelMTX* vec4(position,1.0);
		vVertexPosition = uniforms.modelMTX * vec4(position, 1.0);
		vNormal = normal;
		vUV = uv;
	}
	`;
const fragmentShaderGLSL = `
	#version 450
	layout(location = 0) in vec3 vNormal;
	layout(location = 1) in vec2 vUV;
	layout(location = 2) in vec4 vVertexPosition;
	layout(set = 0, binding = 1) uniform sampler uSampler;
	layout(set = 0, binding = 2) uniform texture2D uDiffuseTexture;
	layout(set = 0, binding = 3) uniform texture2D uNormalTexture;
	layout(location = 0) out vec4 outColor;
	
	mat3 cotangent_frame(vec3 N, vec3 p, vec2 uv)
	{
	   vec3 dp1 = dFdx( p );
	   vec3 dp2 = dFdy( p );
	   vec2 duv1 = dFdx( uv );
	   vec2 duv2 = dFdy( uv );
	   
	   vec3 dp2perp = cross( dp2, N );
	   vec3 dp1perp = cross( N, dp1 );
	   vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
	   vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
	   
	   float invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );
	   return mat3( T * invmax, B * invmax, N );
	}
	
	vec3 perturb_normal( vec3 N, vec3 V, vec2 texcoord, vec3 normalColor )
   {	   
	   vec3 map = normalColor;
	   map =  map * 255./127. - 128./127.;
	   // map.xy *= u_normalPower;
	   map.xy *= 1.0;
	   mat3 TBN = cotangent_frame(N, V, texcoord);
	   return normalize(TBN * map);
	}
	
	void main() {
		vec4 diffuseColor = texture(sampler2D(uDiffuseTexture, uSampler), vUV) ;
		vec4 normalColor = texture(sampler2D(uNormalTexture, uSampler), vUV) ;
	    
	    vec3 N = normalize(vNormal);
		N = perturb_normal(N, vVertexPosition.xyz, vUV, normalColor.rgb) ;

		vec4 ld = vec4(0.0, 0.0, 0.0, 1.0);
		vec4 la = vec4(0.0, 0.0, 0.0, 0.2);
		vec4 ls = vec4(0.0, 0.0, 0.0, 1.0);
		vec4 specularLightColor = vec4(1.0);
		vec3 lightPosition = vec3( 5, 5, 5);
	    vec3 L = normalize(-lightPosition);
	
	    vec4 lightColor = vec4(1.0);
	    float lambertTerm = dot(N,-L);
	    float intensity = 1.0;
	    float shininess = 16.0;
	    float specular;
	    float specularPower = 1.0;
	    if(lambertTerm > 0.0){
			ld += lightColor * diffuseColor * lambertTerm * intensity;
			specular = pow( max(dot(reflect(L, N), -L), 0.0), shininess) * specularPower ;
			ls +=  specularLightColor * specular * intensity ;
	    }
	    vec4 finalColor = la+ld+ls;
		
		outColor = finalColor;
	}
`;
let vShaderModule;
let fShaderModule;
let uniformsBindGroupLayout;
let get_uniformsBindGroupLayout = function (redGPU) {
	if (!uniformsBindGroupLayout) {
		uniformsBindGroupLayout = redGPU.device.createBindGroupLayout({
			bindings: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer"
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampler"
				},
				{
					binding: 2,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampled-texture"
				},
				{
					binding: 3,
					visibility: GPUShaderStage.FRAGMENT,
					type: "sampled-texture"
				},
			]
		});
	}
	return uniformsBindGroupLayout
}

export default class RedStandardMaterial {
	static  matrixSize = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 4x4 matrix
	static uniformBufferSize = RedStandardMaterial.matrixSize;
	#diffuseTexture
	#normalTexture
	#redGPU;

	constructor(redGPU, diffuseSrc, normalSrc) {
		if (!vShaderModule) {
			vShaderModule = util_makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'vertex', vertexShaderGLSL);
			fShaderModule = util_makeShaderModule_GLSL(redGPU.glslang, redGPU.device, 'fragment', fragmentShaderGLSL);
		}
		this.#redGPU = redGPU
		this.vShaderModule = vShaderModule;
		this.fShaderModule = fShaderModule;
		this.uniformsBindGroupLayout = get_uniformsBindGroupLayout(redGPU)

		this.vertexStage = {
			module: vShaderModule,
			entryPoint: 'main'
		};
		this.fragmentStage = {
			module: fShaderModule,
			entryPoint: 'main'
		};

		this.sampler = redGPU.device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter: "linear",
			addressModeU: "mirror-repeat",
			addressModeV: "mirror-repeat",
			addressModeW: "mirror-repeat"
			// 	enum GPUAddressMode {
			// 	    "clamp-to-edge",
			// 		"repeat",
			// 		"mirror-repeat"
			//  };
		});

		// 유니폼 버퍼를 생성하고
		this.uniformBufferDescripter = {
			size: RedStandardMaterial.uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		}

		this.diffuseTexture = diffuseSrc
		this.normalTexture = normalSrc


	}

	set diffuseTexture(src) {
		let self = this;
		self.bindings = null;
		(async function (v) {
			self.#diffuseTexture = await util_createTextureFromImage(self.#redGPU.device, v, GPUTextureUsage.SAMPLED);
			console.log('로딩됨', v)
			self.resetBindingInfo()
		})(src);
	}

	get diffuseTexture() {
		return this.#diffuseTexture
	}

	set normalTexture(src) {
		let self = this;
		self.bindings = null;
		(async function (v) {
			self.#normalTexture = await util_createTextureFromImage(self.#redGPU.device, v, GPUTextureUsage.SAMPLED);
			console.log('로딩됨', v)
			self.resetBindingInfo()
		})(src);
	}

	get normalTexture() {
		return this.#normalTexture
	}

	resetBindingInfo() {
		console.log(this.#diffuseTexture && this.#normalTexture)
		if ('resetBindingInfo', this.#diffuseTexture && this.#normalTexture) {
			this.bindings = [
				{
					binding: 0,
					resource: {
						buffer: null,
						offset: 0,
						size: RedStandardMaterial.matrixSize
					}
				},
				{
					binding: 1,
					resource: this.sampler,
				},
				{
					binding: 2,
					resource: this.#diffuseTexture.createView(),
				},
				{
					binding: 3,
					resource: this.#normalTexture.createView(),
				}
			]
			this.uniformBindGroupDescriptor = {
				layout: this.uniformsBindGroupLayout,
				bindings: this.bindings
			}
			console.log(this.#diffuseTexture)
			console.log(this.#normalTexture)
		}
	}
}