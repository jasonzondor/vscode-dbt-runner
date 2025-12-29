# DBT Runner VS Code Extension

A VS Code extension for managing and running dbt projects with Snowflake key pair authentication support. Designed for data engineering teams working with multiple independent dbt core projects.

## Features

- **Automated Project Setup**: Automatically run `poetry lock`, `poetry install`, and `dbt deps` when opening a dbt project
- **Interactive DBT Command Runner**: Execute dbt commands with guided prompts for:
  - Environment selection (dev, prod, etc.)
  - DBT command selection (run, build, test, seed, etc.)
  - Additional parameters (e.g., `--full-refresh`, `--select model_name`)
- **Snowflake Key Pair Authentication**: Configure multiple Snowflake accounts with key pair authentication
- **Keyboard Shortcuts**: Quick access to dbt commands via `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` in VS Code to open a new window with the extension loaded

### From VSIX

1. Package the extension:
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```
2. Install the `.vsix` file in VS Code:
   - Open VS Code
   - Go to Extensions view (`Ctrl+Shift+X`)
   - Click the `...` menu → `Install from VSIX...`
   - Select the generated `.vsix` file

## Configuration

### Snowflake Accounts

#### Option 1: Interactive Setup (Recommended)

The easiest way to add Snowflake accounts:

1. Open Command Palette: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type **"DBT: Add Snowflake Account"**
3. Follow the prompts to enter:
   - Account display name
   - Snowflake username
   - Private key file path
   - Whether to store passphrase (or be prompted at runtime)

**Additional Commands:**
- **"DBT: List Snowflake Accounts"** - View all configured accounts
- **"DBT: Remove Snowflake Account"** - Remove an account

#### Option 2: Manual JSON Configuration

Alternatively, edit settings.json directly:

1. Open Settings: `Ctrl+,` (or `Cmd+,` on Mac)
2. Search for **"DBT Runner"**
3. Click **"Edit in settings.json"** next to `Snowflake Accounts`

```json
{
  "dbtRunner.snowflakeAccounts": [
    {
      "name": "Development",
      "user": "your_snowflake_username",
      "privateKeyPath": "/absolute/path/to/private_key.p8",
      "privateKeyPassphrase": ""
    },
    {
      "name": "Production",
      "user": "prod_user",
      "privateKeyPath": "/absolute/path/to/prod_key.p8",
      "privateKeyPassphrase": ""
    }
  ]
}
```

**Field Descriptions:**
- **`name`** (required): Display name for the account
- **`user`** (required): Your Snowflake username
- **`privateKeyPath`** (required): Absolute path to your `.p8` private key file
- **`privateKeyPassphrase`** (optional): Leave empty (`""`) to be prompted at runtime

### Environments

Configure your dbt target environments (must match targets in your `profiles.yml`):

```json
{
  "dbtRunner.environments": ["dev", "prod", "staging"]
}
```

### Other Settings

- **`dbtRunner.dbtProjectPath`**: Relative path to dbt project directory from workspace root (default: `"dbt"`)
- **`dbtRunner.autoSetupOnOpen`**: Automatically run setup when opening a dbt project (default: `false`)

## Usage

### Setup Project

Run the setup command to install dependencies:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "DBT: Setup Project"
3. This will run:
   - `poetry lock`
   - `poetry install`
   - `poetry run dbt deps`

### Run DBT Commands

1. Use keyboard shortcut `Ctrl+Shift+D` (or `Cmd+Shift+D`)
   - OR open Command Palette and type "DBT: Run DBT Command"
2. Select the environment (dev, prod, etc.)
3. Select the dbt command (run, build, test, etc.)
4. Enter any additional parameters (optional)
5. Select the Snowflake account (if multiple configured)
6. Enter private key passphrase (if not configured)

The command will execute in a new terminal with the appropriate environment variables set.

## Project Structure

Your dbt projects should follow this structure:

```
your-project/
├── pyproject.toml          # Poetry configuration
├── dbt/                    # DBT project directory
│   ├── dbt_project.yml
│   ├── profiles/
│   │   └── profiles.yml
│   ├── models/
│   ├── seeds/
│   └── ...
```

## Environment Variables

The extension sets the following environment variables when running dbt commands:

- `DBT_USER`: Snowflake username from configuration
- `DBT_PVK_PATH`: Path to private key file
- `DBT_PVK_PASS`: Private key passphrase

These should match the environment variables referenced in your `profiles.yml`:

```yaml
outputs:
  dev:
    type: snowflake
    user: "{{ env_var('DBT_USER') }}"
    private_key_path: "{{ env_var('DBT_PVK_PATH') }}"
    private_key_passphrase: "{{ env_var('DBT_PVK_PASS') }}"
```

## Commands

### DBT Operations
- **DBT: Run DBT Command** (`dbt-runner.runDbt`): Execute a dbt command with interactive prompts
- **DBT: Setup Project** (`dbt-runner.setupProject`): Run poetry install and dbt deps

### Account Management
- **DBT: Add Snowflake Account** (`dbt-runner.addSnowflakeAccount`): Interactively add a new Snowflake account
- **DBT: Remove Snowflake Account** (`dbt-runner.removeSnowflakeAccount`): Remove an existing Snowflake account
- **DBT: List Snowflake Accounts** (`dbt-runner.listSnowflakeAccounts`): View all configured accounts

## Requirements

- VS Code 1.85.0 or higher
- Poetry installed on your system
- dbt-core and dbt-snowflake (managed via Poetry)
- Snowflake private key for authentication

## Troubleshooting

### Extension not activating

Make sure your workspace contains a `pyproject.toml` file. The extension activates when it detects a Poetry project.

### Commands not appearing

Try reloading VS Code (`Developer: Reload Window` from Command Palette).

### Authentication errors

Verify that:
- Your private key path is correct
- Your private key passphrase is correct
- Your Snowflake user has the appropriate permissions
- Your `profiles.yml` references the correct environment variables

## Development

### Building

```bash
npm install
npm run compile
```

### Watching for changes

```bash
npm run watch
```

### Running tests

```bash
npm test
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
