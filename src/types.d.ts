
declare module '*.tsx' {
    const host: 'string';
    export default host;
}

declare module '*.wgsl' {
    const shader: 'string';
    export default shader;
}
