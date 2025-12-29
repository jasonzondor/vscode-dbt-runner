import * as vscode from 'vscode';
import * as path from 'path';
import { DbtRunner } from './dbtRunner';
import { ProjectSetup } from './projectSetup';
import { ConfigManager } from './configManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('DBT Runner extension is now active');

    const dbtRunner = new DbtRunner();
    const projectSetup = new ProjectSetup();
    const configManager = new ConfigManager();

    const runDbtCommand = vscode.commands.registerCommand('dbt-runner.runDbt', async () => {
        await dbtRunner.runDbtCommand();
    });

    const setupProjectCommand = vscode.commands.registerCommand('dbt-runner.setupProject', async () => {
        await projectSetup.setupProject();
    });

    const addSnowflakeAccountCommand = vscode.commands.registerCommand('dbt-runner.addSnowflakeAccount', async () => {
        await configManager.addSnowflakeAccount();
    });

    const removeSnowflakeAccountCommand = vscode.commands.registerCommand('dbt-runner.removeSnowflakeAccount', async () => {
        await configManager.removeSnowflakeAccount();
    });

    const listSnowflakeAccountsCommand = vscode.commands.registerCommand('dbt-runner.listSnowflakeAccounts', async () => {
        await configManager.listSnowflakeAccounts();
    });

    context.subscriptions.push(
        runDbtCommand, 
        setupProjectCommand,
        addSnowflakeAccountCommand,
        removeSnowflakeAccountCommand,
        listSnowflakeAccountsCommand
    );

    if (vscode.workspace.workspaceFolders) {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const autoSetup = config.get<boolean>('autoSetupOnOpen', false);
        
        if (autoSetup) {
            checkAndSetupProject(projectSetup);
        }
    }

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const autoSetup = config.get<boolean>('autoSetupOnOpen', false);
        
        if (autoSetup && vscode.workspace.workspaceFolders) {
            checkAndSetupProject(projectSetup);
        }
    });
}

async function checkAndSetupProject(projectSetup: ProjectSetup) {
    if (!vscode.workspace.workspaceFolders) {
        return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');

    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(pyprojectPath));
        const answer = await vscode.window.showInformationMessage(
            'DBT project detected. Would you like to run poetry install and dbt deps?',
            'Yes', 'No'
        );
        
        if (answer === 'Yes') {
            await projectSetup.setupProject();
        }
    } catch {
        // pyproject.toml doesn't exist, skip
    }
}

export function deactivate() {}
