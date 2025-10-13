# Helm Chart Version Bump Action

GitHub Actions TypeScript for automatically bumping Helm Chart versions using `Chart.yaml` files.

## Description

This action automatically manages version bumping for Helm Chart projects by:

- Reading `Chart.yaml` files in Helm Chart project directories
- Comparing versions between branches 
- Automatically bumping patch versions when needed
- Committing and pushing version changes

## Usage

This action is designed to work with modified Helm Chart projects detected through file changes. It:

1. Identifies modified Helm Chart projects (containing `Chart.yaml`)
2. Reads the current version from `Chart.yaml` 
3. Compares the current version with the base branch version
4. Automatically bumps patch version if current <= base branch version
5. Creates git commits for version changes

## Chart.yaml Version Format

The `Chart.yaml` file should contain a semantic version in the version field:
```yaml
apiVersion: v2
name: my-chart
version: 1.2.3
# ... other chart metadata
```

## Inputs

The action uses the following environment variables:

- `BRANCH_NAME`: Current branch name
- `BASE_BRANCH_NAME`: Base branch to compare against  
- `SOURCE_GIT_REPO_URL`: Source repository URL
- `TARGET_GIT_REPO_URL`: Target repository URL
- `GITHUB_WORKSPACE`: GitHub workspace directory
- `TOKEN`: GitHub token (optional)

## Features

- **Automatic Version Detection**: Reads versions from existing `Chart.yaml` files
- **Smart Version Bumping**: Only bumps versions when current <= base branch version
- **Version Control Integration**: Automatically commits and pushes changes
- **Flexible Configuration**: Can be disabled per-project using `.ci.config.yaml`
- **Comprehensive Reporting**: Provides detailed summary tables of version changes
- **Chart Discovery**: Uses helm chart listing files for project discovery

## Configuration

Version bumping can be disabled for specific projects by adding to `.ci.config.yaml`:

```yaml
helm-chart-version-bump:
  enable: false
```

## Version Comparison Logic

The action performs semantic version comparison:

- **✅ Okay**: Local version is already greater than base branch version (no action needed)
- **✳️ Bumped**: Local version was automatically bumped by patch version
- **❇️ New**: Chart doesn't exist on base branch, using local version
- **❗ Uncommon**: Major/minor version increases (manual review recommended)
- **➖ Disabled**: Version bump feature disabled via configuration

## Workflow Integration

The action integrates seamlessly with Git workflows:

1. Detects modified files between branches using `git diff`
2. Identifies Helm Charts through `Chart.yaml` presence
3. Compares versions using `git show` to read base branch Chart.yaml
4. Updates Chart.yaml files with new versions
5. Commits changes with descriptive commit messages
6. Pushes changes to the repository

## Comparison to Kustomize Version Bump

This action mirrors the functionality of the kustomize version-bump but is adapted for Helm Charts:

- Uses `Chart.yaml` version fields instead of `.version` files
- Detects Helm Charts via `Chart.yaml` files
- Leverages Helm chart listing files for project discovery
- Maintains the same git workflow and version comparison logic

## Dependencies

- `@actions/core`: GitHub Actions core functionality
- `semver`: Semantic version parsing and comparison
- `yaml`: YAML file parsing and manipulation
- Custom shared utilities for Git operations and Helm Chart management

## License

Apache-2.0