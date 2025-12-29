# Contributing to DBT Runner

## Branch Protection Setup

To protect the main branch and ensure code quality, follow these steps in your GitHub repository:

### Setting Up Branch Protection Rules

1. Go to your GitHub repository
2. Click **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule**
4. Configure the following settings:

#### Branch name pattern
```
main
```
(or `master` if that's your default branch)

#### Protection Settings

**Require a pull request before merging:**
- ✅ Enable this option
- ✅ Require approvals: Set to 1 (or more for team environments)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (optional, if you have a CODEOWNERS file)

**Require status checks to pass before merging:**
- ✅ Enable this option
- ✅ Require branches to be up to date before merging
- Search and select: `build` (this is the job name from `.github/workflows/ci.yml`)

**Require conversation resolution before merging:**
- ✅ Enable this option (ensures all PR comments are resolved)

**Do not allow bypassing the above settings:**
- ✅ Enable this option (even admins must follow the rules)

**Restrict who can push to matching branches:**
- Optional: Add specific users/teams who can push directly (usually leave empty)

5. Click **Create** or **Save changes**

### Additional Recommendations

**Enable Required Workflows:**
- The CI workflow will automatically run on all PRs
- The build must pass before merging is allowed

**Enable Dependabot:**
1. Go to **Settings** → **Security** → **Code security and analysis**
2. Enable **Dependabot alerts**
3. Enable **Dependabot security updates**

**Add CODEOWNERS file (optional):**
Create `.github/CODEOWNERS` to automatically request reviews from specific people:
```
# Default owners for everything in the repo
* @your-github-username

# Specific paths
/src/ @your-github-username
/.github/ @your-github-username
```

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
