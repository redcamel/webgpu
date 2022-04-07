declare module '*.tsx' {
    const source: 'string';
    export default source;
}

declare module '*.wgsl' {
    const shader: 'string';
    export default shader;
}
