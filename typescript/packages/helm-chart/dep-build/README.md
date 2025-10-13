# Helm Chart Dependency Build Action

GitHub Actions TypeScript for automatically building and updating Helm Chart dependencies.

## Description

This action automatically manages Helm Chart dependencies by:

- Reading Helm Chart projects from the repository listing
- Building and updating dependencies for each chart using `helm dependency update`
- Providing comprehensive reporting of dependency build results
- Supporting configurable dependency management per chart

## Usage

This action is designed to work with all Helm Charts discovered through the chart listing system. It:

1. Identifies all Helm Chart projects via the helm chart listing file
2. Iterates through each chart directory
3. Executes `helm dependency update` for charts with dependencies
4. Reports success/failure status for each chart
5. Provides detailed summary tables of build results

## Dependency Management

The action works with Helm Charts that have a `Chart.yaml` file containing dependency declarations:
```yaml
apiVersion: v2
name: my-chart
version: 1.2.3
dependencies:
  - name: mysql
    version: 9.4.1
    repository: https://charts.bitnami.com/bitnami
  - name: redis
    version: 17.3.7
    repository: https://charts.bitnami.com/bitnami
```

## Inputs

The action uses the following environment variables:

- `GITHUB_WORKSPACE`: GitHub workspace directory (required)

## Features

- **Automatic Discovery**: Uses helm chart listing files for project discovery
- **Dependency Resolution**: Executes `helm dependency update` to fetch and update chart dependencies
- **Flexible Configuration**: Can be disabled per-chart using `.ci.config.yaml`
- **Comprehensive Reporting**: Provides detailed summary tables of dependency build results
- **Error Handling**: Captures and reports dependency resolution failures

## Configuration

Dependency building can be disabled for specific charts by adding to `.ci.config.yaml`:

```yaml
helm-chart-dependency-update:
  enable: true
```

## Build Process

The action performs the following dependency operations:

1. **Chart Discovery**: Reads the helm chart listing to find all charts
2. **Dependency Check**: Verifies if charts have dependency requirements
3. **Dependency Update**: Executes `helm dependency update` for each chart
4. **Result Reporting**: Captures success/failure status and outputs summary

## Workflow Integration

The action integrates with CI/CD pipelines by:

- Processing all charts in the repository automatically
- Providing clear success/failure indicators
- Generating summary reports for build status
- Supporting selective chart processing via configuration

## Result Status Indicators

- **✅**: Dependency update completed successfully
- **❗**: Dependency update disabled via configuration

## Dependencies

- `@actions/core`: GitHub Actions core functionality
- `yaml`: YAML file parsing and manipulation
- Custom shared utilities for Helm Chart management and discovery
- Helm CLI tool for dependency management operations

## Chart Discovery

This action relies on the helm-chart listing package to discover charts in the repository. Please refer to the [helm-chart listing documentation](../listing/README.md) for details on how charts are discovered and listed.
