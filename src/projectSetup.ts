import * as vscode from 'vscode';
import * as path from 'path';
import { SnowflakeConfig } from './types';

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

        const snowflakeConfig = await this.getSnowflakeConfig();
        if (!snowflakeConfig) {
            return;
        }

        const env = {
            ...process.env,
            DBT_ACCOUNT: snowflakeConfig.account,
            DBT_USER: snowflakeConfig.user,
            DBT_PVK_PATH: snowflakeConfig.privateKeyPath,
            DBT_PVK_PASS: snowflakeConfig.privateKeyPassphrase || ''
        };

        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine('Running pre-commit checks...');
        this.outputChannel.appendLine(`Workspace: ${workspaceRoot}`);
        this.outputChannel.appendLine(`Configuration: ${snowflakeConfig.name}`);
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

    private async getSnowflakeConfig(): Promise<SnowflakeConfig | undefined> {
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
