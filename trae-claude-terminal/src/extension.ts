import * as vscode from 'vscode';

const STATE_KEY = 'claudeTerminalNames';
const DEFAULT_NAME = 'Claude Code';

// Track terminals created by this extension (by object reference, not name pattern)
const trackedTerminals = new Set<vscode.Terminal>();

// Module-level context for deactivate()
let _context: vscode.ExtensionContext | null = null;

function getNextDefaultName(): string {
    const existingNames = new Set(
        Array.from(trackedTerminals).map(t => t.name)
    );
    if (!existingNames.has(DEFAULT_NAME)) {
        return DEFAULT_NAME;
    }
    let n = 2;
    while (existingNames.has(`Claude Code ${n}`)) {
        n++;
    }
    return `Claude Code ${n}`;
}

async function syncState(context: vscode.ExtensionContext): Promise<void> {
    // Sync names in current tab order (includes renamed terminals)
    const orderedTerminals = vscode.window.terminals.filter(
        t => trackedTerminals.has(t)
    );
    const names = orderedTerminals.map(t => t.name);
    await context.globalState.update(STATE_KEY, names);
}

async function createClaudeTerminal(
    context: vscode.ExtensionContext
): Promise<void> {
    try {
        const name = getNextDefaultName();

        const options: vscode.TerminalOptions = {
            name,
            location: { viewColumn: vscode.ViewColumn.Two }
        };

        const terminal = vscode.window.createTerminal(options);
        trackedTerminals.add(terminal);
        // sendText may race with shell startup on slow machines
        terminal.sendText('claude');
        terminal.show();

        await syncState(context);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to create Claude terminal: ${err}`);
        console.error('trae-claude-terminal:', err);
    }
}

const LOG_PREFIX = '[trae-claude-terminal]';

function restoreTerminals(context: vscode.ExtensionContext): void {
    const names: string[] | undefined = context.globalState.get(STATE_KEY);
    console.log(LOG_PREFIX, 'restoreTerminals() called, saved names:', names);

    if (!names || names.length === 0) {
        console.log(LOG_PREFIX, 'no saved names, skip restore');
        return;
    }

    const remaining = [...names];

    // Step 1: Match by name (handles the case where TRAE preserved names)
    for (const terminal of vscode.window.terminals) {
        const idx = remaining.indexOf(terminal.name);
        if (idx !== -1) {
            remaining.splice(idx, 1);
            trackedTerminals.add(terminal);
            console.log(LOG_PREFIX, '  matched by name:', terminal.name);
            // Delay sendText — restored terminals may not have a ready shell yet
            setTimeout(() => terminal.sendText('claude'), 300);
        }
    }

    if (remaining.length === 0) {
        console.log(LOG_PREFIX, 'all terminals matched by name, restore complete');
        return;
    }

    console.log(LOG_PREFIX, `${remaining.length} name(s) still unmatched:`, remaining);

    // Step 2: Match remaining names to any untracked terminal.
    // TRAE restores terminals but renames them to the default shell
    // (e.g. "powershell"), so name-matching fails. Claim untracked
    // terminals in whatever order VS Code exposes them.
    for (const name of remaining) {
        const untracked = vscode.window.terminals.find(t => !trackedTerminals.has(t));
        if (untracked) {
            trackedTerminals.add(untracked);
            console.log(LOG_PREFIX, `  claimed untracked terminal "${untracked.name}" → "${name}"`);
            setTimeout(() => untracked.sendText('claude'), 300);
        } else {
            // No untracked terminal to claim — create a fresh one
            const terminal = vscode.window.createTerminal({
                name,
                location: { viewColumn: vscode.ViewColumn.Two }
            });
            trackedTerminals.add(terminal);
            console.log(LOG_PREFIX, `  created new terminal: "${name}"`);
            setTimeout(() => terminal.sendText('claude'), 300);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    _context = context;
    console.log(LOG_PREFIX, 'activate() called');

    // Restore terminals from saved state (not relying on TRAE session restore)
    restoreTerminals(context);

    // Register command
    const cmdDisposable = vscode.commands.registerCommand(
        'trae-claude-terminal.open',
        () => createClaudeTerminal(context)
    );

    // Listen for terminal close, remove from tracking set, sync state
    const closeDisposable = vscode.window.onDidCloseTerminal(
        (terminal: vscode.Terminal) => {
            if (trackedTerminals.has(terminal)) {
                trackedTerminals.delete(terminal);
                syncState(context);
            }
        }
    );

    // Sync state on terminal switch (catches renames)
    const activeDisposable = vscode.window.onDidChangeActiveTerminal(
        () => syncState(context)
    );

    context.subscriptions.push(cmdDisposable, closeDisposable, activeDisposable);
}

export function deactivate() {
    console.log(LOG_PREFIX, 'deactivate() called, trackedTerminals:', [...trackedTerminals].map(t => t.name));
    if (!_context) {
        console.log(LOG_PREFIX, 'deactivate() — no context, skip');
        return;
    }

    // Sync current tab order, including user-renamed terminals
    const ordered: string[] = [];
    for (const terminal of vscode.window.terminals) {
        if (trackedTerminals.has(terminal)) {
            ordered.push(terminal.name);
        }
    }

    console.log(LOG_PREFIX, 'deactivate() saving names:', ordered);
    _context.globalState.update(STATE_KEY, ordered);
}
