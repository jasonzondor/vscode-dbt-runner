import * as vscode from 'vscode';
import { ProfileConfig } from './types';

export class ConfigManager {
    async addProfileConfig(): Promise<void> {
        const profileTarget = await vscode.window.showInputBox({
            prompt: 'Enter the dbt profile target name',
            placeHolder: 'e.g., dev, prod, staging',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Profile target is required';
                }
                return null;
            }
        });

        if (!profileTarget) {
            return;
        }

        const user = await vscode.window.showInputBox({
            prompt: 'Enter your Snowflake username',
            placeHolder: 'e.g., john.doe',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Username is required';
                }
                return null;
            }
        });

        if (!user) {
            return;
        }

        const privateKeyPath = await vscode.window.showInputBox({
            prompt: 'Enter the absolute path to your private key file',
            placeHolder: 'e.g., /home/user/.ssh/snowflake_key.p8',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Private key path is required';
                }
                if (!value.startsWith('/') && !value.match(/^[A-Z]:\\/)) {
                    return 'Please provide an absolute path';
                }
                return null;
            }
        });

        if (!privateKeyPath) {
            return;
        }

        const includePassphrase = await vscode.window.showQuickPick(
            [
                { label: 'No - Prompt me at runtime (recommended)', value: false },
                { label: 'Yes - Store passphrase in settings', value: true }
            ],
            {
                placeHolder: 'Do you want to store the private key passphrase in settings?'
            }
        );

        if (!includePassphrase) {
            return;
        }

        let privateKeyPassphrase = '';
        if (includePassphrase.value) {
            const passphrase = await vscode.window.showInputBox({
                prompt: 'Enter your private key passphrase',
                password: true,
                placeHolder: 'Leave empty if no passphrase'
            });

            if (passphrase === undefined) {
                return;
            }

            privateKeyPassphrase = passphrase;
        }

        const newConfig: ProfileConfig = {
            profileTarget: profileTarget.trim(),
            user: user.trim(),
            privateKeyPath: privateKeyPath.trim(),
            privateKeyPassphrase
        };

        const config = vscode.workspace.getConfiguration('dbtRunner');
        const configs = config.get<ProfileConfig[]>('profileConfigs', []);

        const existingIndex = configs.findIndex(cfg => cfg.profileTarget === newConfig.profileTarget);
        if (existingIndex >= 0) {
            const overwrite = await vscode.window.showWarningMessage(
                `A configuration for profile target "${newConfig.profileTarget}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );

            if (overwrite !== 'Yes') {
                return;
            }

            configs[existingIndex] = newConfig;
        } else {
            configs.push(newConfig);
        }

        await config.update('profileConfigs', configs, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(
            `Profile configuration "${newConfig.profileTarget}" has been ${existingIndex >= 0 ? 'updated' : 'added'} successfully!`
        );
    }

    async removeProfileConfig(): Promise<void> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const configs = config.get<ProfileConfig[]>('profileConfigs', []);

        if (configs.length === 0) {
            vscode.window.showInformationMessage('No profile configurations found.');
            return;
        }

        const profileTargets = configs.map(cfg => cfg.profileTarget);
        const selected = await vscode.window.showQuickPick(profileTargets, {
            placeHolder: 'Select profile configuration to remove',
            canPickMany: false
        });

        if (!selected) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to remove the configuration for profile target "${selected}"?`,
            'Yes', 'No'
        );

        if (confirm !== 'Yes') {
            return;
        }

        const updatedConfigs = configs.filter(cfg => cfg.profileTarget !== selected);
        await config.update('profileConfigs', updatedConfigs, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`Profile configuration "${selected}" has been removed.`);
    }

    async listProfileConfigs(): Promise<void> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const configs = config.get<ProfileConfig[]>('profileConfigs', []);

        if (configs.length === 0) {
            vscode.window.showInformationMessage('No profile configurations found. Use "DBT Runner: Add Profile Configuration" to add one.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'profileConfigs',
            'Profile Configurations',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                    }
                    h1 { color: var(--vscode-foreground); }
                    .account {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        padding: 15px;
                        margin: 10px 0;
                        border-radius: 4px;
                    }
                    .account-name { 
                        font-weight: bold;
                        font-size: 1.1em;
                        margin-bottom: 8px;
                    }
                    .account-detail {
                        margin: 4px 0;
                        color: var(--vscode-descriptionForeground);
                    }
                    .label { font-weight: 600; }
                </style>
            </head>
            <body>
                <h1>Configured Profile Targets</h1>
                ${configs.map(cfg => `
                    <div class="account">
                        <div class="account-name">${cfg.profileTarget}</div>
                        <div class="account-detail"><span class="label">User:</span> ${cfg.user}</div>
                        <div class="account-detail"><span class="label">Private Key:</span> ${cfg.privateKeyPath}</div>
                        <div class="account-detail"><span class="label">Passphrase:</span> ${cfg.privateKeyPassphrase ? '***' : '(prompt at runtime)'}</div>
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }
}
