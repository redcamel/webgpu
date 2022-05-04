const makeFailMsg = () => {
    const t0 = document.createElement('div')
    t0.setAttribute('class', 'failMsg')
    t0.innerHTML = `These study samples run in Chrome Canary behind the flag --enable-unsafe-webgpu.
	<a href="https://github.com/redcamel/webgpu">github</a>
	`
    document.body.appendChild(t0)
}
export default makeFailMsg