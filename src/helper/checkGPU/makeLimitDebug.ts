const makeLimitDebug = (result, openYn) => {
	// limits
	const HD_onOff = () => {
		openYn = !openYn
		setContents()
	}
	const setContents = ()=>{
		openContainer.innerHTML = openYn ? 'close' : 'open'
		contentContainer.style.display = openYn ? '' : 'none'
	}
	const container = document.createElement('div')
	container.setAttribute('class', 'limits')
	//
	const titleContainer = document.createElement('div')
	titleContainer.setAttribute('class', 'titleBox')
	titleContainer.innerHTML = 'limits'
	container.appendChild(titleContainer)
	//
	const openContainer = document.createElement('button')
	openContainer.setAttribute('class', 'onoff')
	openContainer.innerHTML = openYn ? 'close' : 'open'
	titleContainer.appendChild(openContainer)
	openContainer.addEventListener('click', HD_onOff)
	//
	const contentContainer = document.createElement('div')
	contentContainer.setAttribute('class', 'contentContainer')
	container.appendChild(contentContainer)
	const {limits} = result.device
	for (const k in limits) {
		const t0 = document.createElement('div')
		t0.innerHTML = `${k} : <span>${limits[k].toLocaleString()}</span>`
		contentContainer.appendChild(t0)
	}
	//
	setContents();
	return container
}
export default makeLimitDebug