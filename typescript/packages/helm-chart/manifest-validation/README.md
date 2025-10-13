# Helm Chart Manifest Validation Action

GitHub Actions TypeScript for validating the generated Kubernetes manifests of Helm Charts.

## Description

This action automatically validates Helm Chart manifest generation and output by rendering Helm Chart templates into Kubernetes manifests.
- Validating generated manifests against Kubernetes API specifications
- Testing template rendering with various value configurations
- Providing comprehensive validation reporting for manifest correctness

## Usage

This action is designed to work with all Helm Charts discovered through the chart listing system. It:

1. Identifies all Helm Chart projects via the helm chart listing file
2. Renders chart templates using `helm template` with various value sets
5. Reports validation results

## Inputs

The action uses the following environment variables:

- `GITHUB_WORKSPACE`: GitHub workspace directory (required)

## Configuration

Manifest validation can be customized per chart using `.ci.config.yaml`:

```yaml
helm-chart-validation:
  enable: true # default is true, even if you do NOT declare this feature flag!
  options:
    --skip-crds: false # if set, no CRDs will be installed. By default, CRDs are installed if not already present (default false)
    --skip-tests: false # skip tests from templated output (default false)
    --include-crds: false # include CRDs in the templated output (default false)
    --debug: false # enable verbose output (default false)
    --dependency-update: true # update dependencies if they are missing before installing the chart (default true)
```

## Result Status Indicators

- **✅**: Manifest validation completed successfully
- **❗**: Validation disabled via configuration  

## Dependencies

- `@actions/core`: GitHub Actions core functionality
- `yaml`: YAML file parsing and manipulation
- `path`: File path utilities
- Custom shared utilities for Helm Chart management and discovery
- Helm CLI tool for template rendering and validation
- Kubernetes schema validation tools (kubectl or similar)

## Chart Discovery

This action relies on the helm-chart listing package to discover charts in the repository. Please refer to the [helm-chart listing documentation](../listing/README.md) for details on how charts are discovered and listed.
