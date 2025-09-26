# Kustomize Version Bump Action

GitHub Actions TypeScript for automatically bumping Kustomize project versions using `.version` files.

## Description

This action automatically manages version bumping for Kustomize projects by:

- Reading or creating `.version` files in Kustomize project directories
- Comparing versions between branches 
- Automatically bumping patch versions when needed
- Committing and pushing version changes

## Usage

This action is designed to work with modified Kustomize projects detected through file changes. It:

1. Identifies modified Kustomize projects (containing `kustomization.yaml` or `kustomization.yml`)
2. Checks if a `.version` file exists (creates one with `0.0.1` if missing)
3. Compares the current version with the base branch version
4. Automatically bumps patch version if current <= base branch version
5. Creates git commits for version changes

## Version File Format

The `.version` file should contain a semantic version string:
```
1.2.3
```

## Inputs

The action uses the same environment variables as the helm-chart version-bump:

- `BRANCH_NAME`: Current branch name
- `BASE_BRANCH_NAME`: Base branch to compare against  
- `SOURCE_GIT_REPO_URL`: Source repository URL
- `TARGET_GIT_REPO_URL`: Target repository URL
- `GITHUB_WORKSPACE`: GitHub workspace directory
- `TOKEN`: GitHub token (optional)

## Features

- **Automatic Version Detection**: Creates `.version` files with `0.0.1` if they don't exist
- **Smart Version Bumping**: Only bumps versions when current <= base branch version
- **Version Control Integration**: Automatically commits and pushes changes
- **Flexible Configuration**: Can be disabled per-project using `.ci.config.yaml`
- **Comprehensive Reporting**: Provides detailed summary tables of version changes

## Configuration

Version bumping can be disabled for specific projects by adding to `.ci.config.yaml`:

```yaml
kustomize-version-bump:
  enable: false
```

## Comparison to Helm Chart Version Bump

This action mirrors the functionality of the helm-chart version-bump but is adapted for Kustomize projects:

- Uses `.version` files instead of `Chart.yaml` version fields
- Detects Kustomize projects via `kustomization.yaml`/`kustomization.yml` files
- Maintains the same git workflow and version comparison logic

## License

Apache-2.0
