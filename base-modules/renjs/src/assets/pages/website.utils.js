/*
 * Emulated Website Utilities
 * GramThanos
 */


(() => {

	let Events = {
		_handle : {},
		_handle_once : {},
		init : function() {
			if (!this.window_listener) {
				this.window_listener = window.addEventListener("message", (event) => {
					// Verify that the message is coming from the same domain
					if (event.origin !== window.location.origin) {
						return;
					}
					if (event.data.type != 'renjs-event') {
						return;
					}
					
					this.fire(
						event.data.id,
						event.data.args || [],
						event.data.scope || {}
					);
				});
			}
		},
		fire : function(id, args = [], scope = {}) {
			if (this._handle_once.hasOwnProperty(id)) {
				let handle = this._handle_once[id];
				this._handle_once[id] = [];
				handle.forEach(handler => {
					setTimeout(() => {handler.call(scope, ... args);}, 0);
				});
			}
			if (this._handle.hasOwnProperty(id)) {
				this._handle[id].forEach(handler => {
					setTimeout(() => {handler.call(scope, ... args);}, 0);
				});
			}
		},
		listen : function(id, handler, once = false) {
			this.init();
			if (once) {
				if (!this._handle_once.hasOwnProperty(id)) {
					this._handle_once[id] = [];
				}
				this._handle_once[id].push(handler);
			}
			else {
				if (!this._handle.hasOwnProperty(id)) {
					this._handle[id] = [];
				}
				this._handle[id].push(handler);
			}
		},
		wait : function(id) {
			return new Promise(resolve => {
				this.listen(id, function () {
					resolve([... arguments]);
				}, true);
			});
		}
	};

	window.Game = {

		// Expose Events in case someone want to use them
		Events : Events,

		// Expose on message listeners
		onMessage : (id, handler) => {
			Events.listen('website-' + id, handler);
		},

		// Expose send message function
		sendMessage : (id, args = [], scope = {}) => {
			let parent = window.parent;
			if (parent == window) {
				console.log(`Failed to send message [no parent].`);
				return;
			}
			// Send message
			parent.postMessage({
				type: 'renjs-event',
				id : 'website-' + id,
				args : args,
				scope : scope
			}, window.location.origin);
		},

		// Disable right click
		rightClickHandler : document.addEventListener('contextmenu', event => {
			event.preventDefault();
			return false;
		})

	};

})();
