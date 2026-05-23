/*
 * Game Plugins
 * GramThanos
 */


//let getSlugClassName = function(_class) {
//	return [..._class.name].map(c => {
//		if ('A' <= c && c <= 'Z') return '_' + c.toLowerCase();
//		if ('a' <= c && c <= 'z') return c;
//		if ('0' <= c && c <= '9') return c;
//		return '_';
//	}).join('').replace(/^_+|_+$/g,'');
//};

// Init
// ------------------------------------------------------------
(function() {
	// Init showdown.js
	if (showdown) {
		showdown.setOption('openLinksInNewWindow', true);
	}
})();


// Tools
// ------------------------------------------------------------
const plugin_tools = {
	filters : {
		handler : function(params){
			let custom = {};
			if (params.custom) {
				Object.entries(params.custom).forEach((item) => {
					custom[item[0].toLowerCase()] = this.create(item[1]);
				});
			}
			let filters = params.filters || null;
			if (filters) {
				if (typeof filters === 'string') {
					filters = filters.split('|').map(filter => filter.toLowerCase());
				}
				return (value) => this.apply(value, filters, custom);
			}
			return null;
		},

		create : function(code) {
			return new Function('__value', 'return Promise.resolve((' + code + ')(__value));');
		},

		apply: async function(value, filters, custom) {
			return await filters.reduce(
				async (value, filter) => {
					let v = await value;
					switch (filter) {
						case 'print': return this.filter_print(v);
						case 'trim': return this.filter_trim(v);
						case 'capitalize': return this.filter_capitalize(v);
						case 'lowercase': return this.filter_lowercase(v);
						case 'uppercase': return this.filter_uppercase(v);
						case 'onlynumbers': return this.filter_onlynumbers(v);
						case 'onlyletters': return this.filter_onlyletters(v);
						case 'onlylettersandnumbers': return this.filter_onlylettersandnumbers(v);
						case 'sha256': return this.filter_hash(v, 'SHA-256');
					}
					if (typeof custom[filter] === 'function') {
						return (custom[filter])(v);	
					}
					console.log(`Unknown filter "${filter}".`);
					return Promise.resolve(value);
				},
				Promise.resolve(value)
			);
		},

		filter_print(value) {console.log(value);return Promise.resolve(value);},
		filter_trim(value) {return Promise.resolve(value.replace(/^\s+|\s+$/gm,''));},
		filter_lowercase(value) {return Promise.resolve(value.toLowerCase());},
		filter_uppercase(value) {return Promise.resolve(value.toUpperCase());},
		async filter_hash(value, alg) {
			if (window.crypto.subtle) {
				let utf8 = new TextEncoder().encode(value);
				let hashBuffer = await window.crypto.subtle.digest(alg, utf8);
				let hashHex = Array.from(new Uint8Array(hashBuffer))
					.map((bytes) => bytes.toString(16).padStart(2, '0'))
					.join('');
				return hashHex;
			}
			else {
				let utf8 = sjcl.codec.utf8String.toBits(value);
				let hashBuffer = 
					alg == 'SHA-512' ? sjcl.hash.sha512.hash(utf8) :
					alg == 'SHA-256' ? sjcl.hash.sha256.hash(utf8) :
					null;
				let hashHex = sjcl.codec.hex.fromBits(hashBuffer);
				return hashHex;
			}
		},
		filter_onlynumbers(value) {return Promise.resolve(value.replace(/[^0-9]+/gm,''));},
		filter_onlyletters(value) {return Promise.resolve(value.replace(/[^a-zA-Z]+/gm,''));},
		filter_onlylettersandnumbers(value) {return Promise.resolve(value.replace(/[^a-zA-Z0-9]+/gm,''));},
		filter_capitalize(value) {return Promise.resolve(value.toLowerCase().split(' ').map(word => (word.charAt(0).toUpperCase() + word.slice(1))).join(' '));},
	},
	scaled_ui : {
		init : function(game) {
			if (this.wrapper) return;
			this.game = game;
			this.sizes = {
				width : 1280,
				height : 800,
				top: -400,
				left: -640
			};
			this.groups = {};
			document.body.style.overflow = 'hidden';
			
			this.wrapper = document.createElement('div');
			this.wrapper.style.position = 'fixed';
			this.wrapper.style.width = this.sizes.width + 'px';
			this.wrapper.style.height = this.sizes.height + 'px';
			this.wrapper.style.top = '50%';
			this.wrapper.style.left = '50%';
			this.wrapper.style.marginTop = this.sizes.top + 'px';
			this.wrapper.style.marginLeft = this.sizes.left + 'px';
			//this.wrapper.style.background = 'rgba(255,0,0,0.5)';
			this.wrapper.style.pointerEvents = 'none';
			this.wrapper.style.overflow = 'hidden';
			this.wrapper.style.scale = '1';

			window.addEventListener('resize', (event) => {
				this.resize();
			});
			setInterval(() => {this.resize();}, 1000);
			this.resize();
			document.body.appendChild(this.wrapper);
		},
		resize : function() {
			let cache = (this.game.scale.width / this.game.width);
			if (this._cache_scale == cache) return;
			this._cache_scale = cache;
			this.wrapper.style.scale = (this.game.scale.width / this.game.width);
		},
		appendChild : function(element, group = 'default') {
			if (!this.groups.hasOwnProperty(group)) {
				this.groups[group] = [];
			}
			this.groups[group].push(element);
			element.style.pointerEvents = 'all';
			this.wrapper.appendChild(element);
		},
		clear : function(group = 'default') {
			if (!this.groups.hasOwnProperty(group)) {
				return;
			}
			this.groups[group].forEach(element => {
				element.parentNode.removeChild(element);
			});
			this.groups[group] = [];
			//this.wrapper.textContent = '';
		}
	},
	event : {
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
		},
		unregister : function(id, handler = null) {
			let _handlers = [this._handle_once, this._handle];
			let done = _handlers.map(_handle => {
				if (!_handle.hasOwnProperty(id)) return false;
				if (handler) {
					// Remove handler from array
					let index = _handle[id].indexOf(handler);
					if (index < 0) return false;
					_handle[id].splice(index, 1);
					// No handlers, thus remove event by id
					if (_handle[id].length == 0) {
						delete _handle[id];
					}
					// Handler was unregistered 
					return true;
				}
				else {
					// No handlers, thus remove event by id
					let h = _handle[id].length; // number of handlers
					delete _handle[id];
					// if there were handlers to unregister, return true
					return (h > 0 ? true : false);
				}
			});
			return (done[0] || done[1]);
		},
		clear : function(id, startsWith = false) {
			if (startsWith) {
				[...new Set([
					... Object.keys(this._handle),
					... Object.keys(this._handle_once)
				])].filter(key => key.startsWith(id)).forEach(id => {
					this.unregister(id);
				});
			}
			else {
				this.unregister(id);
			}
		}
	},
	scorm : {
		getValue : function(_id, _defvalue) {
			if (!window.SCORM) return;
			return window.SCORM.getValue(_id, _defvalue);
		},
		setValue : function(_id, _value, _callback) {
			if (!window.SCORM) return;
			window.SCORM.setValue(_id, _value, _callback);
		}
	},
	assets : {
		find : function(game, name) {
			let assets = game.guiSetup.assets;
			if (assets.images.hasOwnProperty(name)) return assets.images[name];
			if (assets.spritesheets.hasOwnProperty(name)) return assets.spritesheets[name];
			return null;
		}
	}
};


// Game Events
// ------------------------------------------------------------
function plugin_Events(_events = {}) {

	// Plugin Class
	class Events extends RenJS.Plugin {
		onInit() {
			if (_events.onInit) {
				_events.onInit();
			}
		}
	};

	// Return Plugin
	let mod = '_' + (Math.random() + 1).toString(36).substring(7).toUpperCase();
	return ['Events' + mod, Events];
}


// Allow Relative Positions
// ------------------------------------------------------------
function plugin_RelativePositions() {

	// Plugin Class
	class RelativePositions extends RenJS.Plugin {
		beforeInit() {
			console.log('testing beforeInit');
		}

		onInit() {
			let w = this.game.config.w;
			let h = this.game.config.h;

			// For each hud item in config
			this.game.guiSetup.config.hud.forEach((item) => {
				this.parseObject(item, w, h);
				if (item.hasOwnProperty('ctc')) {
					this.parseObject(item.ctc, w, h);
				}
				if (item.hasOwnProperty('text')) {
					this.parseObject(item.text, w, h);
				}
			});

			// For menu hud item in config
			let menus = this.game.guiSetup.config.menus;
			Object.keys(menus).forEach((name) => {
				menus[name].forEach((item) => {
					this.parseObject(item, w, h);

				});
			});

			//// For asset item in config
			//let assets = this.game.guiSetup.config.assets;
			//Object.keys(assets).forEach((name) => {
			//	assets[name].forEach((item) => {
			//		this.parseObject(item, w, h);
			//	});
			//});

			// storyConfig
			let positions = this.game.storyConfig.positions;
			Object.keys(positions).forEach((name) => {
				this.parseObject(positions[name], w, h);
			});
		}

		parseObject(obj, _x, _y) {
			if (obj.hasOwnProperty('x'))
				obj.x = Math.round(this.parsePosition(obj.x, _x));
			if (obj.hasOwnProperty('y'))
				obj.y = Math.round(this.parsePosition(obj.y, _y));
		}

		parsePosition(relative, unit) {
			if (typeof relative == 'string') {
				let i = relative.match(/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/);
				if (i) {
					return (parseInt(i[1], 10) * (unit / parseInt(i[2], 10)));
				}
			}
			return relative;
		}
	};

	// Return Plugin
	return ['RelativePositions', RelativePositions];
}


// Instant Start Game
// ------------------------------------------------------------
function plugin_Start(_config = {}) {
	// Plugin default configuration
	if (!_config.hasOwnProperty('onlyOnce'))
		_config.onlyOnce = true;

	// Private plugin scope
	let _scope = {};

	// Plugin Class
	class Start extends RenJS.Plugin {
		onInit() {
			_scope.counter = 0;

			if ((!_config.nextScene && !_config.firstScene) && this.game.CheckPoint) {
				let scene;
				if (scene = this.game.CheckPoint.shouldRestore()) {
					_config.nextScene = scene;
					_config.skipMainMenu = true;
				}
				else if (scene = this.game.CheckPoint.canRestore()) {
					_config.nextScene = 'scene-checkpoint-restore';
				}
			}

			// Swap start scene with new one
			if (_config.firstScene && this.game.story.hasOwnProperty(_config.firstScene)) {
				this.game.story['start'] = this.game.story[_config.firstScene];
			}
			// Replace scenes of start with custom one
			if (_config.nextScene && this.game.story.hasOwnProperty(_config.nextScene)) {
				this.game.story['start'].forEach(action => {
					if (action.scene) action.scene = _config.nextScene;
				});
			}

			let self = this;
			// If skip main menu
			if (_config.skipMainMenu) {
				// Save original function
				_scope.showMenu = this.game.gui.showMenu;

				// Patch function
				this.game.gui.showMenu = function(name) {
					_scope.counter++;

					if (name == 'main' && (!_config.onlyOnce || _scope.counter == 1)) {
						let p = self.game.start();
						return;
					}
					
					// Call original method
					return _scope.showMenu.call(this, ... arguments);
				};
			}
		}
	};

	// Return Plugin
	return ['Start', Start];
}


// Get/Set data from SCORM
// ------------------------------------------------------------
function plugin_SCORMGetValue(scorm) {

	// Plugin Class
	class SCORMGetValue extends RenJS.Plugin {
		onCall(params) {
			this.game.managers.logic.vars[params.variable] = scorm.getValue(params.model, params.default);
			this.game.resolveAction();
		}
	};

	// Return Plugin
	return ['SCORMGetValue', SCORMGetValue];
}
function plugin_SCORMSetValue(scorm) {

	// Plugin Class
	class SCORMSetValue extends RenJS.Plugin {
		onCall(params) {
			scorm.setValue(params.model, params.value);
			this.game.resolveAction();
		}
	};

	// Return Plugin
	return ['SCORMSetValue', SCORMSetValue];
}


