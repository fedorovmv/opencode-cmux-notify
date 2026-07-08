# opencode-notify-cmux

OpenCode plugin that connects agent session lifecycle events to local `cmux` desktop notifications.

This plugin ensures you stay updated on agent progress, questions, errors, and permission prompts without needing to manually poll or constantly check the terminal.

---

## Architecture & How It Works

This integration operates as an **event-driven OpenCode JavaScript plugin**. 

Instead of spawning separate background watchers or polling scripts, the plugin registers a hook listener within the OpenCode host process. When specific events are fired by the agent, OpenCode invokes the plugin's `event` handler, which in turn calls the local `cmux notify` CLI utility.

```
+------------------+                   +--------------------+
|  OpenCode Agent  | --(Event Fired)-->| JS Lifecycle Hook  |
+------------------+                   +----------+---------+
                                                  |
                                            (Executes CLI)
                                                  v
+------------------+                   +--------------------+
|  OS Notification |<--(Status Ring)---|     cmux notify    |
+------------------+                   +--------------------+
```

### Event Mappings & Functions

The plugin maps various event types from the `@opencode-ai/sdk` to user-facing notification titles, subtitles, and bodies:

| OpenCode Event (`event.type`) | Notification Subtitle | Notification Body | Purpose / Behavior |
| --- | --- | --- | --- |
| **`session.idle`** | `Waiting for input` | `Agent is waiting` | Fired when the agent completes its current planning or execution loop and is waiting for the user to provide new instructions. |
| **`session.status`** <br>*(where status is `idle`)* | `Waiting for input` | `Agent is waiting` | Fired during status updates when the agent transitions into an idle state. |
| **`session.error`** | `Error` | `Agent encountered an error` | Triggered if the agent encounters an exception, unhandled rejection, or model connection failure. |
| **`permission.asked`** <br>*(v2 API)* | `Waiting for you` | `Permission requested` | Fired when the agent needs permission to read/write restricted files or execute specific commands. |
| **`permission.updated`** <br>*(v1 API)* | `Waiting for you` | `Permission requested` | Legacy/fallback permission request event. |
| **`question.asked`** | `Question for you` | `OpenCode needs your input` | Triggered when the agent needs clarifying details on a task. |
| **`session.complete`** | `Task complete` | `Agent finished successfully` | Fired when the agent finishes execution and closes the session successfully. |

---

## Automatic `cmux` Path Resolution

To work reliably across different user environments and setups, the plugin implements a path resolution algorithm:
1. **Dynamic Search**: It runs `which cmux` using `spawnSync` at startup to locate the executable inside active shell environment paths.
2. **Hardcoded Fallback**: If the command fails (e.g. if environment variables are not inherited by the daemon process), it falls back to the default installation location:
   `~/Applications/cmux.app/Contents/Resources/bin/cmux` (resolves dynamically to the user's home directory).

---

## Installation & Setup

### 1. Place the Plugin Files
The plugin is stored globally in the OpenCode configuration hierarchy. Put the `hooks.js` file at:
`~/.config/opencode/plugins/opencode-notify-cmux/hooks.js`

Alternatively, you can keep it in your workspace directory `/absolute/path/to/opencode-notify-cmux/hooks.js` and link to it.

### 2. Configure `opencode.json`
Add the absolute file path to the `"plugin"` array in `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "autoupdate": true,
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git",
    "oh-my-opencode-slim",
    "/<your_home_dir>/.config/opencode/plugins/opencode-notify-cmux/hooks.js"
  ]
}
```

### 3. Verify the Configuration
Validate that OpenCode parses the updated configuration and successfully registers the plugin metadata:
```bash
opencode debug config
```
Check that the registered path to `hooks.js` appears in the `plugin_origins` list.

---

## Logging & Troubleshooting

If notifications are not appearing as expected:

1. **Plugin Internal Logs**:
   The plugin uses `client.app.log` during initialization and event processing. You can check these logs in the OpenCode log directory:
   - Active log file: `~/.local/share/opencode/log/opencode.log`
   - Orchestration/Slim logs: `~/.local/share/opencode/log/oh-my-opencode-slim.*.log`
   
   Look for lines containing `[lifecycle-hooks]` or `[plugin] initialized`.

2. **Manual Test Run**:
   You can manually run a task with OpenCode and inspect if the plugin hooks fire:
   ```bash
   opencode run "echo 'hello'"
   ```

3. **Check `cmux` directly**:
   Verify that `cmux` is capable of sending notifications by executing it directly in your terminal:
   ```bash
   ~/Applications/cmux.app/Contents/Resources/bin/cmux notify --title "Test" --subtitle "Manual Test" --body "Checking cmux integration"
   ```
