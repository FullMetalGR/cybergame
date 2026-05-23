# Creating Websites for Cybergame Modules

Some Cybergame modules require custom websites—for phishing simulations, command-and-control dashboards, login portals, reconnaissance tasks, or interactive micro-apps.
The `Website` plugin renders these websites inside an in-game browser frame using an `<iframe>`.

This guide explains how to structure, author, and integrate custom websites so they work correctly with the Cybergame engine.

## Core Requirements

All Cybergame webpages:

- Run inside an iframe
- Must use _same-origin_ URLs
- Communicate with the game using _postMessage_
- Must listen for _init_ messages
- Must send _completion_ messages back
- Must not attempt to set their own page title dynamically;
- Should avoid navigation, external resources, and non-local frameworks

These rules ensure stability across LMS and Cybergame environments and browser sandboxing.

## Folder Structure

All website pages loaded through the Website plugin must be placed inside:

```bash
/game/extra/pages/
```

You can then load those page using the `Website` plugin:

```yaml
- call Website: LOAD
  browser: google-chrome
  url: "extra/pages/login.html"
  title: "Secure Login"
  address: "https://secure.example.com"
```

## Cybegame Web Messaging API

In order to have your website communicate with the cybergame module, add the following _script_ at the bottom of your page:

```html
<script>
  // ---- Event System ----
  const Events = {
    handlers: {},
    init() {
      window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type !== "renjs-event") return;

        const { id, args, scope } = event.data;
        (this.handlers[id] || []).forEach((fn) => fn.apply(scope, args));
      });
    },
    on(id, fn) {
      this.handlers[id] = this.handlers[id] || [];
      this.handlers[id].push(fn);
      this.init();
    },
  };

  // ---- API exposed to Cybergame Module ----
  const Game = {
    Events,
    onMessage(id, fn) {
      Events.on(id, fn);
    },
    sendMessage(id, args = [], scope = {}) {
      window.parent.postMessage(
        {
          type: "renjs-event",
          id: id,
          args,
          scope,
        },
        window.location.origin
      );
    },
  };
</script>
```

### Receiving an Init Message

When your page loads, the engine will send an init event.

Handle it like this:

```js
Game.onMessage("web-init", (data) => {
  // Perform setup using `data`
  // data = { url-params, state, configuration }
});
```

_Each page should use a unique event namespace (recommended prefix: **web-**) to avoid collisions with other plugin events._

### Sending a Message

When the user completes the interaction, send a result:

```js
Game.sendMessage("web-complete", ["RESULT_VALUE"]);
```

Then using the `Website` plugin in your scene:

```yaml
- call WaitEvent: web-complete
  vars: result
```

### Event Naming Convention

Cybergame modules use an event-based communication system between web pages and the main game engine.
To keep interactions modular, conflict-free, and easy to reason about, all custom website events must follow a strict naming convention. A consistent convention ensures:

- No collisions between multiple embedded pages
- Predictable linking between Story.yaml and webpage logic
- Easier debugging
- Cleaner multi-page module design

#### Naming Rules

1. Prefix by feature or module.

   Each web page must have a unique namespace prefix.

   ```bash
   <feature>-init
   <feature>-complete
   <feature>-error
   <feature>-event-<name>
   ```

2. Use lowercase, kebab-case.

   This is consistent with RenJS standards and readable in YAML + JavaScript.
   **Do this:**

   ```bash
   login-complete
   reset-password-init
   phish-error
   ```

   **Avoid this:**

   ```bash
   LoginComplete
   loginComplete
   login_complete
   LOGINCOMPLETE
   ```

3. Complete event names reflect a lifecycle

   Every page has:

   - `Init Event` sent from the Cybergame module to the webpage, this is used for configuration, parameters and preloaded content:
     ```js
     Game.onMessage("login-init", (data) => {
       // setup page...
     });
     ```
   - `Complete Event` sent from the webpage to the Cybergame module, this is used to return results or user interactions:
     ```js
     Game.sendMessage("login-complete", ["VALUE"]);
     ```

4. Never reuse event IDs across different pages

   If your module has two or multiple embedded web pages, avoid using generic names like:

   ```bash
   web-init
   web-complete
   ```

   Instead do use:

   ```bash
   email-init
   email-complete

   payment-init
   payment-complete
   ```

   This prevents cross-page event contamination when multiple pages run in the same module.

| Purpose             | Prefix Example       | Event Examples                              |
| ------------------- | -------------------- | ------------------------------------------- |
| Initialization      | `<feature>-init`     | `phish-init`, `login-init`                  |
| Completion / Output | `<feature>-complete` | `login-complete`, `osint-complete`          |
| Error Handling      | `<feature>-error`    | `login-error`, `phish-error`                |
| Sub-events          | `<feature>-event-*`  | `login-event-timeout`, `scanner-event-done` |

## Minimal Website Template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cybergame Page</title>

    <style>
      html,
      body {
        margin: 0;
        background: #ffffff;
        font-family: Arial, sans-serif;
      }
    </style>
  </head>

  <body>
    <!-- Your page UI here -->

    <!-- Include the Cybergame messaging API -->
    <script>
      // (Insert the full Game/Events script block here)
    </script>
  </body>
</html>
```

### Scene Example Flow

```yaml
- call Website: LOAD
  url: "extra/pages/login.html"
- call Website: SHOW
- call WaitEvent: login-complete
  vars: username password
- player says: "Attempt detected: {username}"
```

This keeps the page predictable across different LMS, Cybergame and browser environments.

## Best Practices

- Keep website pages self-contained — all JS/CSS local
- Use Game.onMessage to configure your page after it loads
- Use Game.sendMessage to return results
- Avoid external URLs entirely
- Avoid heavy JS frameworks unless bundled locally
- Match the Cybergame UI style: clean, simple, readable
- Do not rely on iframe resizing; use fixed layout or flexbox
