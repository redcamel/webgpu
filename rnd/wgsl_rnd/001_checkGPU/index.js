import checkGPU from "../helper/checkGPU/checkGPU.js";
import makeFailMsg from "../helper/checkGPU/makeFailMsg.js";
import makeLimitDebug from "../helper/checkGPU/makeLimitDebug.js";

checkGPU()
	.then(result => {
		console.log('result', result)
		document.body.appendChild(makeLimitDebug(result,true))
	})
	.catch(_ => makeFailMsg())