// TextInput
// ------------------------------------------------------------
/*
function plugin_TextInput() {

	var resize_function = null;
	window.addEventListener("resize", (event) => {
		if (!resize_function) return;
		resize_function();
	});

	// Plugin Class
	class TextInput extends RenJS.Plugin {

		async onCall(params) {
			let label = params.body;
			let color = params.color || 'black';
			let type = params.type || 'text';
			let variable = params.variable || 'input';
			let defaultValue = params.default || '';
			let parser = plugin_tools.filters.handler({
				custom: params.customFilters,
				filters: params.filters,
			});

			// Parse variables
			label = this.game.managers.logic.parseVars(label.toString());

			await this.showTextInput(label, color, type, defaultValue, variable, parser);
			this.game.resolveAction();
		}

		showTextInput(label, color, type, defaultValue, variable, parser) {
			return new Promise(resolve => {
				// create html input
				const input = this.createInputElement(type, defaultValue);

				const confirmChange = async () => {
					if (input.value != '') {
						// play an sfx if you want
						// this.game.managers.audio.playSFX('buttonsfx');
						let value = input.value;
						if (parser) value = await parser(value);
						this.game.managers.logic.vars[variable] = value;
						
						// hide everything
						this.game.add.tween(input.style).to({opacity:0},750,Phaser.Easing.Linear.None,true);
						await Promise.all([
							this.game.screenEffects.transition.FADEOUT(modal),
							this.game.screenEffects.transition.FADEOUT(title),
							this.game.screenEffects.transition.FADEOUT(btn)
						]);
						// destroy everything
						modal.destroy();
						title.destroy();
						btn.destroy();
						input.remove();
						resize_function = null;
						// re activate hud
						this.game.gui.hud.show();

						// end action
						resolve();
					}
				}

				// confirm on enter
				input.onkeydown = function(e){
					if (e.keyCode==13) {
						confirmChange();
					}
					e.stopPropagation();
				};
				input.style.opacity = 0;
				document.body.appendChild(input);

				// Create background
				const modal = this.game.add.graphics();
				modal.beginFill(0x000000);
				modal.drawRect(0, 0, this.game.width, this.game.height);
				modal.endFill();
				modal.alpha = 0;

				// Create label
				const style = {... this.game.gui.hud.cHandlers.default.config.text.style};
				style.fontSize = '26pt';
				style.fontWeight = 'bold';
				style.fill = color;
				const title = this.game.add.text(
					this.game.world.centerX,
					this.game.world.centerY - 100,
					label,
					style
				);
				title.stroke = '#ffffff';
				title.strokeThickness = 4;
				title.anchor.set(0.5);

				// create confirm button ass well
				const btn = this.game.add.button(
					this.game.world.centerX,
					this.game.world.centerY + 100,
					"button_confirm",
					confirmChange,
					this, 1, 0, 2, 0);
				btn.anchor.set(0.5);

				// deactivate the hud, so players won't mess up with it while inputing text
				this.game.gui.hud.hide();
				// fade in background and input element
				this.game.add.tween(modal).to({alpha:0.5},250,Phaser.Easing.Linear.None,true);
				this.game.screenEffects.transition.FADEIN(btn);
				this.game.screenEffects.transition.FADEIN(title);
				this.game.add.tween(input.style).to({opacity:1},250,Phaser.Easing.Linear.None,true);
				input.focus();
			})
		}

		createInputElement(type, defaultValue){
			const input = document.createElement("input");
			input.type = type;
			input.setAttribute('autocomplete', 'off');
			input.setAttribute('spellcheck', 'false');
			input.value = defaultValue ? defaultValue : "";
			// add a css class to the input
			// input.className = "canvas-input";
			
			// if you want max input text length, add it here
			// input.setAttribute('maxlength', '10');

			// the input element needs to be scaled along he game
			const inputProps = {
				x: (1280 - 600) / 2,
				y: 350,
				width: 600,
				height: 50,
				fontSize: 32,
				border: 5
			};
			input.style.position = 'absolute';
			input.style.color = '#ff2a6d';
			this.calculateSize(input, inputProps);
			resize_function = () => {
				this.calculateSize(input, inputProps);
			};
			return input;
		}

		calculateSize(input, inputProps) {
			const scale = this.game.scale.width / this.game.width;
			const canvas = this.game.canvas;
			const canvasWidth = canvas.offsetWidth;
			const canvasHeight = canvas.offsetHeight;
			const topLeft = [
				(canvasWidth / 2) - (this.game.scale.width / 2) + canvas.offsetLeft,
				(canvasHeight / 2) - (this.game.scale.height / 2) + canvas.offsetTop
			]
			input.style.left = Math.round(topLeft[0] + (inputProps.x * scale)) + "px";
			input.style.top = Math.round(topLeft[1] + (inputProps.y * scale)) + "px";
			input.style.width = Math.round(inputProps.width * scale) + "px";
			input.style.height = Math.round(inputProps.height * scale) + "px";
			input.style['font-size'] = Math.round(inputProps.fontSize * scale) + "px";
			input.style.border = Math.max(Math.round(inputProps.border * scale), 1) + "px solid #ff2a6d";
		}
	};

	// Return Plugin
	return ['TextInput', TextInput];
}
*/
function plugin_TextInput() {

	// Plugin Class
	class TextInput extends RenJS.Plugin {

		async onCall(params) {
			let label = params.body;
			let color = params.color || 'black';
			let type = params.type.trim().toLowerCase() || 'text';
			let variable = params.variable.trim() || 'input';
			let defaultValue = params.default || '';
			let parser = plugin_tools.filters.handler({
				custom: params.customFilters,
				filters: params.filters,
			});

			// Parse variables
			label = this.game.managers.logic.parseVars(label.toString());

			await this.showTextInput(label, color, type, defaultValue, variable, parser);
			this.game.resolveAction();
		}

		showTextInput(label, color, type, defaultValue, variable, parser) {
			return new Promise(async (resolve) => {
				let width = Math.round(this.game.width / 2);
				let height = Math.round(this.game.height * 0.4);
				let offset_x = Math.round((this.game.width - width) / 2);
				let offset_y = Math.round((this.game.height - height) / 2);

				// Create background
				let modal = document.createElement('div');
				modal.style.position = 'absolute';
				modal.style.top = '0px';
				modal.style.bottom = '0px';
				modal.style.left = '0px';
				modal.style.right = '0px';
				modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
				modal.style.zIndex = '100';
				modal.style.opacity = '0';
				modal.style.display = 'none';

				let wrapper = document.createElement('div');
				wrapper.style.position = 'absolute';
				wrapper.style.top = offset_y + 'px';
				wrapper.style.bottom = offset_y + 'px';
				wrapper.style.left = offset_x + 'px';
				wrapper.style.right = offset_x + 'px';
				wrapper.style.color = '#202020';
				wrapper.style.background = 'rgb(255, 255, 255,0.8)';
				wrapper.style.padding = '10px 30px';
				wrapper.style.zIndex = '101';
				wrapper.style.opacity = '0';
				wrapper.style.display = 'flex';
				wrapper.style.alignItems = 'center';
				let wrapper_inner = document.createElement('div');
				wrapper.appendChild(wrapper_inner);

				this.modal = modal;
				this.wrapper = wrapper;

				let label_element = document.createElement("div");
				label_element.innerHTML = label;
				wrapper_inner.appendChild(label_element);

				let input = document.createElement("input");
				input.type = type;
				input.setAttribute('autocomplete', 'off');
				input.setAttribute('spellcheck', 'false');
				input.value = defaultValue ? defaultValue : "";
				input.style.color = '#ff2a6d';
				input.style.width = (width - 30*2 - 3*2) + 'px';
				input.style.fontSize = '22px';
				//input.style.width = Math.round(inputProps.width * scale) + "px";
				//input.style.height = Math.round(inputProps.height * scale) + "px";
				//input.style['font-size'] = Math.round(inputProps.fontSize * scale) + "px";
				input.style.border = "3px solid #ff2a6d";
				wrapper_inner.appendChild(input);

				let confirmChange = async () => {
					if (input.value.length == 0) return;
					
					let value = input.value;
					if (parser) value = await parser(value);
					this.game.managers.logic.vars[variable] = value;
					
					// Hide everything
					if (this.anim_wrapper) this.anim_wrapper.stop();
					if (this.anim_modal) this.anim_modal.stop();

					this.wrapper.style.opacity = 1;
					this.wrapper.style.display = 'flex';
					this.modal.style.opacity = 1;
					this.modal.style.display = 'block';
					this.anim_wrapper = this.game.add.tween(this.wrapper.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
					this.anim_modal = this.game.add.tween(this.modal.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
					await Promise.all([
						new Promise((resolve) => {
							this.anim_wrapper.onComplete.add(() => {
								this.anim_wrapper = null;
								resolve();
							});
						}),
						new Promise((resolve) => {
							this.anim_modal.onComplete.add(() => {
								this.anim_modal = null;
								resolve();
							});
						})
					]);
					this.wrapper.style.display = 'none';
					this.modal.style.display = 'none';

					// Destroy everything
					plugin_tools.scaled_ui.clear('fullscreen-input');
					delete this.wrapper;
					delete this.modal;

					// Re-activate hud
					//this.game.gui.hud.show();

					resolve();
				}

				// Detect Enter
				input.addEventListener('keydown', function(e){
					if (e.keyCode == 13) {
						confirmChange();
					}
					e.stopPropagation();
				}, false);
				//input.onkeydown = function(e){
				//	if (e.keyCode == 13) {
				//		confirmChange();
				//	}
				//	e.stopPropagation();
				//};

				let btn = document.createElement("button");
				btn.textContent = 'Submit';
				btn.className = 'story-btn';
				btn.style.fontSize = '22px';
				btn.style.lineHeight = '32px';
				btn.style.float = 'right';
				btn.style.marginTop = '5px';
				btn.addEventListener('click', confirmChange, false);
				wrapper_inner.appendChild(btn);

				plugin_tools.scaled_ui.init(this.game);
				plugin_tools.scaled_ui.clear('fullscreen-input');
				plugin_tools.scaled_ui.appendChild(modal, 'fullscreen-input');
				plugin_tools.scaled_ui.appendChild(wrapper, 'fullscreen-input');

				// Deactivate the hud
				//this.game.gui.hud.hide();

				// Show input
				this.wrapper.style.opacity = 0;
				this.wrapper.style.display = 'flex';
				this.modal.style.opacity = 0;
				this.modal.style.display = 'block';
				this.anim_wrapper = this.game.add.tween(this.wrapper.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
				this.anim_modal = this.game.add.tween(this.modal.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
				await Promise.all([
					new Promise((resolve) => {
						this.anim_wrapper.onComplete.add(() => {
							this.anim_wrapper = null;
							resolve();
						});
					}),
					new Promise((resolve) => {
						this.anim_modal.onComplete.add(() => {
							this.anim_modal = null;
							resolve();
						});
					})
				]);
				input.focus();
			})
		}
	};

	// Return Plugin
	return ['TextInput', TextInput];
}


// Variable Filters
// ------------------------------------------------------------
function plugin_VarFilters() {

	// Plugin Class
	class VarFilters extends RenJS.Plugin {

		async onCall(params) {
			let filters = params.body.split('|');
			let from_variable = filters.shift();
			let to_variable = filters.pop();

			let parser = plugin_tools.filters.handler({
				custom: params.custom,
				filters: filters,
			});

			let value = this.game.managers.logic.vars[from_variable];
			value = await parser(value);
			this.game.managers.logic.vars[to_variable] = value;

			this.game.resolveAction();
		}
	};

	// Return Plugin
	return ['VarFilters', VarFilters];
}


// Execute Javascript
// ------------------------------------------------------------
function plugin_ExecJs() {

	// Plugin Class
	class ExecJs extends RenJS.Plugin {

		async onCall(params) {
			let code = new Function('', 'return Promise.resolve((() => {' + params.body + ';})());');
			await code.call(this.game.managers.logic.vars);

			this.game.resolveAction();
		}
	};

	// Return Plugin
	return ['ExecJs', ExecJs];
}


// Layout Section Title
// ------------------------------------------------------------
function plugin_LayoutSectionTitle() {

	// Plugin Class
	class LayoutSectionTitle extends RenJS.Plugin {

		onStart() {
			this.pos = {
				top: {x: 0, y: 50},
				bottom: {x: 0, y: 50}
			};
			this.layout = {
				padding: [15, 10],
				fadein: 250,
				fadeout: 250
			};
			this.color = {
				bg: 0x000000,
				text: '#ffffff'
			};
			this.objects = {
				top: [],
				bottom: []
			};

			this.fontSize = 22;
		}

		async onCall(params) {
			let command = params.body.split(' ');
			if (command[0] == 'DESTROY') {
				let objs = [];
				if (command[1] == 'TOP' || command[1] == 'ALL') {
					objs = objs.concat(this.objects['top']);
					this.objects['top'] = [];
				}
				if (command[1] == 'BOTTOM' || command[1] == 'ALL') {
					objs = objs.concat(this.objects['bottom']);
					this.objects['bottom'] = [];
				}
				await this.destroyLayout(objs);
				this.game.resolveAction();
				return;
			}

			let text = this.game.managers.logic.parseVars(params.body.toString());
			let position = (params.position || 'top').toLowerCase();
			if (position != 'top' && position != 'bottom') position = 'top';
			let bg_color = params.bg || this.color.bg;
			let text_color = params.text || this.color.text;
			let wait4click = (params.hasOwnProperty('waitForClick') ? '' + params.waitForClick : 'false').toLowerCase() == 'false' ? false : true;

			await this.createTitle(text, bg_color, text_color, position, wait4click);
			this.game.resolveAction();
		}

		async createTitle(text, bg_color, text_color, position, wait4click) {
			// Get position
			let pos = this.pos[position];

			let object_group = this.game.make.group();
			let object_text;
			if (position == 'top') {
				object_text = this.game.make.text(
					pos.x + this.layout.padding[0],
					pos.y + this.layout.padding[1],
					text,
					{
						fontStyle : 'normal',
						font: 'normal ' + this.game.gui.hud.cHandlers.default.config.text.style.fontSize + ' ' + this.game.gui.hud.cHandlers.default.config.text.style.font,
						fill: text_color
					}
				);
			}
			else if (position == 'bottom') {
				object_text = this.game.make.text(
					this.game.width - this.layout.padding[0],
					this.game.height - (pos.y + this.layout.padding[1]),
					text,
					{
						fontStyle : 'normal',
						font: 'normal ' + this.game.gui.hud.cHandlers.default.config.text.style.fontSize + ' ' + this.game.gui.hud.cHandlers.default.config.text.style.font,
						fill: text_color
					}
				);
			}
			let object_text_size = [
				object_text.width + (2 * this.layout.padding[0]),
				object_text.height + (2 * this.layout.padding[1])
			];

			if (position == 'bottom') {
				object_text.position.x -= object_text.width;
				object_text.position.y -= object_text.height;
			}

			let object_bg = this.game.make.graphics();
			object_bg.beginFill(bg_color);
			if (position == 'top') {
				object_bg.drawRect(
					pos.x,
					pos.y,
					object_text_size[0],
					object_text_size[1]
				);
				object_bg.drawTriangle(
					[[0,-object_text_size[1]], [0,0], [+object_text_size[1],0]].map(
						point => new Phaser.Point(
							pos.x + object_text_size[0] + point[0],
							pos.y + object_text_size[1] + point[1]
						)
					)
				);
			}
			else if (position == 'bottom') {
				object_bg.drawRect(
					this.game.width - (pos.x + object_text_size[0]),
					this.game.height - (pos.y + object_text_size[1]),
					object_text_size[0],
					object_text_size[1]
				);
				object_bg.drawTriangle(
					[[0,+object_text_size[1]], [0,0], [-object_text_size[1],+object_text_size[1]]].map(
						point => new Phaser.Point(
							this.game.width - (pos.x + object_text_size[0]) + point[0],
							this.game.height - (pos.y + object_text_size[1]) + point[1]
						)
					)
				);
			}
			object_bg.endFill();

			object_group.add(object_bg);
			object_group.add(object_text);
			object_group.alpha = 0;
			this.game.add.existing(object_group);
			this.objects[position].push(object_group);


			if (position == 'top') {
				object_group.position.x -= object_group.width;
			}
			else if (position == 'bottom') {
				object_group.position.x += object_group.width;
			}

			let anim = this.game.add.tween(object_group).to({alpha:1, x: 0},this.layout.fadein,Phaser.Easing.Linear.None,true);
			let events = [
				new Promise((resolve) => {
					this.game.waitForClick(() => {
						if (anim.isRunning) {
							anim.stop(true);
							object_group.alpha = 1;
							object_group.position.x = 0;
						}
						resolve();
					});
				})
			];
			if (!wait4click) {
				events.push(
					new Promise((resolve) => {
						anim.onComplete.add(() => {
							resolve();
						});
					})
				);
			}
			await Promise.any(events);
			this.game.control.waitForClick = false;
		}

		async destroyLayout(objects) {
			let events = [];
			let anims = [];
			if (objects.length == 0) {
				return;
			}
			objects.forEach(obj => {
				let anim = this.game.add.tween(obj).to({alpha:0},this.layout.fadeout,Phaser.Easing.Linear.None,true);
				anims.push(anim);
				events.push(
					new Promise((resolve) => {
						anim.onComplete.add(() => {
							resolve();
						});
					})
				);
			});
			events.push(
				new Promise((resolve) => {
					this.game.waitForClick(() => {
						anims.forEach(anim => {
							if (anim.isRunning) {
								anim.stop(true);
							}
						});
						objects.forEach(obj => {
							obj.alpha = 0;
						});
						resolve();
					});
				})
			);
			await Promise.any(events);
			this.game.control.waitForClick = false;
			objects.forEach(obj => {
				obj.destroy();
			});
		}
	};

	// Return Plugin
	return ['LayoutSectionTitle', LayoutSectionTitle];
}


// Layout Mobile Messages
// ------------------------------------------------------------
function plugin_LayoutMobileMessages() {

	// Plugin Class
	class LayoutMobileMessages extends RenJS.Plugin {

		onStart() {
			this.pos_start = {x: 50, y: 140};
			this.pos_current = {x: 0, y: 0};
			this.layout = {
				message : {
					width: 400,
					padding: [15, 10],
					arrow: 30
				},
				align: {
					left : 0,
					center: 175,
					right : 350
				},
				fadein: 250,
				fadeout: 250
			};
			this.color = {
				left: {
					bg: 0x1e4e79,
					text: '#ffffff'
				},
				center: {
					bg: 0x999999,
					text: '#ffffff'
				},
				right: {
					bg: 0x833c0b,
					text: '#ffffff'
				}
			}

			this.fontSize = 22;

			this.reset();
		}

		reset() {
			this.wrapper = null;
			this.pos_current.x = this.pos_start.x;
			this.pos_current.y = this.pos_start.y;
		}

		async onCall(params) {
			if (params.body.trim().toUpperCase() == 'DESTROY') {
				await this.destroyLayout();
				this.game.resolveAction();
				return;
			}

			let text = this.game.managers.logic.parseVars(params.body.toString());
			let align = (params.align || 'left').toLowerCase();
			if (align != 'left' && align != 'center' && align != 'right') align = 'left';
			let bg_color = params.bg || this.color[align].bg;
			let text_color = params.text || this.color[align].text;
			let wait4click = (params.hasOwnProperty('waitForClick') ? '' + params.waitForClick : 'true').toLowerCase() == 'false' ? false : true;

			await this.createMessage(text, bg_color, text_color, align, wait4click);
			this.game.resolveAction();
		}

		async createMessage(text, bg_color, text_color, align, wait4click) {
			// If not wrapper create one
			if (!this.wrapper) {
				this.wrapper = this.game.make.group();
				this.wrapper.alpha = 1;
				this.game.add.existing(this.wrapper);
			}
			// Get position
			let pos = this.getPosition(align);

			let object_group = this.game.make.group();
			let object_text = this.game.make.text(pos.x + this.layout.message.padding[0], pos.y + this.layout.message.padding[1], text, {
				fontStyle : 'normal',
				font: 'normal ' + this.game.gui.hud.cHandlers.default.config.text.style.fontSize + ' ' + this.game.gui.hud.cHandlers.default.config.text.style.font,
				fill: text_color,
				wordWrap: true,
				wordWrapWidth: this.layout.message.width - (2 * this.layout.message.padding[0])
			});
			let height = Math.max(object_text.height + (2 * this.layout.message.padding[1]), this.layout.message.arrow);

			let object_bg = this.game.make.graphics();
			object_bg.beginFill(bg_color);
			object_bg.drawRect(pos.x, pos.y, this.layout.message.width, height);
			if (align == 'left'){
				object_bg.drawTriangle(
					[[0,-this.layout.message.arrow], [0,0], [+this.layout.message.arrow,0]].map(
						point => new Phaser.Point(pos.x + this.layout.message.width + point[0], pos.y + height + point[1])
					)
				);
			}
			else if (align == 'right'){
				object_bg.drawTriangle(
					[[0,-this.layout.message.arrow], [0,0], [-this.layout.message.arrow,0]].map(
						point => new Phaser.Point(pos.x + point[0], pos.y + height + point[1])
					)
				);
			}
			object_bg.endFill();

			object_group.add(object_bg);
			object_group.add(object_text);
			object_group.alpha = 0;
			this.wrapper.add(object_group);
			//this.game.add.existing(object_group);
			this.movePosition(height);

			let anim = this.game.add.tween(object_group).to({alpha:1},this.layout.fadein,Phaser.Easing.Linear.None,true);
			let events = [
				new Promise((resolve) => {
					this.game.waitForClick(() => {
						if (anim.isRunning) {
							anim.stop(true);
							object_group.alpha = 1;
						}
						resolve();
					});
				})
			];
			if (!wait4click) {
				events.push(
					new Promise((resolve) => {
						anim.onComplete.add(() => {
							resolve();
						});
					})
				);
			}
			await Promise.any(events);
			this.game.control.waitForClick = false;
		}

		getPosition(align) {
			let dx = 0;
			if (align == 'left') dx = this.layout.align.left;
			else if (align == 'right') dx = this.layout.align.right;
			else if (align == 'center') dx = this.layout.align.left;
			return {
				x: this.pos_current.x + dx,
				y: this.pos_current.y
			};
		}

		movePosition(dy) {
			this.pos_current.y += dy + 10;
		}

		async destroyLayout() {
			if (this.wrapper) {
				//await this.game.screenEffects.transition.FADEOUT(this.wrapper);
				let anim = this.game.add.tween(this.wrapper).to({alpha:0},this.layout.fadeout,Phaser.Easing.Linear.None,true);
				let events = [
					new Promise((resolve) => {
						anim.onComplete.add(() => {
							resolve();
						});
					}),
					new Promise((resolve) => {
						this.game.waitForClick(() => {
							if (anim.isRunning) {
								anim.stop(true);
								this.wrapper.alpha = 0;
							}
							resolve();
						});
					})
				];
				await Promise.any(events);
				this.game.control.waitForClick = false;
				this.wrapper.destroy();
			}
			this.reset();
		}
	};

	// Return Plugin
	return ['LayoutMobileMessages', LayoutMobileMessages];
}


// Download Files
// ------------------------------------------------------------
function plugin_DownloadFiles() {

	var resize_function = null;
	window.addEventListener("resize", (event) => {
		if (!resize_function) return;
		resize_function();
	});

	// Plugin Class
	class DownloadFiles extends RenJS.Plugin {

		async onCall(params) {
			let info = params.body;
			let files = params.files;
			let buttonText = params.button || 'Next';

			// Parse variables
			info = this.game.managers.logic.parseVars(info.toString());
			buttonText = this.game.managers.logic.parseVars(buttonText.toString());

			files = this.parseFiles(files);
			if (files.length > 0) {
				await this.showFiles(info, files, buttonText);
			}
			this.game.resolveAction();
		}

		parseFiles(_files) {
			let files = [];
			for (let i = 0; i < _files.length; i++) {
				let file = _files[i];
				let filename = file.split(/(\\|\/)/g).pop();
				let ext = filename.split('.').pop();
				let url = file;
				files.push({
					filename : filename,
					ext : ext,
					url : url
				});
			}
			return files;
		}

		/*
		getIcon(ext) {
			switch(ext) {
				case 'png':
				case 'jpeg':
				case 'jpg':
				case 'gif':
					return '🖼';
				case 'mp3':
					return '🎵';
				case 'wav':
				case 'avi':
				case 'mp4':
					return '🎞️';
				case 'js':
				case 'py':
					return '📃';
				case 'iso':
					return '💿';
				case 'zip':
				case 'rar':
				case 'tar':
					return '📦';
				default:
					return '📄';
			}
		}
		*/

		showFiles(info, files, buttonText) {
			return new Promise(resolve => {
				// Create html div
				const wrapper = document.createElement('div');
				wrapper.style.position = 'fixed';
				wrapper.style.width = '500px';
				wrapper.style.height = '300px';
				wrapper.style.top = '50%';
				wrapper.style.marginTop = '-185px';
				wrapper.style.left = '50%';
				wrapper.style.marginLeft = '-250px';
				wrapper.style.paddingBottom = '70px';
				wrapper.classList.add("story-box");

				// Add info text
				const textinfo = document.createElement('div');
				textinfo.textContent = info;
				wrapper.appendChild(textinfo);

				// Add files on wrapper
				const files_box = document.createElement('div');
				files_box.style.padding = '15px 0px';
				files.forEach((file) => {
					let a = document.createElement('a');
					a.className = 'story-btn';
					a.href = file.url;
					a.setAttribute('target', '_blank');
					a.setAttribute('download', file.filename);
					a.textContent = file.filename;
					files_box.appendChild(a);
				});
				wrapper.appendChild(files_box);

				// Add ok button
				const ok = document.createElement('button');
				ok.textContent = buttonText;
				ok.classList.add('story-btn');
				ok.style.position = 'absolute';
				ok.style.bottom = '10px';
				ok.style.right = '10px';
				wrapper.appendChild(ok);

				// Hide and add on page
				wrapper.style.opacity = 0;
				document.body.appendChild(wrapper);

				// Create background
				const modal = this.game.add.graphics();
				modal.beginFill(0x000000);
				modal.drawRect(0, 0, this.game.width, this.game.height);
				modal.endFill();
				modal.alpha = 0;

				ok.addEventListener('click', async ()=> {
					// hide everything
					this.game.add.tween(wrapper.style).to({opacity:0},750,Phaser.Easing.Linear.None,true);
					await Promise.all([
						this.game.screenEffects.transition.FADEOUT(modal)
					]);
					// destroy everything
					modal.destroy();
					wrapper.remove();
					// re activate hud
					this.game.gui.hud.show();
					// end action
					resolve();
				}, false);

				// deactivate the hud, so players won't mess up with it while inputing text
				this.game.gui.hud.hide();
				// fade in background and input element
				this.game.add.tween(modal).to({alpha:0.5},250,Phaser.Easing.Linear.None,true);
				this.game.add.tween(wrapper.style).to({opacity:1},250,Phaser.Easing.Linear.None,true);
				wrapper.focus();
			});
		}
	};

	// Return Plugin
	return ['DownloadFiles', DownloadFiles];
}


// Side Panel
// ------------------------------------------------------------
function plugin_SidePanel(id = '', options={}) {
	// Plugin Class
	class SidePanel extends RenJS.Plugin {

		onInit() {
			if (id.toLowerCase() == 'history' && this.game.CheckPoint) {
				this.game.CheckPoint.sidepanel = this;
			}
		}

		async onCall(params) {
			if (params.body) {
				let command = params.body.trim().toUpperCase();
				if (command == 'HIDE') {
					await this.hide();
					this.game.resolveAction();
					return;
				}
				else if (command == 'SHOW') {
					await this.show();
					this.game.resolveAction();
					return;
				}
				else if (command == 'CLOSE') {
					await this.close();
					this.game.resolveAction();
					return;
				}
				else if (command == 'OPEN') {
					await this.open();
					this.game.resolveAction();
					return;
				}
				else if (command == 'CLEAR') {
					this.clearContent();
					this.game.resolveAction();
					return;
				}
				else if (command == 'DESTROY') {
					if (params.dontwait) this.destroyUI();
					else await this.destroyUI();
					this.game.resolveAction();
					return;
				}
			}


			let content = params.content || [];
			
			let done = await this.initUI();
			if (done) {
				if (params.dontwait) this.show();
				else await this.show();
			}

			content.forEach(item => {
				this.parseContent(item);
			});
			if (content.length) this.notification(1);

			this.game.resolveAction();
		}

		async initUI() {
			if (this.wrapper) return false;

			this._open = false;
			this.content = [];

			let width = this.game.width / 3;
			let height = this.game.height - 2*10;
			let offset = -(width + 2*30);
			this.offset = offset;

			let modal = document.createElement('div');
			modal.style.position = 'absolute';
			modal.style.top = '0px';
			modal.style.bottom = '0px';
			modal.style.left = '0px';
			modal.style.right = '0px';
			modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
			modal.style.zIndex = '5000';
			let modal_busy = false;
			modal.addEventListener('click', async () => {
				if (modal_busy) return;
				modal_busy = true;
				await this.close();
				modal_busy = false;
			}, false);
			modal.style.opacity = '0';
			modal.style.display = 'none';

			let wrapper = document.createElement('div');
			wrapper.style.position = 'absolute';
			wrapper.style.width = width + 'px';
			wrapper.style.height = height + 'px';
			wrapper.style.top = '0px';
			wrapper.style.right = offset + 'px';
			wrapper.style.color = '#202020';
			wrapper.style.background = '#ffffff';
			wrapper.style.padding = '10px 30px';
			wrapper.style.zIndex = '5001';
			wrapper.style.opacity = '0';

			let button = document.createElement('div');
			button.style.position = 'absolute';
			button.style.width = '0';
			button.style.height = '0';
			button.style.borderTop = '60px solid transparent';
			button.style.borderRight = '50px solid #fff';
			button.style.borderBottom = '60px solid transparent';
			button.style.top = (isNaN(options?.btn?.top) ? 20 : options?.btn?.top) + 'px';
			button.style.left = (-48) + 'px';
			button.style.cursor = 'pointer';
			wrapper.appendChild(button);
			let text = document.createElement('div');
			text.style.position = 'absolute';
			text.style.fontSize = '24px';
			text.style.width = '30px';
			text.style.height = '100px';
			text.style.lineHeight = '100px';
			text.style.top = '-50px';
			text.style.left = '14px';
			text.style.textAlign = 'center';
			text.style.color = '#01012b';
			//text.style.transform = 'rotate(0deg)';
			//text.style.transition = 'transform 0.5s';

			let icon = document.createElement('i');
			icon.className = options?.btn?.icon ? options.btn.icon : "fa-solid fa-note-sticky";
			text.appendChild(icon);

			let notification = document.createElement('span');
			notification.style.lineHeight = '18px';
			notification.style.width = '18px';
			notification.style.fontSize = '12px';
			notification.style.background = '#F44336';
			notification.style.borderRadius = '50%';
			notification.style.color = 'white';
			notification.style.textAlign = 'center';
			notification.style.fontFamily = 'monospace';
			notification.style.position = 'absolute';
			notification.style.top = '28px';
			notification.style.right = '-4px';
			notification.style.display = 'none';
			notification.textContent = '';
			text.appendChild(notification);
			this.notificationTracker = {
				counter: 0,
				element: notification,
				visible: false,
				offset: -1,
			};

			button.appendChild(text);
			let button_busy = false;
			button.addEventListener('click', async () => {
				if (button_busy) return;
				button_busy = true;
				await this.toggle();
				button_busy = false;
			}, false);

			let content = document.createElement('div');
			content.style.position = 'absolute';
			content.style.top = '0px';
			content.style.bottom = '0px';
			content.style.right = '0px';
			content.style.left = '0px';
			content.style.padding = '10px 30px';
			content.style.overflow = 'auto';
			content.style.overflowWrap = 'break-word';
			wrapper.appendChild(content);
			this.scrollableContent = content;

			this.modal = modal;
			this.wrapper = wrapper;
			this.wrapper_text = text;
			this.wrapper_content = content;

			plugin_tools.scaled_ui.init(this.game);
			plugin_tools.scaled_ui.clear('side-pannel' + (id.length > 0 ? '-' + id.toLowerCase() : ''));
			plugin_tools.scaled_ui.appendChild(modal, 'side-pannel' + (id.length > 0 ? '-' + id.toLowerCase() : ''));
			plugin_tools.scaled_ui.appendChild(wrapper, 'side-pannel' + (id.length > 0 ? '-' + id.toLowerCase() : ''));

			return true;
		}

		async destroyUI() {
			if (!this.wrapper) return;
			await this.hide();

			plugin_tools.scaled_ui.clear('side-pannel' + (id.length > 0 ? '-' + id.toLowerCase() : ''));

			delete this._open;
			delete this.content;
			delete this.offset;
			delete this.modal;
			delete this.wrapper;
			delete this.wrapper_text;
			delete this.wrapper_content;

			delete this._visible;
			delete this._open;
			delete this.anim_visibility;
			delete this.anim_wrapper;
			delete this.anim_modal;
		}

		async show() {
			if (this._visible) {
				return;
			}
			if (this.anim_visibility) {
				this.anim_visibility.stop();
			}

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim_visibility = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this._visible = true;
		}

		async hide() {
			if (!this._visible) {
				return;
			}
			if (this.anim_visibility) {
				this.anim_visibility.stop();
			}
			await this.close();

			this.wrapper.style.opacity = 1;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim_visibility = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'none';

			this._visible = false;
		}

		async open() {
			if (!this._visible || this._open) {
				return;
			}
			if (this.anim_wrapper) {
				this.anim_wrapper.stop();
				this.anim_modal.stop();
			}

			let anim_wrapper = this.game.add.tween({
				_value : this.offset,
				element : this.wrapper.style,
				get value() {return this._value;},
				set value(value) {
					this._value = value;
					this.element.right = this._value + 'px';
				}
			}).to({value: 0}, 500, Phaser.Easing.Cubic.InOut, true);
			//this.wrapper_text.style.transform = 'rotate(-45deg)';
			this.wrapper.style.zIndex = '5002';

			this.modal.style.pointerEvents = 'all';
			this.modal.style.opacity = '0';
			this.modal.style.display = 'block';
			let anim_modal = this.game.add.tween(this.modal.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);

			this.anim_wrapper = anim_wrapper;
			this.anim_modal = anim_modal;

			await Promise.all([
				new Promise((resolve) => {
					anim_wrapper.onComplete.add(() => {
						resolve();
					});
				}),
				new Promise((resolve) => {
					anim_modal.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.notification(false);
			this._open = true;
		}

		async close() {
			if (!this._visible || !this._open) {
				return;
			}
			if (this.anim_wrapper) {
				this.anim_wrapper.stop();
			}
			
			let anim_wrapper = this.game.add.tween({
				_value : 0,
				element : this.wrapper.style,
				get value() {return this._value;},
				set value(value) {
					this._value = value;
					this.element.right = this._value + 'px';
				}
			}).to({value: this.offset}, 500, Phaser.Easing.Cubic.InOut, true);
			//this.wrapper_text.style.transform = 'rotate(0deg)';
			
			this.modal.style.pointerEvents = 'none';
			this.modal.style.display = 'block';
			this.modal.style.opacity = '1';
			let anim_modal = this.game.add.tween(this.modal.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);

			this.anim_wrapper = anim_wrapper;

			await Promise.all([
				new Promise((resolve) => {
					anim_wrapper.onComplete.add(() => {
						resolve();
					});
				}),
				new Promise((resolve) => {
					anim_modal.onComplete.add(() => {
						this.modal.style.display = 'none';
						this.wrapper.style.zIndex = '5001';
						resolve();
					});
				})
			]);

			this._open = false;
		}

		async toggle() {
			if (this._open) await this.close();
			else await this.open();
		}

		parseContent(item, register = true) {
			let type = item.type.toLowerCase();

			if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'].includes(type)) {
				let element = document.createElement(type);
				if (item.text) {
					element.textContent = this.game.managers.logic.parseVars(item.text.toString());
				}
				else if (item.html) {
					element.innerHTML = this.game.managers.logic.parseVars(item.html.toString());
				}
				else if (item.md) {
					element.innerHTML = new showdown.Converter().makeHtml(
						this.game.managers.logic.parseVars(item.md.toString())
					);
				}
				if (item.style) {
					Object.entries(item.style).forEach(entry => {
						element.style[entry[0]] = entry[1];
					});
				}
				if (item.class) {
					element.className = item.class;
				}
				if (item.data) {
					Object.entries(item.data).forEach(entry => {
						element.dataset[entry[0]] = entry[1];
					});
				}
				this.wrapper_content.appendChild(element);
				this.scrollTo(element);
				if (register) this.content.push(element);
				return element;
			}

			else if (type.substr(0, 6) == 'input-') {
				if (item.label) {
					let label = document.createElement('div');
					label.style.marginBottom = '5px';
					label.style.marginTop = '20px';
					label.textContent = this.game.managers.logic.parseVars(item.label.toString());
					this.wrapper_content.appendChild(label);
					if (register) this.content.push(label);
				}

				let element = document.createElement('input');
				element.type = type.substr(6);
				element.setAttribute('autocomplete', 'off');
				element.setAttribute('spellcheck', 'false');
				element.placeholder = item.defaultValue ? item.defaultValue : '';
				element.style.color = '#ff2a6d';
				element.style.fontSize = '22px';
				element.style.lineHeight = '32px';
				element.style.border = '3px solid #ff2a6d';
				element.style.width = '100%';
				element.style.margin = '4px -4px';
				if (item.style) {
					Object.entries(item.style).forEach(entry => {
						element.style[entry[0]] = entry[1];
					});
				}

				if (item.variable) {
					let variable = item.variable.trim() || 'input';
					let parser = plugin_tools.filters.handler({
						custom: item.customFilters,
						filters: item.filters,
					});

					let onChange = async () => {
						// Update variable
						let value = element.value;
						if (parser) value = await parser(value);
						this.game.managers.logic.vars[item.variable] = value;
					}
					onChange();

					// Detect Change
					element.addEventListener('keydown', function(e){
						if (e.keyCode == 13) {
							onChange();
						}
						e.stopPropagation();
					}, false);
					element.addEventListener('change', function(e){
						onChange();
						e.stopPropagation();
					}, false);
				}
				this.wrapper_content.appendChild(element);
				this.scrollTo(element);
				if (register) this.content.push(element);
				return element;
			}

			else if (type == 'button') {
				let element = document.createElement('button');
				element.textContent = item.text ? item.text : 'Submit';
				element.className = 'story-btn';
				element.style.fontSize = '22px';
				element.style.lineHeight = '32px';
				element.style.marginTop = '5px';

				if (item.style) {
					Object.entries(item.style).forEach(entry => {
						element.style[entry[0]] = entry[1];
					});
				}

				let action = item.action ? item.action.trim().replace(/\s+/g, ' ').split(' ') : [false];
				if (['event'].includes(action[0].toLowerCase())) {
					let action_type = action[0].toLowerCase();
					let onClick = async () => {
						if (action_type == 'event') {
							let event_id = action[1];
							//if (item.condition) {
							//	let code = new Function('', 'return Promise.resolve((() => {return (' + item.condition + ');})());');
							//	let result = await code.call(this.game.managers.logic.vars);
							//	if (!result) {
							//		return;
							//	}
							//}
							plugin_tools.event.fire(event_id);
						}
					}

					element.addEventListener('click', onClick, false);
				}
				this.wrapper_content.appendChild(element);
				this.scrollTo(element);
				if (register) this.content.push(element);
				return element;
			}

			else if (type.substr(0, 7) == ('ProTip-').toLowerCase()) {
				let pro_tip_id = type.substr(7).trim();
				let pro_tip_html = ''; // ToDo: remove
				if (item.html) { // ToDo: remove
					pro_tip_html = item.html;
				}
				else if (item.md) { // ToDo: remove
					pro_tip_html = new showdown.Converter().makeHtml(
						this.game.managers.logic.parseVars(item.md.toString())
					);
				}
				let element = this.parseContent({
					type: 'p',
					class: 'pro-tip-item',
					html: `
						<span class="pro-tip-tag"><i class="fa-solid fa-lock"></i> Pro Tip</span>
						<span class="pro-tip-icon"><i class="fa-solid fa-lock"></i></span>
						<span class="pro-tip-msg">Click to Unlock</span>
					`
				});
				element.addEventListener('click', function() {
					let icon = this.getElementsByClassName('pro-tip-icon')[0];
					icon.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
					setTimeout(() => {
						this.innerHTML = `
							<span class="pro-tip-tag"><i class="fa-solid fa-lock-open"></i> Pro Tip</span>
							${pro_tip_html}
						`;
						this.className = 'pro-tip-item-unlocked';
					}, 1200);
				}, false);
				this.scrollTo(element);
				return element;
			}

			else if (type.substr(0, 8) == ('ProHint-').toLowerCase()) {
				let pro_hint_id = type.substr(7).trim();
				let pro_hint_html = ''; // ToDo: remove
				if (item.html) { // ToDo: remove
					pro_hint_html = item.html;
				}
				else if (item.md) { // ToDo: remove
					pro_hint_html = new showdown.Converter().makeHtml(
						this.game.managers.logic.parseVars(item.md.toString())
					);
				}
				let element = this.parseContent({
					type: 'p',
					class: 'pro-hint-item',
					html: `
						<span class="pro-hint-tag"><i class="fa-solid fa-lock"></i> Pro Hint</span>
						<span class="pro-hint-icon"><i class="fa-solid fa-lock"></i></span>
						<span class="pro-hint-msg">Click to Unlock</span>
					`
				});
				element.addEventListener('click', function() {
					let icon = this.getElementsByClassName('pro-hint-icon')[0];
					icon.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
					setTimeout(() => {
						this.innerHTML = `
							<span class="pro-hint-tag"><i class="fa-solid fa-lock-open"></i> Pro Hint</span>
							${pro_hint_html}
						`;
						this.className = 'pro-hint-item-unlocked';
					}, 1200);
				}, false);
				this.scrollTo(element);
				return element;
			}

			else if (type.substr(0, 8) == ('History-').toLowerCase()) {
				let history_id = type.substr(8).trim();
				let element = this.parseContent({
					type: 'p',
					class: 'history-item',
					text: item.text
				});
				//element.dataset.historyId = history_id;
				this.game.CheckPoint.registerView(history_id, element);
			}

			else {
				console.log(`[SidePanel] Error. Unknown type "${item.type}".`);
			}
		}

		notification(counter) {
			let tracker = this.notificationTracker;
			if (!tracker) return;

			if (counter) tracker.counter += counter;
			else tracker.counter = tracker.offset;

			counter = tracker.counter + tracker.offset;
			if (counter < 1) {
				if (tracker.visible) {
					tracker.counter = tracker.offset;
					tracker.visible = false;
					tracker.element.style.display = 'none';
				}
			}
			else {
				if (!tracker.visible) {
					let text = counter > 99 ? '99' : counter.toString();
					tracker.visible = true;
					tracker.element.style.display = 'block';
					tracker.element.textContent = text;
				}
			}
		}

		scrollTo(element = false) {
			this.scrollableContent.scrollTop = !element ? this.scrollableContent.scrollHeight : element.offsetTop;
		}

		clearContent() {
			let items = this.content;
			this.content = [];
			items.forEach(item => {
				item.parentNode.removeChild(item);
			});
		}
	};

	// Return Plugin
	return ['SidePanel' + id, SidePanel];
}


// Rename Character
// ------------------------------------------------------------
function plugin_RenameCharacter() {
	// Plugin Class
	class RenameCharacter extends RenJS.Plugin {

		async onCall(params) {
			let info = params.body ? this.game.managers.logic.parseVars(params.body.toString()) : null;
			let char_id = params.id || null;
			let char_name = params.name || null;

			// Decode from given message
			// ex. player to Thanos
			if (!char_id || !char_name) {
				info = info.replace(/^\s+|\s+$/gm,'').replace(/^\s+$/gm,' ').split(' ');
				if (info.length < 3) {
					console.error('RenameCharacter: Invalid number of parameters');
					return;
				}
				char_id = info.shift();
				if (info.shift().toLowerCase() != 'to') {
					console.error('RenameCharacter: Invalid action');
					return;
				}
				char_name = info.join(' ');
			}

			this.game.managers.character.characters[char_id].config.displayName = char_name;
			this.game.resolveAction();
		}
	};

	// Return Plugin
	return ['RenameCharacter', RenameCharacter];
}


// Socket Shell
// ------------------------------------------------------------
function plugin_SocketShell() {
	// Plugin Class
	class SocketShell extends RenJS.Plugin {

		async onCall(params) {
			let command = params.body.trim().toUpperCase();
			if (command == 'HIDE') {
				await this.hide();
				this.game.resolveAction();
				return;
			}
			else if (command == 'SHOW') {
				await this.show();
				this.game.resolveAction();
				return;
			}
			else if (command == 'DESTROY') {
				await this.destroyUI();
				this.game.resolveAction();
				return;
			}
			else if (command == 'CONNECT') {
				this.connection_tries = 0;
				this.connection_max_tries = 3;
				let session = {
					protocol : params.protocol || 'ws',
					host : params.host || document.location.hostname,
					port : params.port || '8888',
					type : params.type || 'raw',
					path : params.path || '',
					cmd : params.cmd || '',
				};

				Object.keys(session).forEach(key => {
					session[key] = this.game.managers.logic.parseVars(session[key].toString().trim());
				});
				this.session = session;

				if (params.scorm) {
					await this.getSession();
				}

				await this.initUI();
				this.game.resolveAction();
				return;
			}

			this.game.resolveAction();
		}

		async getSession() {
			let params = await (new Promise(resolve => {
				plugin_tools.scorm.setValue('cmi.ext.docker.session_init', 'true', (data) => {
					if (!data[0] || !data[0].docker_session) {
						let error = (data[0] && data[0].hasOwnProperty('error')) ? data[0].error : 'Unknown';
						console.error('Failed to load session:', error);
						this.connection_tries++;
						if (this.connection_tries <= this.connection_max_tries) {
							window.setTimeout(async () => {
								console.log(`[${this.connection_tries}/${this.connection_max_tries}] Retrying to get session ...`);
								let res = await this.getSession();
								this.loadShellPage(this.iframe);
							}, 3 * 1000);
							resolve({loading: 'true'});
						}
						else {
							resolve({error: 'Failed to initialise remote shell.'});
						}
					}
					else {
						resolve({id: data[0].docker_session});
					}
				});
			}));

			
			// Set path
			if (params.hasOwnProperty('id')) {
				this.shell_params = {};
				this.session.path += '/wssession?id=' + encodeURIComponent(params.id);
				return true;
			}
			else {
				this.shell_params = params;
				return false;
			}
		}

		async initUI() {
			if (this.wrapper) return;

			let width = 1000;
			let height = 528;

			let wrapper = document.createElement('div');
			wrapper.style.position = 'absolute';
			wrapper.style.width = width + 'px';
			wrapper.style.height = (height + 24) + 'px';
			wrapper.style.top = ((this.game.height - height) * 2 / 3) + 'px';
			wrapper.style.left = ((this.game.width - width) / 2) + 'px';
			wrapper.style.background = '#202020';
			wrapper.style.border = '2px solid #202020';
			wrapper.style.opacity = 0;
			wrapper.style.display = 'none';

			let title = document.createElement('div');
			title.textContent = 'Shell';
			title.style.background = '#202020';
			title.style.color = '#fff';
			title.style.height = '24px';
			title.style.fontSize = '16px';
			title.style.lineHeight = '24px';
			title.style.paddingLeft = '6px';
			wrapper.appendChild(title);

			let iframe = document.createElement('iframe');
			iframe.style.display = 'block';
			iframe.style.border = '0px';
			iframe.setAttribute('width', width);
			iframe.style.width = width + 'px';
			iframe.setAttribute('height', height);
			iframe.style.height = height + 'px';
			this.loadShellPage(iframe);
			wrapper.appendChild(iframe);
			this.iframe = iframe;

			let reset = document.createElement('a');
			reset.textContent = '↺';
			reset.style.float = 'right';
			reset.style.textAlign = 'center';
			reset.style.cursor = 'pointer';
			reset.style.width = '22px';
			reset.style.height = '22px';
			reset.style.lineHeight = '22px';
			reset.style.background = '#545454';
			title.appendChild(reset);
			reset.addEventListener('click', () => {
				iframe.src = iframe.src;
			}, false);

			plugin_tools.scaled_ui.init(this.game);
			plugin_tools.scaled_ui.clear('socket-shell');
			plugin_tools.scaled_ui.appendChild(wrapper, 'socket-shell');

			this.wrapper = wrapper;
			this.visible = false;
		}

		loadShellPage(iframe) {
			let params = this.shell_params || {};
			params['session'] = btoa(JSON.stringify(this.session));
			
			// Prepare query string
			let query = [];
			for (var p in params) {
				if (params.hasOwnProperty(p)) {
					query.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
				}
			}
			query = query.join('&');

			//iframe.src = 'assets/pages/shell.html' + '?session=' + encodeURIComponent(btoa(JSON.stringify(this.session)));
			iframe.src = 'assets/pages/shell.html' + '?' + query;
		}

		destroyUI() {
			plugin_tools.scaled_ui.clear('socket-shell');
			this.wrapper = null;
		}

		async show() {
			if (this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.visible = true;
		}

		async hide() {
			if (!this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.wrapper.style.opacity = 1;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'none';

			this.visible = false;
		}
	};

	// Return Plugin
	return ['SocketShell', SocketShell];
}


// Website
// ------------------------------------------------------------
function plugin_Website() {
	// Plugin Class
	class Website extends RenJS.Plugin {

		async onCall(params) {
			let command = (params.body || '').trim().toUpperCase();
			if (command == 'HIDE') {
				await this.hide();
				this.game.resolveAction();
				return;
			}
			else if (command == 'SHOW') {
				await this.show();
				this.game.resolveAction();
				return;
			}
			else if (command == 'DESTROY') {
				await this.destroyUI();
				this.game.resolveAction();
				return;
			}
			else if (command == 'LOAD') {
				this.browser = this.game.managers.logic.parseVars((params.browser || 'google-chrome').toString().trim());
				this.url = this.game.managers.logic.parseVars((params.url || 'about:blank').toString().trim());
				this.title = this.game.managers.logic.parseVars((params.title || 'Website').toString().trim());
				this.address = this.game.managers.logic.parseVars((params.address || 'https://example.com').toString().trim());
				this.height = parseInt(this.game.managers.logic.parseVars((params.height || 528).toString().trim()));
				if (isNaN(this.height)) this.height = 528;
				this.width = parseInt(this.game.managers.logic.parseVars((params.width || 1000).toString().trim()));
				if (isNaN(this.width)) this.width = 1000;
				this.offsety = parseInt(this.game.managers.logic.parseVars((params.offsety || 0).toString().trim()));
				if (isNaN(this.offsety)) this.offsety = 0;
				this.offsetx = parseInt(this.game.managers.logic.parseVars((params.offsetx || 0).toString().trim()));
				if (isNaN(this.offsety)) this.offsetx = 0;

				await this.initUI();
				this.game.resolveAction();
				return;
			}

			this.game.resolveAction();
		}

		async initUI() {
			if (this.wrapper) {
				this.iframe.src = this.url;
				this.title_el.textContent = this.title;
				this.address_el.textContent = this.address;
				return;
			}

			let width = this.width;
			let height = this.height;
			let wrapper;

			if (this.browser == 'noframe') {
				wrapper = document.createElement('div');
				wrapper.className = 'browser-wrapper browser-' + this.browser;
				wrapper.style.width = width + 'px';
				wrapper.style.height = height + 'px';
				wrapper.style.top = (((this.game.height - height) / 2) + this.offsety) + 'px';
				wrapper.style.left = (((this.game.width - width) / 2) + this.offsetx) + 'px';

				let iframe = document.createElement('iframe');
				iframe.className = 'browser-page';
				iframe.setAttribute('width', width);
				iframe.style.width = width + 'px';
				iframe.setAttribute('height', height);
				iframe.style.height = height + 'px';
				iframe.src = this.url;
				wrapper.appendChild(iframe);
				this.iframe = iframe;

				this.title_el = document.createElement('div');
				this.address_el = document.createElement('div');
			}
			else {
				wrapper = document.createElement('div');
				wrapper.className = 'browser-wrapper browser-' + this.browser;
				wrapper.style.width = width + 'px';
				wrapper.style.height = (height + 24) + 'px';
				wrapper.style.top = (((this.game.height - height) / 2) + this.offsety) + 'px';
				wrapper.style.left = (((this.game.width - width) / 2) + this.offsetx) + 'px';

				let header = document.createElement('div');
				header.className = 'browser-header';
				header.innerHTML = '<div class="win-btn"></div><div class="win-btn"></div><div class="win-btn"></div>';
				wrapper.appendChild(header);

				let tab = document.createElement('div');
				tab.className = 'browser-tab';
				tab.textContent = this.title;
				this.title_el = tab;
				header.appendChild(tab);

				let bar = document.createElement('div');
				bar.className = 'browser-nav-bar';
				header.appendChild(bar);

				bar.innerHTML = '<i class="fa-solid fa-arrow-left"></i><i class="fa-solid fa-arrow-right"></i>';

				let iframe = document.createElement('iframe');
				iframe.className = 'browser-page';
				iframe.setAttribute('width', width);
				iframe.style.width = width + 'px';
				iframe.setAttribute('height', height);
				iframe.style.height = height + 'px';
				iframe.src = this.url;
				wrapper.appendChild(iframe);
				this.iframe = iframe;

				let reload = document.createElement('i');
				reload.className = 'fa-solid fa-arrow-rotate-right';
				reload.style.cursor = 'pointer';
				bar.appendChild(reload);
				reload.addEventListener('click', () => {
					iframe.src = this.url;
				}, false);

				let address = document.createElement('div');
				address.className = 'address-bar';
				address.textContent = this.address;
				this.address_el = address;
				bar.appendChild(address);

				let options = document.createElement('i');
				options.style.className = 'fa-solid fa-ellipsis-vertical';
				bar.appendChild(options);
			}

			plugin_tools.scaled_ui.init(this.game);
			plugin_tools.scaled_ui.clear('browser-' + this.browser);
			plugin_tools.scaled_ui.appendChild(wrapper, 'browser-' + this.browser);

			this.wrapper = wrapper;
			this.visible = false;
		}

		destroyUI() {
			plugin_tools.scaled_ui.clear('browser-' + this.browser);
			this.wrapper = null;
		}

		async show() {
			if (this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						this.iframe.style.pointerEvents = 'unset';
						resolve();
					});
				})
			]);

			this.visible = true;
		}

		async hide() {
			if (!this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.iframe.style.pointerEvents = 'none';
			this.wrapper.style.opacity = 1;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'none';

			this.visible = false;
		}
	};

	// Return Plugin
	return ['Website', Website];
}


// CommandCraft
// ------------------------------------------------------------
function plugin_CommandCraft() {
	// Plugin Class
	class CommandCraft extends RenJS.Plugin {

		async onCall(params) {
			let command = (params.body || '').trim().toUpperCase();
			if (command == 'HIDE') {
				await this.hide();
				this.game.resolveAction();
				return;
			}
			else if (command == 'SHOW') {
				await this.show();
				this.game.resolveAction();
				return;
			}
			else if (command == 'DESTROY') {
				await this.destroyUI();
				this.game.resolveAction();
				plugin_tools.event.clear('command-craft-', true);
				return;
			}
			else if (command == 'LOAD' || command == 'CONTINUE') {
				plugin_tools.event.clear('command-craft-', true);
				this.mode = this.game.managers.logic.parseVars((params.mode || 'put-in-order').toString().trim());
				this.difficulty = this.game.managers.logic.parseVars((params.difficulty || 'easy').toString().trim());
				this.answers = params.answers;
				if (Array.isArray(this.answers)) {
					this.answers.forEach(answers => {
						if (typeof answers.text == 'string') {
							answers.text = this.game.managers.logic.parseVars(answers.text).toString();
						}
					})
				}
				
				this.dont_mix_answers = this.game.managers.logic.parseVars((params.dont_mix_answers || 'false').toString().trim()).toLowerCase() == 'true';
				this.dont_print_answers = this.game.managers.logic.parseVars((params.dont_print_answers || 'false').toString().trim()).toLowerCase() == 'true';
				this.output = params.output || '';
				if (typeof this.output == 'string') {
					this.output = this.game.managers.logic.parseVars((this.output).toString());
				}
				this.term_text = params.term_text || '';
				if (typeof this.term_text == 'string') {
					this.term_text = this.game.managers.logic.parseVars((this.term_text).toString());
				}
				else if (Array.isArray(this.term_text)) {
					this.term_text = JSON.parse(JSON.stringify(this.term_text));
					this.term_text.forEach(term_text => {
						if (typeof term_text.text == 'string') {
							term_text.text = this.game.managers.logic.parseVars(term_text.text).toString();
						}
					})
				}
				this.pre_text = params.pre_text || undefined;
				if (typeof this.pre_text == 'string') {
					this.pre_text = this.game.managers.logic.parseVars((this.pre_text).toString());
				}

				this.height = parseInt(this.game.managers.logic.parseVars((params.height || 528).toString().trim()));
				if (isNaN(this.height)) this.height = 528;
				this.width = parseInt(this.game.managers.logic.parseVars((params.width || 1000).toString().trim()));
				if (isNaN(this.width)) this.width = 1000;
				this.offsety = parseInt(this.game.managers.logic.parseVars((params.offsety || 0).toString().trim()));
				if (isNaN(this.offsety)) this.offsety = 0;
				this.offsetx = parseInt(this.game.managers.logic.parseVars((params.offsetx || 0).toString().trim()));
				if (isNaN(this.offsety)) this.offsetx = 0;

				if (command == 'LOAD') await this.initUI();
				else if (command == 'CONTINUE') this.contactFrame();

				this.game.resolveAction();
				return;
			}

			this.game.resolveAction();
		}

		async initUI() {
			if (this.wrapper) {
				this.iframe.src = 'assets/pages/command-craft.html';
				return;
			}

			let width = this.width;
			let height = this.height;

			let wrapper = document.createElement('div');
			wrapper.className = 'command-craft-wrapper';
			wrapper.style.width = width + 'px';
			wrapper.style.height = (height + 24) + 'px';
			wrapper.style.top = (((this.game.height - height) / 2) + this.offsety) + 'px';
			wrapper.style.left = (((this.game.width - width) / 2) + this.offsetx) + 'px';

			let iframe = document.createElement('iframe');
			iframe.className = 'command-craft-page';
			iframe.setAttribute('width', width);
			iframe.style.width = width + 'px';
			iframe.setAttribute('height', height);
			iframe.style.height = height + 'px';
			iframe.src = 'assets/pages/command-craft.html';
			wrapper.appendChild(iframe);
			this.iframe = iframe;
			iframe.addEventListener('load', () => {
				if (!iframe || !iframe.contentWindow) return;
				this.contactFrame();
			}, false);

			plugin_tools.scaled_ui.init(this.game);
			plugin_tools.scaled_ui.clear('command-craft');
			plugin_tools.scaled_ui.appendChild(wrapper, 'command-craft');

			this.wrapper = wrapper;
			this.visible = false;
		}

		contactFrame() {
			this.iframe.contentWindow.postMessage({
				type: 'renjs-event',
				id : 'command-craft-init',
				args : [{
					mode: this.mode,
					difficulty: this.difficulty,
					answers: this.answers,
					dont_mix_answers: this.dont_mix_answers,
					dont_print_answers: this.dont_print_answers,
					output: this.output,
					term_text: this.term_text,
					pre_text: this.pre_text
				}],
				scope : {}
			}, window.location.origin);
		}

		destroyUI() {
			plugin_tools.scaled_ui.clear('command-craft');
			this.wrapper = null;
		}

		async show() {
			if (this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						this.iframe.style.pointerEvents = 'unset';
						resolve();
					});
				})
			]);

			this.visible = true;
		}

		async hide() {
			if (!this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.iframe.style.pointerEvents = 'none';
			this.wrapper.style.opacity = 1;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'none';

			this.visible = false;
		}
	};

	// Return Plugin
	return ['CommandCraft', CommandCraft];
}


// ProgressBar
// ------------------------------------------------------------
function plugin_ProgressBar() {
	// Plugin Class
	class ProgressBar extends RenJS.Plugin {

		async onCall(params) {
			let command = (params.body || '').trim().toUpperCase();
			if (command == 'HIDE') {
				await this.hide();
				this.game.resolveAction();
				return;
			}
			else if (command == 'SHOW') {
				await this.show();
				this.game.resolveAction();
				return;
			}
			else if (command == 'DESTROY') {
				await this.destroyUI();
				this.game.resolveAction();
				return;
			}
			else if (command == 'LOAD') {
				this.steps = parseInt(this.game.managers.logic.parseVars((params.steps || 0).toString().trim()), 10);
				if (isNaN(this.steps) || this.steps < 1) this.steps = 1;
				this.step = parseInt(this.game.managers.logic.parseVars((params.step || 0).toString().trim()), 10);
				if (isNaN(this.step) || this.step < 0) this.step = 0;

				await this.initUI();
				this.game.resolveAction();
				return;
			}
			else if (command == 'STEP') {
				let step = parseInt(this.game.managers.logic.parseVars((params.step || -1).toString().trim()), 10);
				if (step < 0) {
					this.step ++;
				}
				else {
					this.step = step;
				}
				this.update();
				this.game.resolveAction();
				return;
			}

			console.log('[ProgressBar] Unknown command', command);
			this.game.resolveAction();
		}

		async initUI() {
			let wrapper = document.createElement('div');
			wrapper.style.position = 'absolute';
			wrapper.style.top = '0px';
			wrapper.style.left = '0px';
			wrapper.style.right = '0px';
			wrapper.style.opacity = 0;
			wrapper.style.display = 'none';

			let space = Math.floor((100 / (this.steps - 1)) * 100) / 100;

			let progress = document.createElement('div');
			progress.className = 'plugin-progress-bar';
			wrapper.appendChild(progress);

			let status_bar = document.createElement('div');
			status_bar.className = 'status-bar';
			//status_bar.style.width = (space * (this.steps - 1)) + '%';
			progress.appendChild(status_bar);
			let current_status = document.createElement('div');
			current_status.className = 'current-status';
			status_bar.appendChild(current_status);
			this.current_status = current_status;

			let list = document.createElement('ul');
			progress.appendChild(list);

			let items = [];
			for (let i = 0; i < this.steps; i++) {
				let item = document.createElement('li');
				item.className = 'section';
				//item.style.width = space + '%';
				list.appendChild(item);
				items.push(item);
			}
			//items[0].style.marginLeft = '-' + Math.floor(space / 2) + '%';
			//items[items.length - 1].style.marginRight = '-' + Math.floor(space / 2) + '%';
			this.items = items;

			plugin_tools.scaled_ui.init(this.game);
			plugin_tools.scaled_ui.clear('progress-bar');
			plugin_tools.scaled_ui.appendChild(wrapper, 'progress-bar');

			this.wrapper = wrapper;
			this.visible = false;
			this.update();
		}

		update() {
			this.current_status.style.width = (((this.step - 1) / (this.steps - 1)) * 100) + '%';
			let index = this.step - 1;
			if (index - 1 >= 0) {
				this.items[index - 1].className = 'section completed';
			}
			this.items[index].className = 'section completed current';
		}

		destroyUI() {
			plugin_tools.scaled_ui.clear('progress-bar');
			this.wrapper = null;
		}

		async show() {
			if (this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 1}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.visible = true;
		}

		async hide() {
			if (!this.visible) {
				return;
			}
			if (this.anim) {
				this.anim.stop();
			}

			this.wrapper.style.opacity = 1;
			this.wrapper.style.display = 'block';

			let anim = this.game.add.tween(this.wrapper.style).to({opacity: 0}, 500, Phaser.Easing.Cubic.InOut, true);
			this.anim = anim;
			await Promise.all([
				new Promise((resolve) => {
					anim.onComplete.add(() => {
						resolve();
					});
				})
			]);

			this.wrapper.style.opacity = 0;
			this.wrapper.style.display = 'none';

			this.visible = false;
		}
	};

	// Return Plugin
	return ['ProgressBar', ProgressBar];
}


// Wait Event
// ------------------------------------------------------------
function plugin_WaitEvent() {
	// Plugin Class
	class WaitEvent extends RenJS.Plugin {

		async onCall(params) {
			let event_id = params.body ? this.game.managers.logic.parseVars(params.body.toString().trim()) : null;
			let event_vars = params.vars ? params.vars.toString().trim().split(' ').map(v => v.trim()) : [];
			
			// Wait for event
			let args = await plugin_tools.event.wait(event_id);

			// Map results to variables
			event_vars.forEach((v, i) => {
				this.game.managers.logic.vars[v] = args.length > i ? args[i] : undefined;
			});

			window.focus();
			this.game.resolveAction();
		}
	};

	// Return Plugin
	return ['WaitEvent', WaitEvent];
}

// Text to speach plugin
// ------------------------------------------------------------
function plugin_TTS() {
	// Plugin Class
	class TTS extends RenJS.Plugin {

		onInit() {
			this.audio = null;
			this.voices = {
				'default' : 2,
				'male' : 3,
				'female' : 6
			};

			// this.game.managers.text.display
		}

		async onCall(params) {
			let command = (params.body || '').trim().toUpperCase();
			if (command == 'VOICE') {
				let name = this.game.managers.logic.parseVars(params.name).trim().toLowerCase();
				let voice = this.game.managers.logic.parseVars(params.voice.toString()).trim().toLowerCase();
				voice = this.voices.hasOwnProperty(voice) ? this.voices[voice] : parseInt(voice, 10);
				
				if (!name || name.length < 1 || isNaN(voice) || voice < 0) {
					console.log('[TTS] Invalid paramaters', name, voice);
				}
				else {
					this.voices[name] = voice;
				}

				this.game.resolveAction();
				return;
			}

			console.log('[TTS] Invalid command', command);
			this.game.resolveAction();
		}

		onAction(action) {

			// SAY
			if (action.actionType == 'say') {
				let text = this.game.managers.logic.parseVars(
					action.properties.tts ? action.properties.tts.toString() : action.body.toString()
				);
				text = this.cleanText(text);
				this.tts(text, action.actor);
			}

			// TEXT
			else if (action.actionType == 'text' || (action.actionType == 'call' && action.key == 'call CustomText')) {
				let text = this.game.managers.logic.parseVars(
					action.properties.tts ? action.properties.tts.toString() : action.body.toString()
				);
				let actor = action.properties.tts_actor ? this.game.managers.logic.parseVars(
					action.properties.tts_actor.toString()
				) : (action.key == 'call CustomText' && action.properties.actor) ? this.game.managers.logic.parseVars(
					action.properties.actor.toString()
				) : 'default';
				text = this.cleanText(text);
				this.tts(text, actor);
			}

			// On any other action that has a tts
			else if (action.properties.tts) {
				let text = this.game.managers.logic.parseVars(action.properties.tts.toString());
				let actor = action.properties.tts_actor ? this.game.managers.logic.parseVars(
					action.properties.tts_actor.toString()
				) : 'default';
				text = this.cleanText(text);
				this.tts(text, actor);
			}

			else {
				this.stop();
			}
		}

		tts(text, voice = 'default') {
			voice = voice.toLowerCase();
			voice = this.voices.hasOwnProperty(voice) ? this.voices[voice] : this.voices['default'];
			//let service_url = 'https://cybergame-tts.ctflib.eu/tts';
			//let service_url = 'https://services.cybergame.ctflib.eu/tts/v2/tts';
			let service_url = 'https://services.cybergame.ctflib.eu/tts/v1/tts';

			this.stop();
			this.play(`${service_url}?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`);
		}

		// Remove special markup from text
		cleanText(text) {
			return text.replace(/\(\s*bold\s*\)|\(\s*italic\s*\)|\(\s*end\s*\)|\(\s*color\s*:\s*#[0-9a-f]\s*\)|\(\s*pause\s*:\s*click\s*\)/gi, ' ').replace(/\s+/g, ' ');
		}

		stop() {
			if (!this.audio) return;
			this.audio.pause();
			this.audio = null;
		}

		play(src) {
			this.stop();
			this.audio = new Audio(src);
			this.audio.play();
		}
	};

	// Return Plugin
	return ['TTS', TTS];
}

// Check point plugin
// ------------------------------------------------------------
function plugin_CheckPoint(_game) {
	// Plugin Class
	class CheckPoint extends RenJS.Plugin {

		onInit() {
			CheckPoint.instance = this;
			this.views = {};

			// Save first game scene
			let firstScene = this.game.story['start'].filter((action) => {
				return action.scene;
			})[0].scene;

			// Check scenes
			Object.entries(this.game.story)
			// Filter only checkpoint scenes
			.filter((scene) => {
				return CheckPoint.isCheckPointScene(scene[0]) ? true : false;
			})
			// Add checkpoint
			.forEach((scene) => {
				scene[1].unshift({
					"call CheckPoint" : "AUTO",
					"body" : "AUTO",
					"scene" : scene[0]
				});
			});

			// Add custom load
			CheckPoint.story_scene = {"scene" : firstScene};
			CheckPoint.story = [
				{
					"choice" : [
						{
							"Continue" : [
								{"call CheckPoint" : "RESTORE", "body" : "RESTORE"},
								CheckPoint.story_scene
							]
						},
						{
							"Start from the begining": [
								{"scene" : firstScene}
							]
						}
					]
				}
			];

			this.game.story['scene-checkpoint-restore'] = CheckPoint.story;
		}

		async onCall(params) {
			let command = (params.body || '').trim().toUpperCase();
			if (command == 'AUTO') {
				let scene = params.scene.trim();
				CheckPoint.saveScene(scene);
				this.game.resolveAction();
				return;
			}
			else if (command == 'CLEAR') {
				CheckPoint.clear();
				this.game.resolveAction();
				return;
			}
			else if (command == 'RESTORE') {
				let scene = CheckPoint.restore();
				CheckPoint.story_scene.scene = scene;
				this.game.resolveAction();
				return;
			}

			console.log('[CheckPoint] Invalid command', command);
			this.game.resolveAction();
		}
	};

	CheckPoint.canRestore = function(scene=false) {
		let refid = 'CyberGame_RenJS_' + _game.id;

		// Try to load scene from many sources
		if (!scene) scene = window.localStorage.getItem(refid + '@last-scene');
		if (!scene) return false;

		// If not valid scene
		if (scene && !this.isCheckPointScene(scene)) return false;
		// Check if scene is unlocked
		if (!this.getSavedScenes().includes(scene)) return false;

		// Load scene
		return scene;
	};
	CheckPoint.shouldRestore = function(scene=false) {
		let refid = 'CyberGame_RenJS_' + _game.id;

		// Try to load scene from many sources
		if (!scene) scene = new URLSearchParams(window.location.search).get('s');
		if (!scene) return false;

		// If not valid scene
		if (scene && !this.isCheckPointScene(scene)) return false;
		// Check if scene is unlocked
		if (!this.getSavedScenes().includes(scene)) return false;

		// Load scene
		return scene;
	};
	CheckPoint.restore = function(scene=false) {
		scene = this.canRestore(scene);
		// If not valid scene
		if (!scene) return false;

		// Load scene
		this.loadScene(scene);
		return scene;
	};
	CheckPoint.isCheckPointScene = function(scene) {
		// Check if it ends in `-checkpoint`
		if (!(/-checkpoint$/i).test(scene)) return false;
		// Check if scene exists
		if (!Object.keys(_game.story).includes(scene)) return false;
		// OK
		return true;
	};
	CheckPoint.getSavedScenes = function() {
		let refid = 'CyberGame_RenJS_' + _game.id;
		// Get saved scenes
		let scenes;
		try {
			scenes = window.localStorage.getItem(refid + '@scenes') || '[]';
			scenes = JSON.parse(scenes);
			if (!(scenes instanceof Array)) {
				return [];
			}
			return scenes;
		}
		catch (e) {
			return [];
		}
	};
	CheckPoint.saveScene = function(scene) {
		if (!this.isCheckPointScene(scene)) return false;
		let refid = 'CyberGame_RenJS_' + _game.id;

		// Set scene as active
		if (this.instance.views.hasOwnProperty(scene)) {
			this.instance.views[scene].classList.add('history-item-completed');
		}
		
		// Get saved scenes
		let savedScenes = this.getSavedScenes();

		// Add scene if not already
		if (!savedScenes.includes(scene)) {
			savedScenes.push(scene);
			window.localStorage.setItem(refid + '@scenes', JSON.stringify(savedScenes));
			window.localStorage.setItem(refid + '@last-scene', scene);
		}

		// Save variables
		window.localStorage.setItem(refid + '@vars', JSON.stringify(_game.managers.logic.vars));
	};
	CheckPoint.loadScene = function(scene) {
		if (!this.isCheckPointScene(scene)) return false;
		let refid = 'CyberGame_RenJS_' + _game.id;
		
		// Get saved scenes
		let savedScenes = this.getSavedScenes();

		// Check scene
		if (!savedScenes.includes(scene)) return false;

		// Load saved variables
		let savedVariables;
		try {
			savedVariables = window.localStorage.getItem(refid + '@vars') || '{}';
			savedVariables = JSON.parse(savedVariables);
			if (!(savedVariables instanceof Object)) {
				savedVariables = {};	
			}
		}
		catch (e) {
			savedVariables = {};	
		}

		// Set variables
		Object.entries(savedVariables).forEach((variable) => {
			_game.managers.logic.vars[variable[0]] = variable[1];
		});
	};
	CheckPoint.clear = function() {
		let refid = 'CyberGame_RenJS_' + _game.id;
		window.localStorage.removeItem(refid + '@scenes');
		window.localStorage.removeItem(refid + '@last-scene');
		window.localStorage.removeItem(refid + '@vars');
	};
	CheckPoint.registerView = function(scene, element) {
		if (scene != 'start' && !this.isCheckPointScene(scene)) return;

		this.instance.views[scene] = element;
		let isCompleted = this.getSavedScenes().includes(scene);
		if (isCompleted || scene == 'start') {
			element.classList.add('history-item-completed');
		}
		element.addEventListener('click', () => {
			if (element.classList.contains('history-item-completed')) {
				document.location.href = '?s=' + encodeURIComponent(scene);
			}
		}, false);
	}

	_game.CheckPoint = CheckPoint;

	// Return Plugin
	return ['CheckPoint', CheckPoint];
}

// Custom Text plugin
// ------------------------------------------------------------
function plugin_CustomText(_game) {
		// Plugin Class
	class CustomText extends RenJS.Plugin {

		onInit() {
			this.conf = null;
		}

		async lazyInit() {
			if (this.conf) return;

			let messageBox = this.game.guiSetup.config.hud.find(item => item.type == 'messageBox');
			let nameBox = this.game.guiSetup.config.hud.find(item => item.type == 'nameBox');
			let message_box_bg = plugin_tools.assets.find(this.game, 'asset_message_box_background');
			let name_box_bg = plugin_tools.assets.find(this.game, 'asset_name_box_background');
			let ctc = plugin_tools.assets.find(this.game, 'asset_message_box_ctc');

			this.conf = {
				x: messageBox.x,
				y: messageBox.y,
				ctc : {
					x: messageBox.ctc.x,
					y: messageBox.ctc.y
				},
				text : {
					x: messageBox.text.x,
					y: messageBox.text.y,
					align: messageBox.text.style.align,
					color: messageBox.text.style.fill,
					fontFamily: messageBox.text.style.font,
					fontSize: messageBox.text.style.fontSize,
					width: (messageBox.text.style.wordWrap ? messageBox.text.style.wordWrapWidth : -1)
				},
				name : {
					x: nameBox.x,
					y: nameBox.y,
					text : {
						x: nameBox.text.x,
						y: nameBox.text.y,
						color: nameBox.text.style.fill,
						fontFamily: nameBox.text.style.font,
						fontSize: nameBox.text.style.fontSize
					},
				},
				bg : {
					message : {
						url: 'assets/gui/' + message_box_bg.fileName
					},
					name : {
						url: 'assets/gui/' + name_box_bg.fileName
					},
					ctc : {
						url: 'assets/gui/' + ctc.fileName
					}
				}
			};


			let loadImage = function(info) {
				return new Promise((resolve) => {
					let img = new Image();
					img.onload = function(){
						info.height = img.height;
						info.width = img.width;
						resolve();
					}
					img.src = info.url;
				});
			};
			
			await Promise.all([
				loadImage(this.conf.bg.message),
				loadImage(this.conf.bg.name),
				loadImage(this.conf.bg.ctc),
			]);
		}

		async onCall(params) {
			await this.lazyInit();

			let text = this.game.managers.logic.parseVars(params.body.toString());
			let name = params.name ? this.game.managers.logic.parseVars(params.name.toString()) : null;

			let character = null;
			if (name && this.game.managers.character.characters.hasOwnProperty(name)) {
				character = this.game.managers.character.characters[name].config;
			}

			this.render(text, character);
		}


		async render(text, character=null) {

			let wrapper = document.createElement('div');
			wrapper.style.position = 'absolute';
			wrapper.style.top = '0px';
			wrapper.style.bottom = '0px';
			wrapper.style.left = '0px';
			wrapper.style.right = '0px';
			//wrapper.style.opacity = 0;
			//wrapper.style.display = 'none';
			wrapper.style.userSelect = 'none';

			let message = document.createElement('div');
			message.style.position = 'absolute';
			message.style.top = this.conf.y + 'px';
			message.style.left = this.conf.x + 'px';
			message.style.width = this.conf.bg.message.width + 'px';
			message.style.height = this.conf.bg.message.height + 'px';
			message.style.backgroundImage = 'url("' + this.conf.bg.message.url + '")';
			message.style.pointerEvents = 'none';

			let typing = document.createElement('div');
			typing.style.position = 'absolute';
			typing.style.top = this.conf.text.y + 'px';
			typing.style.left = this.conf.text.x + 'px';
			if (this.conf.text.width > 0)
				typing.style.width = this.conf.text.width + 'px';
			typing.style.textAlign = this.conf.text.align;
			typing.style.color = this.conf.text.color; // (character ? character.speechColour : this.conf.text.color); // Probably should change depending on the char
			typing.style.fontFamily = this.conf.text.fontFamily;
			typing.style.fontSize = this.conf.text.fontSize;
			message.appendChild(typing);

			let ctc = document.createElement('div');
			ctc.className = 'custom-text-flicker';
			ctc.style.position = 'absolute';
			ctc.style.top = this.conf.ctc.y + 'px';
			ctc.style.left = this.conf.ctc.x + 'px';
			ctc.style.width = this.conf.bg.ctc.width + 'px';
			ctc.style.height = this.conf.bg.ctc.height + 'px';
			ctc.style.backgroundImage = 'url("' + this.conf.bg.ctc.url + '")';
			ctc.style.display = 'none';
			message.appendChild(ctc);

			typing.textContent = '';

			wrapper.appendChild(message);

			if (character) {
				let name = document.createElement('div');
				name.style.position = 'absolute';
				name.style.top = this.conf.name.y + 'px';
				name.style.left = this.conf.name.x + 'px';
				name.style.width = this.conf.bg.name.width + 'px';
				name.style.height = this.conf.bg.name.height + 'px';
				name.style.lineHeight = this.conf.bg.name.height + 'px';
				name.style.backgroundImage = 'url("' + this.conf.bg.name.url + '")';
				name.style.pointerEvents = 'none';
				name.style.textAlign = 'center';
				name.style.color = character.speechColour != "default" ? character.speechColour : this.conf.name.text.color; // Not sure if this is correct
				name.style.fontFamily = this.conf.name.text.fontFamily;
				name.style.fontSize = this.conf.name.text.fontSize;
				name.textContent = character.displayName;

				wrapper.appendChild(name);
			}

			plugin_tools.scaled_ui.init(this.game);
			plugin_tools.scaled_ui.clear('custom-text');
			plugin_tools.scaled_ui.appendChild(wrapper, 'custom-text');

			let obj = {text: text};
			let forwardAction = () => {
				let text = obj.text;
				if (text.length > 0) {
					obj.text = '';
					typing.textContent = text;
				}
				else {
					this.game.resolveAction();
					plugin_tools.scaled_ui.clear('custom-text');
				}
			};
			wrapper.addEventListener('click', (e) => {return forwardAction(e);});
			//let _space_push_timeout = 0;
			window.addEventListener('keyup', (e) => {
				if (!wrapper.parentNode) return;
				if (e.key == " " || e.code == "Space" || e.keyCode == 32) {
					//let now = new Date().getTime();
					//if (_space_push_timeout + 250 > now) return;
					//_space_push_timeout = now;
					return forwardAction(e);
				}
			});

			await this.typing(typing, obj, 60);
			ctc.style.display = 'block';
		}

		async typing(element, obj, speed) {
			let sleep = ((ms) => new Promise((r) => setTimeout(r, ms)));

			element.textContent = '';
			for (let i = 0; i < obj.text.length; i++) {
				element.textContent += obj.text[i];
				await sleep(speed);
			}
			obj.text = '';
		}

	};

	// Return Plugin
	return ['CustomText', CustomText];
}

// Advance Choices plugin
// ------------------------------------------------------------
function plugin_AdvanceChoices() {
	// Plugin Class
	class AdvanceChoices extends RenJS.Plugin {

		onInit() {
			// this.game.managers.text.display
			let config = this.game.gui.config.hud.filter(x => x.type == 'choices');
			if (!config.length) return;

			this.config = config[0];
			this.default = {
				x : this.config.x,
				y : this.config.y
			};
		}

		onAction(action) {
			if (action.actionType == 'choice') {
				this.handleChoise(action);
			}
		}

		handleChoise(action) {
			if (!this.config) return;
			this.restore();

			//console.log('AdvanceChoices', action);

			let config = action.body.filter(x => x.hasOwnProperty('__config'))[0];
			if (config) {
				config = config.__config;
				action.body = action.body.filter(x => !x.hasOwnProperty('__config'));

				if (config.hasOwnProperty('x')) this.config.x = config.x;
				if (config.hasOwnProperty('y')) this.config.y = config.y;
			}
		}

		restore() {
			this.config.x = this.default.x;
			this.config.y = this.default.y;
		}
	};

	// Return Plugin
	return ['AdvanceChoices', AdvanceChoices];
}

// Advance Choices plugin
// ------------------------------------------------------------
function plugin_DisableVisibilityChange() {
	// Plugin Class
	class DisableVisibilityChange extends RenJS.Plugin {
		onInit() {
			const f = this.game.stage.visibilityChange;
			this.game.stage.visibilityChange = function(e) {
				if (e.type.toLowerCase() == 'blur' || e.type.toLowerCase() == 'pagehide') return;
				return f.apply(this, arguments);
			};
		}
	};

	// Return Plugin
	return ['DisableVisibilityChange', DisableVisibilityChange];
}
