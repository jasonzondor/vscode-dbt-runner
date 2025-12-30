import * as vscode from 'vscode';
import * as path from 'path';
import { SnowflakeConfig } from './types';

export class DbtRunner {
    private outputChannel: vscode.OutputChannel;
    private terminal: vscode.Terminal | undefined;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('DBT Runner');
    }

    private quotePath(pathString: string): string {
        // Quote path if it contains spaces and isn't already quoted
        if (pathString.includes(' ') && !pathString.startsWith('"')) {
            return `"${pathString}"`;
        }
        return pathString;
    }

    async runDbtCommand() {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration('dbtRunner');

        const environment = await this.selectEnvironment();
        if (!environment) {
            return;
        }

        const dbtCommand = await this.selectDbtCommand();
        if (!dbtCommand) {
            return;
        }

        const additionalParams = await this.getAdditionalParameters();
        if (additionalParams === undefined) {
            return;
        }

        const snowflakeConfig = await this.getSnowflakeConfig(environment);
        if (!snowflakeConfig) {
            return;
        }

        await this.executeDbtCommand(
            workspaceRoot,
            environment,
            dbtCommand,
            additionalParams,
            snowflakeConfig
        );
    }

    private async selectEnvironment(): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const environments = config.get<string[]>('environments', ['dev', 'prod']);

        const selected = await vscode.window.showQuickPick(environments, {
            placeHolder: 'Select environment to run dbt in',
            canPickMany: false
        });

        return selected;
    }

    private async selectDbtCommand(): Promise<string | undefined> {
        const commands = [
            { label: 'run', description: 'Execute SQL models' },
            { label: 'build', description: 'Run models, tests, snapshots, and seeds' },
            { label: 'test', description: 'Run tests' },
            { label: 'seed', description: 'Load seed files' },
            { label: 'snapshot', description: 'Execute snapshots' },
            { label: 'compile', description: 'Compile models' },
            { label: 'debug', description: 'Debug connection' },
            { label: 'deps', description: 'Install dependencies' },
            { label: 'clean', description: 'Clean target directory' },
            { label: 'docs generate', description: 'Generate documentation' },
            { label: 'docs serve', description: 'Serve documentation' },
            { label: 'source freshness', description: 'Check source freshness' }
        ];

        const selected = await vscode.window.showQuickPick(commands, {
            placeHolder: 'Select dbt command to run',
            canPickMany: false
        });

        return selected?.label;
    }

    private async getAdditionalParameters(): Promise<string | undefined> {
        const params = await vscode.window.showInputBox({
            prompt: 'Enter additional dbt parameters (optional)',
            placeHolder: 'e.g., --full-refresh --select model_name',
            value: ''
        });

        return params;
    }

    private async getSnowflakeConfig(environment: string): Promise<SnowflakeConfig | undefined> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const accounts = config.get<SnowflakeConfig[]>('snowflakeAccounts', []);

        if (accounts.length === 0) {
            const answer = await vscode.window.showWarningMessage(
                'No Snowflake accounts configured. Would you like to configure one now?',
                'Yes', 'No'
            );
            
            if (answer === 'Yes') {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'dbtRunner.snowflakeAccounts');
            }
            return undefined;
        }

        let selectedAccount: SnowflakeConfig | undefined;

        if (accounts.length === 1) {
            selectedAccount = accounts[0];
        } else {
            const accountNames = accounts.map(acc => acc.name);
            const selected = await vscode.window.showQuickPick(accountNames, {
                placeHolder: 'Select Snowflake account',
                canPickMany: false
            });

            if (!selected) {
                return undefined;
            }

            selectedAccount = accounts.find(acc => acc.name === selected);
        }

        if (!selectedAccount) {
            return undefined;
        }

        let passphrase = selectedAccount.privateKeyPassphrase;
        if (!passphrase) {
            passphrase = await vscode.window.showInputBox({
                prompt: `Enter private key passphrase for ${selectedAccount.name}`,
                password: true
            });

            if (!passphrase) {
                return undefined;
            }
        }

        return {
            ...selectedAccount,
            privateKeyPassphrase: passphrase
        };
    }

    private async executeDbtCommand(
        workspaceRoot: string,
        environment: string,
        dbtCommand: string,
        additionalParams: string,
        snowflakeConfig: SnowflakeConfig
    ) {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const dbtProjectPath = config.get<string>('dbtProjectPath', 'dbt');
        const fullDbtPath = path.join(workspaceRoot, dbtProjectPath);

        const env = {
            ...process.env,
            DBT_ACCOUNT: snowflakeConfig.account,
            DBT_USER: snowflakeConfig.user,
            DBT_PVK_PATH: snowflakeConfig.privateKeyPath,
            DBT_PVK_PASS: snowflakeConfig.privateKeyPassphrase || ''
        };

        const commandParts = ['poetry', 'run', 'dbt', ...dbtCommand.split(' ')];
        
        commandParts.push('--project-dir', this.quotePath(fullDbtPath));
        commandParts.push('--profiles-dir', this.quotePath(path.join(fullDbtPath, 'profiles')));
        commandParts.push('--target', environment);
        
        if (additionalParams.trim()) {
            commandParts.push(...additionalParams.trim().split(' '));
        }

        const fullCommand = commandParts.join(' ');

        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine(`Running: ${fullCommand}`);
        this.outputChannel.appendLine(`Working directory: ${fullDbtPath}`);
        this.outputChannel.appendLine(`Environment: ${environment}`);
        this.outputChannel.appendLine(`Configuration: ${snowflakeConfig.name}`);
        this.outputChannel.appendLine(`Snowflake Account: ${snowflakeConfig.account}`);
        this.outputChannel.appendLine(`User: ${snowflakeConfig.user}`);
        this.outputChannel.appendLine('---\n');

        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal({
                name: 'DBT Runner',
                cwd: fullDbtPath,
                env: env
            });
        }

        this.terminal.show();
        this.terminal.sendText(fullCommand);
    }
}
