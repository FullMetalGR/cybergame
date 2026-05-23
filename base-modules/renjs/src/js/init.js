/* Handle Animation Ticks */
(function() {
	const worker = new Worker('js/worker.js');
	let t1 = 0;
	worker.onmessage = function() {
		let t2 = new Date().getTime();
		//console.log('fps =', 1000 / (t2 - t1) | 0);
		t1 = t2;
	}
})();

/* Disable onfocus and onblur */
(() => {
	const addEventListener = window.addEventListener;
	window.addEventListener = function(type, listener, other) {
		if (type.toLowerCase() == 'focus' || type.toLowerCase() == 'blur') return;
		return addEventListener.apply(this, arguments);
	};
})();


		
//// Clear RenJS storage
//(() => {
//	for (let key in window.localStorage) {
//		if (key.startsWith('RenJS')) {
//			window.localStorage.removeItem(key);
//		}
//	}
//})();
