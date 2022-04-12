struct Uniforms {
  modelMatrix : mat4x4<f32>;
};
@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@stage(vertex)
fn main(@location(0) position : vec4<f32>) -> @builtin(position) vec4<f32> {
  return uniforms.modelMatrix * vec4<f32>(position);
}
