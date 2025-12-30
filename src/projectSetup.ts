import * as vscode from 'vscode';
import * as path from 'path';
import { ProfileConfig, normalizePathForPython } from './types';

export class ProjectSetup {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('DBT Project Setup');
    }

    async setupProject() {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const dbtProjectPath = config.get<string>('dbtProjectPath', 'dbt');
        const fullDbtPath = path.join(workspaceRoot, dbtProjectPath);

        const includeCicd = await vscode.window.showQuickPick(
            [
                { label: 'No - Standard install', value: false },
                { label: 'Yes - Include CI/CD packages (--with cicd)', value: true }
            ],
            {
                placeHolder: 'Include CI/CD packages for pre-commit checks?'
            }
        );

        if (!includeCicd) {
            return;
        }

        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine('Setting up DBT project...');
        this.outputChannel.appendLine(`Workspace: ${workspaceRoot}`);
        this.outputChannel.appendLine(`DBT Path: ${fullDbtPath}`);
        this.outputChannel.appendLine(`Include CI/CD: ${includeCicd.value}`);
        this.outputChannel.appendLine('---\n');

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting up DBT project",
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
            progress.report({ increment: 0, message: "Running poetry lock..." });
            await this.runCommand(workspaceRoot, 'poetry lock');

            progress.report({ increment: 33, message: "Running poetry install..." });
            const installCmd = includeCicd.value ? 'poetry install --with cicd' : 'poetry install';
            await this.runCommand(workspaceRoot, installCmd);

            progress.report({ increment: 66, message: "Running dbt deps..." });
            await this.runCommand(fullDbtPath, 'poetry run dbt deps');

            progress.report({ increment: 100, message: "Complete!" });
        });

        vscode.window.showInformationMessage('DBT project setup complete!');
    }

    async runPreCommit() {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

        const profileConfig = await this.getProfileConfig();
        if (!profileConfig) {
            return;
        }

        const env = {
            ...process.env,
            DBT_USER: profileConfig.user,
            DBT_PVK_PATH: normalizePathForPython(profileConfig.privateKeyPath),
            DBT_PVK_PASS: profileConfig.privateKeyPassphrase || ''
        };

        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine('Running pre-commit checks...');
        this.outputChannel.appendLine(`Workspace: ${workspaceRoot}`);
        this.outputChannel.appendLine(`Profile Target: ${profileConfig.profileTarget}`);
        this.outputChannel.appendLine('---\n');

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Running pre-commit checks",
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
            progress.report({ increment: 0, message: "Running pre-commit..." });
            await this.runCommandWithEnv(workspaceRoot, 'poetry run pre-commit run --all-files', env);
            progress.report({ increment: 100, message: "Complete!" });
        });

        vscode.window.showInformationMessage('Pre-commit checks complete!');
    }

    private async getProfileConfig(): Promise<ProfileConfig | undefined> {
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

        let selectedConfig: ProfileConfig | undefined;

        if (configs.length === 1) {
            selectedConfig = configs[0];
        } else {
            const profileTargets = configs.map(cfg => cfg.profileTarget);
            const selected = await vscode.window.showQuickPick(profileTargets, {
                placeHolder: 'Select profile target',
                canPickMany: false
            });

            if (!selected) {
                return undefined;
            }

            selectedConfig = configs.find(cfg => cfg.profileTarget === selected);
        }

        if (!selectedConfig) {
            return undefined;
        }

        let passphrase = selectedConfig.privateKeyPassphrase;
        if (!passphrase) {
            passphrase = await vscode.window.showInputBox({
                prompt: `Enter private key passphrase for profile target "${selectedConfig.profileTarget}"`,
                password: true
            });

            if (!passphrase) {
                return undefined;
            }
        }

        return {
            ...selectedConfig,
            privateKeyPassphrase: passphrase
        };
    }

    private async runCommand(cwd: string, command: string): Promise<void> {
        return this.runCommandWithEnv(cwd, command, undefined);
    }

    private async runCommandWithEnv(cwd: string, command: string, env?: NodeJS.ProcessEnv): Promise<void> {
        return new Promise((resolve, reject) => {
            this.outputChannel.appendLine(`Running: ${command}`);
            this.outputChannel.appendLine(`Working directory: ${cwd}\n`);

            const terminal = vscode.window.createTerminal({
                name: 'DBT Setup',
                cwd: cwd,
                env: env
            });

            terminal.show();
            terminal.sendText(command);

            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }
}
