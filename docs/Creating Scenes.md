# Creating Scenes for Cybergame Modules

This guide explains how to structure, author, and orchestrate scenes inside the Cybergame template module. It covers:

- How `Story.yaml` is organized
- How scene flow works
- How to use the built-in plugins (ProgressBar, TextInput, CommandCraft, Website, SCORM, etc.)
- Best practices for clean, maintainable scene logic

## Scene Architecture

Cybergame modules are **visual-novel style interactive stories**, whereas a module is a sequence of scenes, and each scene is a list of actions. The game engine reads `Story.yaml` top-to-bottom, executing scene logic one action at a time.

#### Files Involved

```bash
/game/Story.yaml           # main scene file
/game/extra/story/Setup.yaml   # all assets (backgrounds, items, characters)
/game/extra/story/Config.yaml  # screen positions (AT CENTER, AT LEFT, etc.)
```

All scenes, all dialogue, all logic live inside `Story.yaml`.
_Assets and positions can be configured from the two YAML helpers_.

A good module keeps scenes small, explicit, and readable. The best way to think about this is to _treat a scene as a function_:

- One purpose per scene (intro, challenge, explanation, terminal task, wrapup, etc.)
- Keep a linear flow by using `scene:` to jump to the next scene / block.
- Don’t try to cram multiple interactions into one scene unless they belong together.
- Plugins are tools inside scenes, they don’t replace scene structure.

### Core Commands

| Command | Purpose                                             | Example                                     |
| ------- | --------------------------------------------------- | ------------------------------------------- |
| `show`  | Display a character, background, item, or GUI asset | `- show player: normal AT CENTER WITH FADE` |
| `hide`  | Hide an asset or hide everything                    | `- hide ALL:`                               |
| `say`   | Display dialogue using a character’s textbox        | `- player says: "Welcome!"`                 |
| `wait`  | Pause execution (milliseconds or click)             | `- wait: click`                             |
| `scene` | Jump to another scene in the story                  | `- scene: intro`                            |
| `call`  | Invoke a plugin with parameters                     | `- call ProgressBar: STEP`                  |

Following is a detailed list of the available command keywords for the `Story.yaml` scenes:

**`show`**

Display an asset.

**Syntax**:

```yaml
- show <ASSET>: <SPEED> AT <LOCATION> WITH <EFFECT>
```

**Example(s)**:

```yaml
- show player: normal AT CENTER WITH FADE
```

---

**`hide`**

Hides an asset.

**Syntax**:

```yaml
- hide <ASSET>: WITH <EFFECT>
```

**Example(s)**:

```yaml
- hide player: WITH FADE
```

```yaml
- hide ALL: # Hide everything
```

---

**`say`**

Dialogue output, character message.

**Syntax**:

```yaml
- <ASSET> says: <MESSAGE>
```

**Example(s)**:

```yaml
- player says: "Hello there!"
```

---

**`wait`**

Pause the game, wait for interaction.

**Syntax**:

```yaml
- wait: <AMOUNT || click>
```

**Example(s)**:

```yaml
- wait: 300 # milliseconds
```

```yaml
- wait: click # wait for user interaction
```

---

**`scene`**

Jump to another scene.

**Syntax**:

```yaml
- scene: <SCENE>
```

**Example(s)**:

```yaml
- scene: example_1
```

### Cybergame Plugins

Plugins do not create scenes, they are actions you drop inside scenes. A good practice to understand plugins is to think that the Scene structure controls the game's flow, while plugins control the interaction with the user. Use the following command in your `Story.yaml` to invoke a plugin with parameters:

**`call`**

Invoke a plugin with parameters.

**Syntax**:

```yaml
- call <PLUGIN>: <COMMAND>
  param_1: <value>
  param_2: <value>
  ...
```

#### Available Plugins

