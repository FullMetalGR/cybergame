/*
 * CyberGame
 * SCORM 1.1 and SCORM 1.2 API Discovery Algorithm
 * Based on code from https://scorm.com/scorm-explained/technical-scorm/run-time/api-discovery-algorithms/
 * Modified by GramThanos
 */

(function () {

	// Scorm Handler
	const SCORM = {
		initialized : false,
		api : null,
		data : {
			learner_id : 'unknown@example.com',
			learner_name : 'Player',
		},

		init : function() {
			// Start search for API endpoint
			this.api = this.getAPI();
			if (!this.api) {
				console.warn('Failed to discover SCORM API.');
				return;
			}

			// Backwards compatibility
			if (!this.api.Initialize && this.api.LMSInitialize) {
				this._api_port.api = this.api;
				this.api = this._api_port;
			}

			// Initialise
			this.api.Initialize('');
			this.data.learner_id = this.getValue('cmi.learner_id', this.data.learner_id);
			this.data.learner_name = this.getValue('cmi.learner_name', this.data.learner_name);

			// Call handlers
			while (this._onInitCallBacks.length > 0) {
				let callback = this._onInitCallBacks.shift();
				setTimeout(function() {
					callback();
				}, 0);
			}
		},

		_onInitCallBacks : [],
		onInit : function(callback) {
			if (this.initialized) {
				setTimeout(function() {
					callback();
				}, 0);
				return;
			}
			this._onInitCallBacks.push(callback);
		},

		getValue : function(data_model, defvalue) {
			if (!this.api) return defvalue;
			let value = this.api.GetValue(data_model);
			if (value === '') return defvalue;
			return value;
		},

		setValue : function(data_model, value, callback) {
			return this.api.SetValue(data_model, value, callback);
		},

		// Port of older API (SCORM 1.1 && 1.2)
		_api_port : {
			api : null,

			// https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/
			_data_model_map : {
				'cmi._version' : 'cmi._version', // Don't exists
				'cmi.credit' : 'cmi.core.credit',
				'cmi.learner_id' : 'cmi.core.student_id',
				'cmi.learner_name' : 'cmi.core.student_name',
				'cmi.learner_preference.language' : 'cmi.student_preference.language',
				'cmi.location' : 'cmi.core.lesson_location',
				'cmi.session_time' : 'cmi.core.session_time',
				'cmi.total_time' : 'cmi.core.total_time'
			},
			Initialize : function() {return this.api.LMSInitialize.call(this.api, ...arguments);},
			Terminate : function() {return this.api.LMSFinish.call(this.api, ...arguments);},
			GetValue : function(data_model) {return this.api.LMSGetValue.call(this.api, this._data_model_map.hasOwnProperty(data_model) ? this._data_model_map[data_model] : data_model);},
			SetValue : function(data_model, value) {return this.api.LMSSetValue.call(this.api, this._data_model_map.hasOwnProperty(data_model) ? this._data_model_map[data_model] : data_model, value);},
			Commit : function() {return this.api.LMSCommit.call(this.api, ...arguments);},
			GetLastError : function() {return this.api.LMSGetLastError.call(this.api, ...arguments);},
			GetErrorString : function() {return this.api.LMSGetErrorString.call(this.api, ...arguments);},
			GetDiagnostic : function() {return this.api.LMSGetDiagnostic.call(this.api, ...arguments);},
		},

		getAPI : function(win = window) {
			if (this.api) {
				return this.api;
			}

			let API = null;
			if ((win.parent != null) && (win.parent != win)) {
				API = this.findAPI(win.parent);
			}
			if ((API == null) && (win.opener != null)) {
				API = this.findAPI(win.opener);
			}
			return API;
		},

		findAPI : function(win = window) {
			if (this.api) {
				return this.api;
			}

			let maxFindAPITries = 10;
			// Check to see if the window (win) contains the API
			// if the window (win) does not contain the API and
			// the window (win) has a parent window and the parent window
			// is not the same as the window (win)
			while ((win.API == null && win.API_1484_11 == null) && (win.parent != null) && (win.parent != win)) {
				// increment the number of findAPITries
				maxFindAPITries--;

				// Note: 7 is an arbitrary number, but should be more than sufficient
				if (maxFindAPITries < 0) {
					return null;
				}

				// set the variable that represents the window being
				// being searched to be the parent of the current window
				// then search for the API again
				win = win.parent;
			}
			return win.API || win.API_1484_11;
		}
	};

	SCORM.init();
	window.SCORM = SCORM;
})();
