const checkGPU = async () => {
	let gpu, adapter, device
	let result
	try {
		gpu = navigator['gpu'];
		adapter = await gpu.requestAdapter();
		device = await adapter.requestDevice();
		result = {
			passYn: true,
			gpu,
			adapter,
			device
		}
	} catch (e) {
		result = {
			passYn: false,
			gpu,
			adapter,
			device
		}
	}
	return new Promise((resolve, reject) => {
		if (device) resolve(result)
    else reject(result)
	})
}
export default checkGPU