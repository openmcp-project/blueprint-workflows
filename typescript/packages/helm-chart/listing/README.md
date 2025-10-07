# Helm Chart Listing Action

GitHub Actions TypeScript for collecting all repository folders which contain Helm Charts.

## Description

This action automatically discovers and catalogs all Helm Charts in a repository by:

- Scanning the entire repository for `Chart.yaml` files
- Creating a centralized listing of all discovered charts
- Generating metadata for each chart including paths and configuration
- Providing a foundation for other chart processing actions

## Usage

This action serves as the foundation for all other Helm Chart actions by creating a comprehensive inventory. It:

1. Recursively scans the repository directory structure
2. Identifies folders containing `Chart.yaml` files
3. Extracts chart metadata (name, version, etc.) from each Chart.yaml
4. Creates a structured YAML listing document with chart information
5. Provides the listing file for use by other chart processing actions

## Chart Discovery

The action searches for standard Helm Chart structures:
```
repository/
├── charts/
│   ├── chart-a/
│   │   ├── Chart.yaml     # ← Discovered
│   │   ├── values.yaml
│   │   └── templates/
│   └── chart-b/
│       ├── Chart.yaml     # ← Discovered
│       └── values.yaml
└── other-charts/
    └── my-chart/
        ├── Chart.yaml     # ← Discovered
        └── templates/
```

## Inputs

The action uses the following environment variables:

- `GITHUB_WORKSPACE`: GitHub workspace directory (required)

## Features

- **Comprehensive Discovery**: Recursively scans entire repository for Chart.yaml files
- **Metadata Extraction**: Reads chart name, version, and other metadata from Chart.yaml
- **Structured Output**: Creates well-formatted YAML listing document
- **Path Resolution**: Provides both absolute and relative paths for each chart
- **Configuration Integration**: Reads chart-specific configuration from .ci.config.yaml files
- **Flexible Organization**: Works with any repository structure and chart organization

## Generated Listing Format

The action creates a helm chart listing file containing:

```yaml
# Helm Chart Listing Document which contains all found Helm Charts with Chart.yaml
chart-a__my-app:
  dir: /full/path/to/chart-a
  relativePath: charts/chart-a
  name: my-app
  version: 1.2.3

chart-b__another-app:
  dir: /full/path/to/chart-b  
  relativePath: charts/chart-b
  name: another-app
  version: 2.1.0
```

## Listing Key Format

Chart entries use a composite key format: `{folder-name}__{chart-name}`

- `folder-name`: Directory name containing the Chart.yaml
- `chart-name`: Chart name from Chart.yaml metadata
- This format ensures unique identification even with duplicate chart names

## Workflow Integration

This action typically runs first in Helm Chart workflows:

1. **Chart Discovery**: Creates comprehensive chart inventory
2. **Dependency Actions**: Other actions consume the listing for processing
3. **Selective Processing**: Actions can process specific charts based on the listing
4. **Configuration Awareness**: Chart-specific settings are discovered and made available

## Output Artifacts

The action produces:

- **Helm Chart Listing File**: Centralized YAML document with all chart information
- **Summary Report**: GitHub Actions summary with discovered charts
- **Debug Information**: Detailed logs of discovery process and found charts

## Integration with Other Actions

The listing file is consumed by:

- **version-bump**: For identifying charts needing version updates
- **linting**: For validating all discovered charts
- **docs**: For generating documentation across all charts
- **dep-build**: For building dependencies across chart inventory
- **manifest-validation**: For validating chart manifests

## Chart Metadata

For each discovered chart, the listing includes:

- **Directory Path**: Both absolute and relative paths to the chart
- **Chart Name**: Extracted from Chart.yaml name field
- **Chart Version**: Current version from Chart.yaml
- **Configuration**: Any chart-specific CI configuration settings

## Error Handling

The action handles various scenarios:

- **Missing Chart.yaml**: Skips directories without valid Chart.yaml files
- **Invalid YAML**: Reports parsing errors for malformed Chart.yaml files
- **Permission Issues**: Handles access restrictions gracefully
- **Empty Repositories**: Functions correctly with no discoverable charts

## Dependencies

- `@actions/core`: GitHub Actions core functionality
- `yaml`: YAML file parsing and manipulation
- `fs`: File system operations for directory scanning
- `path`: Path resolution and manipulation utilities
- Custom shared utilities for chart discovery and configuration management

## Repository Structure Flexibility

The action works with various repository organizations:

- **Monorepo**: Multiple charts in different subdirectories
- **Single Chart**: Repository containing one chart at root or subdirectory
- **Mixed Content**: Charts alongside other project types
- **Nested Structure**: Charts within complex directory hierarchies

## License

Apache-2.0