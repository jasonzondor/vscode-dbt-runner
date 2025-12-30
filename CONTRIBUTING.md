# Contributing to VS Code DBT Runner

## Development Workflow

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

5. Wait for CI checks to pass

6. Request review (if required)

7. Merge after approval and passing checks

### Commit Message Convention

This project uses **Conventional Commits** for automated releases. Your commit messages should follow this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature (triggers minor version bump)
- `fix`: Bug fix (triggers patch version bump)
- `perf`: Performance improvement (triggers patch version bump)
- `refactor`: Code refactoring (triggers patch version bump)
- `docs`: Documentation changes (no release)
- `style`: Code style changes (no release)
- `test`: Test changes (no release)
- `chore`: Maintenance tasks (no release)
- `ci`: CI/CD changes (no release)

**Breaking Changes:**
- Add `BREAKING CHANGE:` in the footer or `!` after type (triggers major version bump)

**Examples:**
```bash
feat: add pre-commit checks command
fix: set environment variables for pre-commit
feat!: change configuration structure (breaking change)
docs: update README with new screenshots
```

### Automated Releases

Releases are **fully automated** using semantic-release:

1. **Merge to main/master**: When a PR is merged to the main branch, the release workflow automatically:
   - Analyzes commit messages since the last release
   - Determines the next version (major, minor, or patch)
   - Updates `package.json` version
   - Generates `CHANGELOG.md`
   - Creates a Git tag
   - Builds and packages the `.vsix` file
   - Creates a GitHub Release with the VSIX attached
   - Commits the version bump back to the repository

2. **No manual versioning needed**: Don't manually update `package.json` version - semantic-release handles this automatically based on your commit messages.

3. **Skip release**: Add `[skip ci]` to your commit message if you don't want to trigger a release.

### CI/CD Workflows

**CI Workflow (`.github/workflows/ci.yml`):**
- Runs on every push to `main` and on all pull requests
- Compiles TypeScript
- Runs linter
- Packages the extension
- Uploads VSIX as an artifact (available for 30 days)

**Release Workflow (`.github/workflows/release.yml`):**
- Runs automatically on every push to `main`/`master`
- Uses semantic-release to determine if a release is needed
- Automatically versions, tags, and publishes releases
- Generates release notes from commit messages
- Attaches VSIX file to GitHub Release

## Code Quality

Before submitting a PR, ensure:
- [ ] Code compiles without errors: `npm run compile`
- [ ] Linter passes: `npm run lint`
- [ ] Extension packages successfully: `npx vsce package`
- [ ] You've tested the changes locally

## Questions?

If you have questions about contributing, please open an issue on GitHub.
