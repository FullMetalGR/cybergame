/*
 * Main Game Setup
 * GramThanos
 */


// Module Information
// ------------------------------------------------------------
const ModuleInfo = {
	id : '{{item-id}}',
	name : '{{learning-module-name}}',
};


// Game Manager
// ------------------------------------------------------------
const GameTools = {
	relativeUnit : function(relative, unit) {
		if (typeof relative == 'string') {
			let i = relative.match(/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/);
			if (i) {
				return (parseInt(i[1], 10) * (unit / parseInt(i[2], 10)));
			}
		}
		return relative;
	}
};


// Game Manager
// ------------------------------------------------------------
const GameManager = {

	// Decide screen size
	screenSize : {
		width: 1280,
		height: 800
	},

	renjs : {
		config : {
			'renderer': Phaser.AUTO,
			'scaleMode': Phaser.ScaleManager.SHOW_ALL,
			'loadingScreen': {
				'background': 'assets/gui/loader/background.png',
				'loadingBar': {
					'asset': 'assets/gui/loader/loading-bar.png',
					'position': {'x': '1/2', 'y': '6/7'},
					'size': {'w': 600, 'h': 50}
				}
			},
			'fonts': 'assets/gui/fonts.css',
			'guiConfig': 'story/GUI.yaml',
			'storyConfig': 'story/Config.yaml',
			'storySetup': 'story/Setup.yaml',
			'storyAccessibility': 'story/Accessibility.yaml',
			'storyText': ['story/Story.yaml'],
			'logChoices': false,
		}
	},

	load : function() {
		// Prepare config
		this.renjs.config.name = ModuleInfo.id;
		this.renjs.config.w = this.screenSize.width;
		this.renjs.config.h = this.screenSize.height;

		let loadingBar = this.renjs.config.loadingScreen.loadingBar;
		loadingBar.position.x = GameTools.relativeUnit(loadingBar.position.x, this.screenSize.width) - loadingBar.size.w/2;
		loadingBar.position.y = GameTools.relativeUnit(loadingBar.position.y, this.screenSize.height) - loadingBar.size.h/2;

		// Init game
		this.renjs.game = new RenJS.game(this.renjs.config);

		// Load plugins
		this.renjs.game.addPlugin(... plugin_Events({
			onInit : () => {
				//console.log('On Init');
				//console.log('guiSetup', this.renjs.game.guiSetup);
				this.renjs.game.guiSetup.name = ModuleInfo.id;
				this.renjs.game.guiSetup.resolution[0] = this.screenSize.width;
				this.renjs.game.guiSetup.resolution[1] = this.screenSize.height;
			}
		}));
		this.renjs.game.addPlugin(... plugin_DisableVisibilityChange());
		//let CheckPointPlugin = plugin_CheckPoint(this.renjs.game);
		//let CheckPoint = CheckPointPlugin[1];
		//if (CheckPoint.canRestore()) {
		//	this.renjs.game.addPlugin(... plugin_Start({firstScene: 'scene-checkpoint-restore'}));
		//}
		//this.renjs.game.addPlugin(... plugin_Start({skipMainMenu: true}));
		//this.renjs.game.addPlugin(... plugin_Start({firstScene: 'scene-3-crackstation'})); // instant load scene
		//this.renjs.game.addPlugin(... plugin_Start({nextScene: 'scene-3-crackstation'})); // switch scene after start
		
		//this.renjs.game.addPlugin(... plugin_CheckPoint(this.renjs.game)); // Before Start
		this.renjs.game.addPlugin(... plugin_Start({useCheckPoint: false}));
		//this.renjs.game.addPlugin(... CheckPointPlugin);
		this.renjs.game.addPlugin(... plugin_RelativePositions());
		this.renjs.game.addPlugin(... plugin_SCORMGetValue(window.SCORM));
		this.renjs.game.addPlugin(... plugin_ExecJs());
		this.renjs.game.addPlugin(... plugin_VarFilters());
		this.renjs.game.addPlugin(... plugin_TextInput());
		this.renjs.game.addPlugin(... plugin_DownloadFiles());
		this.renjs.game.addPlugin(... plugin_LayoutSectionTitle());
		this.renjs.game.addPlugin(... plugin_LayoutMobileMessages());
		this.renjs.game.addPlugin(... plugin_RenameCharacter());
		this.renjs.game.addPlugin(... plugin_SocketShell());
		this.renjs.game.addPlugin(... plugin_SidePanel('',          {btn: {          icon: "fa-solid fa-note-sticky"}}));
		this.renjs.game.addPlugin(... plugin_SidePanel('Tips',      {btn: {top: 140, icon: "fa-solid fa-lightbulb"}}));
		//this.renjs.game.addPlugin(... plugin_SidePanel('History',   {btn: {top: 260, icon: "fa-solid fa-map"}}));
		this.renjs.game.addPlugin(... plugin_Website());
		this.renjs.game.addPlugin(... plugin_CommandCraft());
		this.renjs.game.addPlugin(... plugin_ProgressBar());
		this.renjs.game.addPlugin(... plugin_TTS());
		this.renjs.game.addPlugin(... plugin_WaitEvent());
		this.renjs.game.addPlugin(... plugin_CustomText());
		this.renjs.game.addPlugin(... plugin_AdvanceChoices());
		//this.renjs.game.addPlugin(... plugin_Events({
		//	onInit : () => {}
		//}));

		// Start game
		this.renjs.game.launch();
	},


};

window.addEventListener('load', () => {
	GameManager.load();
}, false);


//
// GameManager.renjs.game.control.paused = false;
// GameManager.renjs.game.managers.story.startScene(Object.keys(GameManager.renjs.game.story)[3]);
//

/*

let scene = new URLSearchParams(window.location.search).get('s');
if (scene)
let scenes = Object.keys(GameManager.renjs.game.story);

window.history.pushState({"html":response.html,"pageTitle":response.pageTitle},"", urlPath);
window.onpopstate = function(e){
	return false;
};


GameManager.renjs.game.control.paused = !1;
GameManager.renjs.game.managers.story.clearScene();
GameManager.renjs.game.managers.story.startScene("scene-3-crackstation");
GameManager.renjs.game.gameStarted = !0;
GameManager.renjs.game.managers.story.interpret();

GameManager.renjs.game.control.execStack


await this.game.gui.changeMenu('hud');
*/
