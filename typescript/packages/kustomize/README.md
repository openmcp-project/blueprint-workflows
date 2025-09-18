# Kustomize Packages

This directory contains TypeScript packages for working with Kustomize projects in GitHub Actions workflows.

## Packages

### kustomize/listing
- **Purpose**: Discovers and catalogs all Kustomize projects in a repository
- **Functionality**: Searches for `kustomization.yaml` and `kustomization.yml` files and creates a comprehensive listing
- **Output**: `kustomize-listing.yaml` file with project metadata

### kustomize/manifest-validation
- **Purpose**: Validates Kustomize project manifests can be built successfully
- **Functionality**: Runs `kustomize build` on each discovered project to ensure they generate valid Kubernetes manifests
- **Dependencies**: Requires `kustomize` CLI tool to be installed

## Architecture

These packages follow the same pattern as the existing helm-chart packages:
- Use the shared utilities and constants from `../shared`
- Provide GitHub Actions-compatible TypeScript actions
- Generate summary reports and artifacts
- Support CI/CD pipeline integration

## Usage

1. **kustomize-listing**: Run first to discover all Kustomize projects
2. **kustomize-manifest-validation**: Run after listing to validate discovered projects

## Dependencies

- Node.js >= 21
- kustomize CLI (for manifest validation)
- GitHub Actions environment

## Development

Each package includes:
- `package.json` with scripts for building, testing, and linting
- TypeScript source code in `src/`
- Jest tests in `__test__/`
- Build output in `dist/` (generated)

## Integration

These packages integrate with the existing workflow system and use shared constants and utilities for consistency with the helm-chart packages.
