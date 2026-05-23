![CybergameLogo](./docs/images/cybergame.svg)

# Game Module Template

This repository provides the minimal template required to build a Cybergame learning module. It includes the base folder layout, essential YAML files, and the scripts needed to preview and package your game.

For a detailed walkthrough of how to structure your scenes, dialogue, interactive elements and side panels, refer to the [**Scenario Template Guide**](./docs/Scenario%20Template%20Guide.md).

## ⚡**How to use this Template**

| Step   | Action Description                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1️⃣** | Build your module inside the **/game** folder. The `Story.yaml` file is your main starting point.                                                                        |
| **2️⃣** | Place all your images and UI assets in **game/extra/assets/**. Use the provided folders for `backgrounds/`, `characters/`, `gui/`, `items/` and `pages/` for your files. |
| **3️⃣** | Keep your YAML files (**Story.yaml**, **Setup.yaml**, **Config.yaml**) clean and correctly indented.                                                                     |
| **4️⃣** | Add your module's name, description, version, and author in the `info.yaml` file.                                                                                        |
| **5️⃣** | Run the local tools of the following section inside the game and execute **Options 1 & 2**.                                                                              |
| **6️⃣** | When your module is ready to bundle, use the run script and choose **Option 3**.                                                                                         |

### 🔨 Local Tools

| OS        | **Windows** | **Unix Systems** |
| --------- | ----------- | ---------------- |
| _execute_ | `.\run.bat` | `./run.sh`       |

The following menu will appear in your terminal:

```bash
Menu:
1. Run localhost server   # Start local preview server
2. Install requirements   # Install module dependencies
3. Pack                   # Package game module
4. Exit
```

**⚠️ Important**: _Preview in an **incognito/private window** to see updates._  
_In a normal window, **Right click → Inspect → Network → Tick "Disable cache"** and keep it open while you edit._

#### **Practical Tips**

- Start with one scene and confirm it loads before expanding.
- Keep filenames short, lowercase, no spaces (use - or \_).
- Add a concise game description and topic list in info.yaml.

## 📚 **Folder Structure**

#### ⚙️ **`base-modules/renjs`**

Internal engine helpers used by all cybergame modules.

- `actions.py` (Python helper scripts)
- `requirements.txt` (Python tool dependencies)
- `extra-example/` (Example asset library)
- `src/` (Base build reference)

#### 📘 **`docs/`**

Short guides if you need more details on asset generation and scene development.

- [`Prerequisites`](./docs/Prerequisites.md)
- [`Creating AI Assets`](./docs/Creating%20AI%20Assets.md)
- [`Creating Scenes`](./docs/Creating%20Scenes.md)
- [`Creating Websites`](./docs/Creating%20Websites.md)
- [`Scenario Template Guide`](./docs/Scenario%20Template%20Guide.md)

#### 🎮 **`game/`**

Your game module, **write and edit files here**, where you create your actual module for local testing and distribution.

- `Story.yaml`: Story configuration used by the runtime. (Follow its structure for scenes, pages, and assets)
- `info.yaml`: Metadata about the game module (author, version, description).
- `extra/`: Optional game-specific resources.
  - `/assets/`: Backgrounds, characters, GUI, items, and page templates here.
    - `/backgrounds/`: stage backgrounds and environment artwork.
    - `/characters/`: character sprites or portraits.
    - `/gui/`: UI elements (buttons, message box backgrounds, fonts).
    - `/items/`: item icons and images used by the game.
    - `/pages/`: HTML pages or page templates for the game.
  - `/story/`: Auxiliary YAML such as `Config.yaml` and `Setup.yaml` for story initialization.
- `run.sh` / `run.bat`: Scripts to start a local preview or build an export (if present).
