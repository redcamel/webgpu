// define Struct
struct Uniforms {
  modelMatrix : mat4x4<f32>,
};
// define Struct OutData
struct OutData {
  @builtin(position) position : vec4<f32>,
  @location(0) color: vec4<f32>;
};
// define Struct InputData
struct InputData {
    @location(0) position : vec4<f32>,
    @location(1) color : vec4<f32>;
};
// define Uniform binding
@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@stage(vertex)

fn main(inputData : InputData) -> OutData {
  var outData : OutData;
  outData.position = uniforms.modelMatrix * vec4<f32>(inputData.position);
  outData.color = inputData.color;
  return outData;
}
