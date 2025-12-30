import * as vscode from 'vscode';
import * as path from 'path';
import { ProfileConfig, normalizePathForPython } from './types';

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

        const profileConfig = await this.getProfileConfig(environment);
        if (!profileConfig) {
            return;
        }

        await this.executeDbtCommand(
            workspaceRoot,
            environment,
            dbtCommand,
            additionalParams,
            profileConfig
        );
    }

    async runProjectEvaluator() {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

        const environment = await this.selectEnvironment();
        if (!environment) {
            return;
        }

        const profileConfig = await this.getProfileConfig(environment);
        if (!profileConfig) {
            return;
        }

        await this.executeDbtCommand(
            workspaceRoot,
            environment,
            'build',
            '--selector dbt_project_evaluator',
            profileConfig
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

    private async getProfileConfig(environment: string): Promise<ProfileConfig | undefined> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const configs = config.get<ProfileConfig[]>('profileConfigs', []);

        if (configs.length === 0) {
            const answer = await vscode.window.showWarningMessage(
                'No profile configurations found. Would you like to configure one now?',
                'Yes', 'No'
            );
            
            if (answer === 'Yes') {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'dbtRunner.profileConfigs');
            }
            return undefined;
        }

        const matchingConfig = configs.find(cfg => cfg.profileTarget === environment);
        
        if (!matchingConfig) {
            const answer = await vscode.window.showWarningMessage(
                `No configuration found for profile target "${environment}". Would you like to configure it now?`,
                'Yes', 'No'
            );
            
            if (answer === 'Yes') {
                await vscode.commands.executeCommand('dbt-runner.addProfileConfig');
            }
            return undefined;
        }

        let passphrase = matchingConfig.privateKeyPassphrase;
        if (!passphrase) {
            passphrase = await vscode.window.showInputBox({
                prompt: `Enter private key passphrase for profile target "${matchingConfig.profileTarget}"`,
                password: true
            });

            if (!passphrase) {
                return undefined;
            }
        }

        return {
            ...matchingConfig,
            privateKeyPassphrase: passphrase
        };
    }

    private async executeDbtCommand(
        workspaceRoot: string,
        environment: string,
        dbtCommand: string,
        additionalParams: string,
        profileConfig: ProfileConfig
    ) {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const dbtProjectPath = config.get<string>('dbtProjectPath', 'dbt');
        const fullDbtPath = path.join(workspaceRoot, dbtProjectPath);

        const env = {
            ...process.env,
            DBT_USER: profileConfig.user,
            DBT_PVK_PATH: normalizePathForPython(profileConfig.privateKeyPath),
            DBT_PVK_PASS: profileConfig.privateKeyPassphrase || ''
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
        this.outputChannel.appendLine(`Profile Target: ${environment}`);
        this.outputChannel.appendLine(`User: ${profileConfig.user}`);
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
