import * as vscode from 'vscode';
import { SnowflakeConfig } from './types';

export class ConfigManager {
    async addSnowflakeAccount(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a display name for this Snowflake account',
            placeHolder: 'e.g., Development, Production, Staging',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Account name is required';
                }
                return null;
            }
        });

        if (!name) {
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

        const newAccount: SnowflakeConfig = {
            name: name.trim(),
            user: user.trim(),
            privateKeyPath: privateKeyPath.trim(),
            privateKeyPassphrase
        };

        const config = vscode.workspace.getConfiguration('dbtRunner');
        const accounts = config.get<SnowflakeConfig[]>('snowflakeAccounts', []);

        const existingIndex = accounts.findIndex(acc => acc.name === newAccount.name);
        if (existingIndex >= 0) {
            const overwrite = await vscode.window.showWarningMessage(
                `An account named "${newAccount.name}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );

            if (overwrite !== 'Yes') {
                return;
            }

            accounts[existingIndex] = newAccount;
        } else {
            accounts.push(newAccount);
        }

        await config.update('snowflakeAccounts', accounts, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(
            `Snowflake account "${newAccount.name}" has been ${existingIndex >= 0 ? 'updated' : 'added'} successfully!`
        );
    }

    async removeSnowflakeAccount(): Promise<void> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const accounts = config.get<SnowflakeConfig[]>('snowflakeAccounts', []);

        if (accounts.length === 0) {
            vscode.window.showInformationMessage('No Snowflake accounts configured.');
            return;
        }

        const accountNames = accounts.map(acc => acc.name);
        const selected = await vscode.window.showQuickPick(accountNames, {
            placeHolder: 'Select account to remove',
            canPickMany: false
        });

        if (!selected) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to remove the account "${selected}"?`,
            'Yes', 'No'
        );

        if (confirm !== 'Yes') {
            return;
        }

        const updatedAccounts = accounts.filter(acc => acc.name !== selected);
        await config.update('snowflakeAccounts', updatedAccounts, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`Snowflake account "${selected}" has been removed.`);
    }

    async listSnowflakeAccounts(): Promise<void> {
        const config = vscode.workspace.getConfiguration('dbtRunner');
        const accounts = config.get<SnowflakeConfig[]>('snowflakeAccounts', []);

        if (accounts.length === 0) {
            vscode.window.showInformationMessage('No Snowflake accounts configured. Use "DBT: Add Snowflake Account" to add one.');
            return;
        }

        const accountInfo = accounts.map(acc => 
            `**${acc.name}**\n  User: ${acc.user}\n  Key: ${acc.privateKeyPath}\n  Passphrase: ${acc.privateKeyPassphrase ? '***' : '(prompt at runtime)'}`
        ).join('\n\n');

        const panel = vscode.window.createWebviewPanel(
            'snowflakeAccounts',
            'Snowflake Accounts',
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
                <h1>Configured Snowflake Accounts</h1>
                ${accounts.map(acc => `
                    <div class="account">
                        <div class="account-name">${acc.name}</div>
                        <div class="account-detail"><span class="label">User:</span> ${acc.user}</div>
                        <div class="account-detail"><span class="label">Private Key:</span> ${acc.privateKeyPath}</div>
                        <div class="account-detail"><span class="label">Passphrase:</span> ${acc.privateKeyPassphrase ? '***' : '(prompt at runtime)'}</div>
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }
}
