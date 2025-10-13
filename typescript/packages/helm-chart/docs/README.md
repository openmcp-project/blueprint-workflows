# Helm Chart Documentation Generation Action

GitHub Actions TypeScript for automatically creating Helm Chart README.md documentation from values.yaml files.

## Description

This action automatically generates comprehensive documentation for Helm Charts by:

- Analyzing `values.yaml` files to extract configuration parameters
- Generating structured README.md documentation with parameter descriptions
- Supporting configurable documentation options and templates
- Providing automated documentation updates for chart maintenance

## Usage

This action is designed to work with all Helm Charts discovered through the chart listing system. It:

1. Identifies all Helm Chart projects via the helm chart listing file
2. Reads `values.yaml` files and existing documentation templates
3. Generates or updates README.md files with parameter documentation
4. Supports custom documentation formatting and dependency documentation
5. Reports generation status for each chart

## Documentation Generation

The action works with Helm Charts that have `values.yaml` files containing configuration parameters:
```yaml
# Default values for my-chart
replicaCount: 1

image:
  repository: nginx
  tag: "1.21"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
```

Generated documentation includes parameter tables, descriptions, and default values extracted from comments and structure.

## Inputs

The action uses the following environment variables:

- `GITHUB_WORKSPACE`: GitHub workspace directory (required)

## Features

- **Automatic Parameter Extraction**: Reads and analyzes values.yaml files
- **Structured Documentation**: Generates well-formatted README.md files with parameter tables
- **Dependency Documentation**: Optional inclusion of dependency values documentation
- **Flexible Configuration**: Configurable documentation options per chart
- **Template Support**: Works with existing documentation templates and formatting
- **Comprehensive Reporting**: Provides detailed summary of documentation generation results

## Configuration

Documentation generation can be customized per chart using `.ci.config.yaml`:

```yaml
helm-docs:
  enable: true # default is true, even if you do NOT declare this feature flag!
  options:
    --badge-style: "flat-square" # badge style to use for charts (default "flat-square")
    --document-dependency-values: true # For charts with dependencies, include the dependency values in the chart values documentation
    --documentation-strict-mode: false # Fail the generation of docs if there are undocumented values
    --skip-version-footer: false # if true the helm-docs version footer will not be shown in the default README template
    --sort-values-order: "file" # order in which to sort the values table ("alphanum" or "file") (default "alphanum")
    --output-file: "README.md" #  markdown file path relative to each chart directory to which rendered documentation will be written (default "README.md")
```

## Documentation Process

The action performs the following documentation operations:

1. **Chart Discovery**: Reads the helm chart listing to find all charts
2. **Values Analysis**: Parses values.yaml files for parameters and structure
3. **Template Processing**: Uses helm-docs or similar tools to generate documentation
4. **README Generation**: Creates or updates README.md files with formatted parameter tables
5. **Result Reporting**: Captures generation status and outputs summary

## Output Format

Generated README.md files typically include:

- Chart overview and description
- Installation instructions
- Parameter tables with names, descriptions, types, and default values
- Usage examples and configuration guidance
- Dependency information (when enabled)

## Workflow Integration

The action integrates with documentation workflows by:

- Processing all charts in the repository automatically
- Updating documentation on values.yaml changes
- Providing clear generation status indicators
- Supporting selective chart processing via configuration

## Result Status Indicators

- **✅**: Documentation generation completed successfully
- **❗**: Documentation generation disabled via configuration
- **❌**: Documentation generation failed (errors reported)

## Dependencies

- `@actions/core`: GitHub Actions core functionality
- `yaml`: YAML file parsing and manipulation
- Custom shared utilities for Helm Chart management and discovery
- Helm-docs tool (or similar) for documentation template processing

## Chart Discovery

This action relies on the helm-chart listing package to discover charts in the repository. Please refer to the [helm-chart listing documentation](../listing/README.md) for details on how charts are discovered and listed.