| Name                                         | Description                                                                |
| ---------------------------------------------| -------------------------------------------------------------------------- |
| [WaitEvent](#waitevent)                      | Pause execution until a plugin or iframe sends a message                   |
| [ProgressBar](#progressbar)                  | Handles the progress bar progression                                       |
| [CustomText](#customtext)                    | Creates a textbox overlay to show message                                  |
| [SidePanel](#sidepanel)                      | Slide-out panel for notes, clues, definitions, forms                       |
| [TipsAndTricksPanel](#tipsandtrickssidepanel)| Slide-out panel for tips and tricks                                        |
| [Website](#website)                          | Embedded simulated browser window                                          |
| [LayoutSectionTitle](#layoutsectiontitle)    | Shows a headline at the top or bottom of the screen                        |
| [TextInput](#textinput)                      | Collects typed input from the user                                         |
| [AdvanceChoices](#advancechoices)            | Allows positioning choices via a special `__config` block                  |
| [ExecJs](#execjs)                            | Execute arbitrary JavaScript inside the RenJS context                      |
| [VarFilters](#varfilters)                    | Pipe a variable through filters and store the result into another variable |
| [CheckPoint](#checkpoint)                    | Persistent save system                                                     |
| [CommandCraft](#commandcraft)                | Interactive command-building cyber terminal                                |

---

##### **`WaitEvent`**

**Syntax**:

```yaml
- call WaitEvent: <EVENT>
  vars: <varA varB varC>
```

**Commands**:

- `EVENT`: Event to wait for

**Parameters**:

- `vars`: Variables to map event arguments into

**Example(s)**:

```yaml
- call WaitEvent: command-craft-finished
  vars: userAnswer
```

---

##### **`ProgressBar`**

**Syntax**:

```yaml
- call ProgressBar: <COMMAND>
  steps: <number> (optional)
  step: <number> (optional)
```

**Commands**:

- `SHOW`: Shows the progress bar
- `HIDE`: Hides the progress bar
- `LOAD`: Loads the progress bar
- `STEP`: Move the progress bar step
- `DESTROY`: Destroys the progress bar

**Parameters**:

- `steps`: Used along with the `LOAD` command to define the total progress bar steps.
- `step`: Used along with the `LOAD` or `STEP` command to set the progress bar step.

**Example(s)**:

```yaml
- call ProgressBar: SHOW
```

```yaml
- call ProgressBar: HIDE
```

```yaml
- call ProgressBar: LOAD
  steps: 10
  step: 1
```

```yaml
- call ProgressBar: STEP
  step: 3
```

```yaml
- call ProgressBar: DESTROY
```

---

##### **`CustomText`**

**Syntax**:

```yaml
- call CustomText: <TEXT>
  name: <string>
  character: <string>
```

**Commands**:

- `TEXT`: The text to show.

**Parameters**:

- `name`: Name of the character who says the text.
- `character`: Asset to use for the character .

**Example(s)**:

```yaml
- call CustomText: "Hello there"
  name: player
  side: right
```

---

##### **`SidePanel`**

**Syntax**:

```yaml
- call SidePanel: <COMMAND>
  dontwait: <boolean>
  content:
    - type: <`p`|`h1`-`h6`|div`|html`|input-*`|button`|History-*`>
      text: <string> (optional)
      html: <string> (optional)
      md: <string> (optional)
      style: <string> (optional)
      class: <string> (optional)
      data: <string> (optional)
      label: <string> (optional)
```

**Commands**:

- `SHOW`: Shows the sidepanel
- `HIDE`: Hides the sidepanel
- `OPEN`: Opens the sidepanel
- `CLOSE`: Closes the sidepanel
- `CLEAR`: Clears the sidepanel
- `DESTROY`: Destroys the sidepanel

**Parameters**:

- `dontwait`: Whether to immediately show the content
- `content`: Content for the sidepanel
  - `type`: The type of content
  - `text`: Text for the content
  - `html`: HTML for the content
  - `md`: Markdown for the content
  - `style`: Style for the content
  - `class`: Class for the content
  - `data`: JSON for the content
  - `label`: Label for the content (_if type is input_)

**Example(s)**:

```yaml
- call SidePanel:
  dontwait: true
  content:
    - type: h4
      html: <i class="fa-solid fa-note-sticky"></i> Notes & Clues
```

---

##### **`TipsAndTricksSidePanel`**

**Syntax**:

```yaml
- call SidePanelTips: <COMMAND>
  dontwait: <boolean>
  content:
    - type: <`p`|`h1`-`h6`|div`|html`|input-*`|button`|History-*`>
      text: <string> (optional)
      html: <string> (optional)
      md: <string> (optional)
      style: <string> (optional)
      class: <string> (optional)
      data: <string> (optional)
      label: <string> (optional)
```

**Commands**:

- `SHOW`: Shows the sidepanel
- `HIDE`: Hides the sidepanel
- `OPEN`: Opens the sidepanel
- `CLOSE`: Closes the sidepanel
- `CLEAR`: Clears the sidepanel
- `DESTROY`: Destroys the sidepanel

**Parameters**:

- `dontwait`: Whether to immediately show the content
- `content`: Content for the sidepanel
  - `type`: The type of content
  - `text`: Text for the content
  - `html`: HTML for the content
  - `md`: Markdown for the content
  - `style`: Style for the content
  - `class`: Class for the content
  - `data`: JSON for the content
  - `label`: Label for the content (_if type is input_)

**Example(s)**:

```yaml
- call SidePanelTips:
  dontwait: true
  content:
    - type: h4
      html: <i class="fa-solid fa-lightbulb"></i> Tips & Tricks
```

---

##### **`Website`**

**Syntax**:

```yaml
- call Website: <COMMAND>
  browser: <google-chrome|firefox|noframe>
  url: <string>
  title: <string>
  address: <string>
  width: <number> (optional)
  height: <number> (optional)
  offsetx: <number> (optional)
  offsety: <number> (optional)
```

**Commands**:

- `LOAD`: Creates or updates the embedded browser window
- `SHOW`: Shows the browser
- `HIDE`: Hides the browser
- `DESTROY`: Removes the browser UI

**Parameters**:

- `browser`: Browser style (google-chrome, firefox, noframe)
- `url`: URL to load in the iframe
- `title`: Browser tab text
- `address`: Address bar text
- `width`: Frame width
- `height`: Frame height
- `offsetx`: Horizontal offset
- `offsety`: Vertical offset

**Example(s)**:

```yaml
- call Website: LOAD
  browser: google-chrome
  url: "https://example.com"
  title: "Example Site"
  address: "https://example.com"
  width: 1000
  height: 528
```

```yaml
- call Website: SHOW
```

---

##### **`LayoutSectionTitle`**

**Syntax**:

```yaml
- call LayoutSectionTitle: <TEXT || COMMAND>
  position: <top|bottom>
  bg: <color>
  text: <color>
  waitForClick: <boolean>
```

**Commands**:

- `<TEXT>`: Shows a section title
- `DESTROY TOP`: Removes top titles
- `DESTROY BOTTOM`: Removes bottom titles
- `DESTROY ALL`: Removes all titles

**Parameters**:

- `position`: Position of the title (top or bottom)
- `bg`: Background color
- `text`: Text color
- `waitForClick`: Whether to wait for click before continuing

**Example(s)**:

```yaml
- call LayoutSectionTitle: Introduction
  position: top
  bg: 0x000000
  text: "#ffffff"
```

---

##### **`TextInput`**

**Syntax**:

```yaml
- call TextInput: <TEXT>
  type: <text|number|password>
  variable: <string>
  default: <string>
  color: <string>
  filters: <filterA|filterB|...>
  customFilters:
    <filterName>: <JS function body>
```

**Commands**:

- `<TEXT>`: Shows the input field

**Parameters**:

- `type`: Input type
- `variable`: Variable to store the result
- `default`: Default value
- `color`: Text color
- `filters`: Built-in filters
- `customFilters`: User-defined filters

**Example(s)**:

```yaml
- call TextInput: "Enter username"
  variable: username
  type: text
  filters: trim|lowercase
```

---

##### **`AdvanceChoices`**

**Syntax**:

```yaml
- choice:
    - "Option A": [...]
    - "Option B": [...]
    - __config:
      y: <number>
      x: <number>
```

**Parameters**:

- `__config`: Allows for custom positioning choices
  - `y`: Override Y position
  - `x`: Override X position

**Example(s)**:

```yaml
- choice:
    - "Option A":
        - player says normal: You selected A!
    - "Option B":
        - player says normal: You selected B!
    - __config:
      y: 700
```

---

##### **`ExecJs`**

**Syntax**:

```yaml
- call ExecJs: <Javascript>
```

**Example(s)**:

```yaml
- call ExecJs: this.counter = Math.random()
```

---

##### **`VarFilters`**

**Syntax**:

```yaml
- call VarFilters: <source|filterA|filterB|target>
```

**Example(s)**:

```yaml
- call VarFilters: variable_a|trim|sha256|variable_b
```

---

##### **`CheckPoint`**

**Syntax**:

```yaml
- call CheckPoint: <COMMAND>
  scene: <string>
```

**Commands**:

- `AUTO`: Save checkpoint
- `RESTORE`: Restore checkpoint
- `CLEAR`: Clear all checkpoints

**Parameters**:

- `scene`: Scene to save or restore

**Example(s)**:

```yaml
- call CheckPoint: AUTO
  scene: challenge-checkpoint
```

---

##### **`CommandCraft`**

**Syntax**:

```yaml
- call CommandCraft: <COMMAND>
  mode: <string>
  difficulty: <string>
  answers:
    - text: <string>
      correct: <boolean>
  dont_mix_answers: <boolean>
  dont_print_answers: <boolean>
  output: <string>
  term_text: <string|array>
  pre_text: <string>
  width: <number>
  height: <number>
  offsetx: <number>
  offsety: <number>
```

**Commands**:

- `LOAD`: Load activity
- `CONTINUE`: Reload with state
- `SHOW`: Show
- `HIDE`: Hide
- `DESTROY`: Destroy

**Parameters**:

- `mode`: Game mode
- `difficulty`: Difficulty tier
- `answers`: Answer blocks
- `output`: Result variable
- `term_text`: Terminal intro text
- `pre_text`: Pre-instructions
- `dont_mix_answers`: Disable shuffling
- `dont_print_answers`: Hide printed answers
- `width/height`: Frame dimensions
- `offsetx/offsety`: Position adjustments

**Example(s)**:

```yaml
- call CommandCraft: LOAD
  mode: put-in-order
  difficulty: easy
  answers:
    - text: "ls"
    - text: "cd /var/www"
    - text: "cat index.html"
```

---
## Tips & Tricks

| Content type                   | How to write it                                     | Example                                     |
|--------------------------------|---------------------------------------------------|--------------------------------------------|
| **Bold text in Scenes**         | Put your sentence inside `""` and wrap the word(s) in `(bold)...(end)` | `"The attacker came from (bold)192.168.1.1(end) IP address."` |
| **Text in Scenes that needs to be inside `""`**| Put the text inside quotes `""`. Escape any `"` inside with `\"..\"`. | `- call CustomText: "Hello! Welcome to the \"OSI Model\" Games."` |
| **Normal text inside SidePanel**| Put the sentence inside quotes | `- type: p`<br>`  md: "This is normal text."` |
| **Bold text inside SidePanel**  | Wrap the word(s) in `**...**` and put the whole text inside quotes | `- type: p`<br>`  md: "**Layer 1 – Physical**: Wires, Wi-Fi, signals."` |
| **Separator / line in SidePanel** | Put dashes inside quotes | `- type: p`<br>`  md: "------------------------"` |


## Basic Scene

Here is a minimal example of a `Story.yaml` with 4 Scenes:

```yaml
start:
  - call ProgressBar: LOAD
    steps: 4
    step: 1
  - call ProgressBar: SHOW
  - show bg_intro: WITH FADE
  - call CustomText: "Welcome to the module."
    name: player
  - scene: intro

intro:
  - call ProgressBar: STEP
    step: 2
  - show character: normal AT LEFT WITH FADE
  - player says: "Let's begin."
  - scene: challenge

challenge:
  - call ProgressBar: STEP
    step: 3
  # ... actions here ...
  - scene: wrapup

wrapup:
  - call ProgressBar: STEP
    step: 4
  - scene: endGame

endGame:
  - call ProgressBar: HIDE
  - hide ALL:
  - effect ROLLINGCREDITS:
      endGame: true
      text:
        - My Module Title
        - using Cybergame
```
