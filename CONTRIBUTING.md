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

### Creating a Release

1. Update the version in `package.json`

2. Commit the version change:
   ```bash
   git add package.json
   git commit -m "Bump version to X.Y.Z"
   git push
   ```

3. Create and push a tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. The release workflow will automatically:
   - Build the extension
   - Create a GitHub release
   - Attach the `.vsix` file to the release

### CI/CD Workflows

**CI Workflow (`.github/workflows/ci.yml`):**
- Runs on every push to `main` and on all pull requests
- Compiles TypeScript
- Runs linter
- Packages the extension
- Uploads VSIX as an artifact (available for 30 days)

**Release Workflow (`.github/workflows/release.yml`):**
- Runs when you push a tag starting with `v` (e.g., `v0.1.0`)
- Builds and packages the extension
- Creates a GitHub release with the VSIX file attached
- Generates release notes automatically

## Code Quality

Before submitting a PR, ensure:
- [ ] Code compiles without errors: `npm run compile`
- [ ] Linter passes: `npm run lint`
- [ ] Extension packages successfully: `npx vsce package`
- [ ] You've tested the changes locally

## Questions?

If you have questions about contributing, please open an issue on GitHub.
