import { spawn, spawnSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

function resolveCmuxPath() {
    const result = spawnSync('which', ['cmux'], {
        encoding: 'utf8'
    });

    if (result.status === 0) {
        const bin = result.stdout.trim();
        if (bin) {
            return bin;
        }
    }

    return join(homedir(), 'Applications/cmux.app/Contents/Resources/bin/cmux');
}

const CMUX_BIN = resolveCmuxPath();

function notify({ subtitle, body = 'OpenCode event' }) {
    const child = spawn(CMUX_BIN, [
        'notify',
        '--title', 'OpenCode',
        '--subtitle', subtitle,
        '--body', body
    ], {
        detached: true,
        stdio: 'ignore'
    });

    child.unref();
}

export const LifecycleHooksPlugin = async ({ client }) => {
    try {
        await client.app.log({
            body: {
                service: 'lifecycle-hooks',
                level: 'info',
                message: 'Plugin loaded successfully'
            }
        });
    } catch (error) {
        console.error('[lifecycle-hooks] Error during initialization:', error);
    }

    return {
        event: async ({ event }) => {
            try {
                // Session waiting for user input
                if (event.type === 'session.idle') {
                    notify({
                        subtitle: 'Waiting for input',
                        body: 'Agent is waiting'
                    });
                }

                // Session status change to idle
                if (event.type === 'session.status' && event.properties?.status?.type === 'idle') {
                    notify({
                        subtitle: 'Waiting for input',
                        body: 'Agent is waiting'
                    });
                }

                // Session error
                if (event.type === 'session.error') {
                    notify({
                        subtitle: 'Error',
                        body: 'Agent encountered an error'
                    });
                }

                // Permission requested (v1 & v2 events)
                if (event.type === 'permission.asked' || event.type === 'permission.updated') {
                    notify({
                        subtitle: 'Waiting for you',
                        body: 'Permission requested'
                    });
                }

                // Question asked (v2 event)
                if (event.type === 'question.asked') {
                    notify({
                        subtitle: 'Question for you',
                        body: 'OpenCode needs your input'
                    });
                }

                // Optional: completed event
                if (event.type === 'session.complete') {
                    notify({
                        subtitle: 'Task complete',
                        body: 'Agent finished successfully'
                    });
                }

            } catch (error) {
                console.error('[lifecycle-hooks] Error in event handler:', error);
            }
        }
    };
};

export const server = LifecycleHooksPlugin;
export default LifecycleHooksPlugin;
