# Helm Chart Linting Action

GitHub Actions TypeScript for automatically linting and validating Helm Charts.

## Description

This action automatically performs comprehensive linting and validation of Helm Charts by:

- Running `helm lint` on all discovered chart directories
- Validating chart structure, templates, and metadata
- Supporting configurable linting options and rules
- Providing detailed linting results and error reporting

## Usage

This action is designed to work with all Helm Charts discovered through the chart listing system. It:

1. Identifies all Helm Chart projects via the helm chart listing file
2. Executes `helm lint` with configurable options for each chart
3. Validates chart templates, values, and metadata structure
4. Reports linting results with detailed error messages
5. Provides comprehensive summary of validation status

## Linting Process

The action works with standard Helm Chart structures containing:
```
my-chart/
├── Chart.yaml          # Chart metadata
├── values.yaml         # Default values
├── templates/          # Template directory
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl
└── charts/            # Chart dependencies (optional)
```

## Inputs

The action uses the following environment variables:

- `GITHUB_WORKSPACE`: GitHub workspace directory (required)

## Configuration

Linting behavior can be customized per chart using `.ci.config.yaml`:

```yaml
helm-chart-linting:
  enable: true # default is true, even if you do NOT declare this feature flag!
  options:
    --strict: true # fail on lint warnings (default true)
    --with-subcharts: false # lint dependent charts (default true)
```

## Validation Categories

The helm lint process validates:

1. **Chart Structure**: Proper directory structure and required files
2. **Metadata Validation**: Chart.yaml completeness and format
3. **Template Syntax**: Kubernetes YAML template validity
4. **Value References**: Template variable references and defaults
5. **Resource Definitions**: Kubernetes resource specification compliance

## Workflow Integration

The action integrates with quality assurance workflows by:

- Processing all charts in the repository automatically
- Failing builds on linting errors (configurable)
- Providing detailed error context for debugging
- Supporting selective chart processing via configuration

## Result Status Indicators

- **✅**: Linting completed successfully with no errors
- **❗**: Linting disabled via configuration
- **❌**: Linting failed with validation errors
- **⚠️**: Linting completed with warnings

## Error Handling

When linting fails, the action provides:

- Detailed error messages from helm lint output
- File and line number references where possible
- Categorized validation failures by type
- Actionable guidance for fixing common issues

## Dependencies

- `@actions/core`: GitHub Actions core functionality
- `yaml`: YAML file parsing and manipulation
- Custom shared utilities for Helm Chart management and discovery
- Helm CLI tool for chart linting and validation

## Chart Discovery

This action relies on the helm-chart listing package to discover charts in the repository. Please refer to the [helm-chart listing documentation](../listing/README.md) for details on how charts are discovered and listed.
