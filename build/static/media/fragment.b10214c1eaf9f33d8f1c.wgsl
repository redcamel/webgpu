@group(0) @binding(1) var _Sampler: sampler;
@group(0) @binding(2) var _Texture: texture_2d<f32>;
struct InputData {
  @location(0) uv: vec2<f32>,
  @location(1) normal: vec3<f32>,
};
@stage(fragment)
fn main(inputData : InputData) -> @location(0) vec4<f32> {
    var diffuseColor:vec4<f32> = textureSample(_Texture,_Sampler, inputData.uv);
    // calc light
    var ld:vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    var lightPosition:vec3<f32> = vec3<f32>( 5,5, 5);
    var L:vec3<f32> = normalize(-lightPosition);
    var N:vec3<f32> = normalize(inputData.normal);
    var lightColor:vec4<f32> = vec4<f32>(1.0);
    var lambertTerm:f32 = dot(N,-L);
    var intensity:f32 = 1.0;
    if(lambertTerm > 0.0){
        ld = ld + lightColor * diffuseColor * lambertTerm * intensity;
    }
    var finalColor:vec4<f32> = ld;
  return finalColor;
}