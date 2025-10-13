[![REUSE status](https://api.reuse.software/badge/github.com/openmcp-project/blueprint-workflows)](https://api.reuse.software/info/github.com/openmcp-project/blueprint-workflows)

# blueprint-workflows

## About this project

Workflows and Actions for Blueprints & Building Blocks for Open Managed Control Planes.

This project provides reusable GitHub Workflows and Actions designed for projects following the structure of [blueprints](https://github.com/openmcp-project/blueprints) and [blueprint-building-blocks](https://github.com/openmcp-project/blueprint-building-blocks). These workflows and actions streamline CI/CD processes for Helm Charts and Kustomize projects allowing for more detailed Kubernetes manifests reviews of the changes before deployment using GitOps tools like [Flux](https://github.com/fluxcd/flux2).

## Requirements and Setup

### Prerequisites

1. **GitHub Repository Structure**: Ensure your repository follows the structure of the referenced blueprints and building blocks.
2. **GitHub Actions permissions**: Ensure that you have access to the reusable workflows from your repository: [Access to reusable workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows#access-to-reusable-workflows)
4. **GitHub Tokens**: If necessary set up a GitHub tokens with appropriate permissions for repostories and Helm registries.

### Workflows

#### 1. **Continuous Integration (ci.yml)**
   - **Description**: Continously install dependencies, build packages, and run tests.
   - **Usage**:
     ```yaml
     jobs:
       test-action:
         uses: openmcp-project/blueprint-workflows/.github/workflows/ci.yml@main
     ```

#### 2. **PR Status Checks (git-pr-status-checks.yml)**
   - **Description**: Performs Helm Chart and Kustomize listing, dependency updates, linting, manifest validation, and version bumping for pull requests.
   - **Usage**:
     ```yaml
     jobs:
       pr-status-check:
         uses: openmcp-project/blueprint-workflows/.github/workflows/git-pr-status-checks.yml@main
     ```

#### 3. **Lint Codebase (linter.yml)**
   - **Description**: Lints the codebase for JavaScript, TypeScript, and other supported languages.
   - **Usage**:
     ```yaml
     jobs:
       lint:
         uses: openmcp-project/blueprint-workflows/.github/workflows/linter.yml@main
     ```

#### 4. **Check Transpiled JavaScript (check-dist.yml)**
   - **Description**: Ensures the `dist/` directory contains the expected transpiled code.
   - **Usage**:
     ```yaml
     jobs:
       check-dist:
         uses: openmcp-project/blueprint-workflows/.github/workflows/check-dist.yml@main
     ```

#### 5. **CodeQL Analysis (codeql-analysis.yml)**
   - **Description**: Performs CodeQL analysis for security and code quality.
   - **Usage**:
     ```yaml
     jobs:
       codeql-analysis:
         uses: openmcp-project/blueprint-workflows/.github/workflows/codeql-analysis.yml@main
     ```

### Actions

#### Helm Chart Actions

#### 1. **Helm Chart Listing**
   - **Description**: Lists all Helm Charts in the repository.
   - **Usage**:
     ```yaml
     steps:
       - id: helm-chart-listing
         uses: openmcp-project/blueprint-workflows/.github/actions/helm-chart/listing@main
     ```

#### 2. **Helm Chart Dependency Build/Update**
   - **Description**: Updates dependencies for all Helm Charts.
   - **Usage**:
     ```yaml
     steps:
       - id: helm-chart-dep-build
         uses: openmcp-project/blueprint-workflows/.github/actions/helm-chart/dep-build@main
     ```

#### 3. **Helm Chart Linting**
   - **Description**: Lints all Helm Charts for errors and warnings.
   - **Usage**:
     ```yaml
     steps:
       - id: helm-chart-linting
         uses: openmcp-project/blueprint-workflows/.github/actions/helm-chart/linting@main
     ```

#### 4. **Helm Chart Manifest Validation**
   - **Description**: Validates Helm Chart manifests.
   - **Usage**:
     ```yaml
     steps:
       - id: helm-chart-manifest-validation
         uses: openmcp-project/blueprint-workflows/.github/actions/helm-chart/manifest-validation@main
     ```

#### 5. **Helm Chart Version Bump**
   - **Description**: Bumps the version of modified Helm Charts.
   - **Usage**:
     ```yaml
     steps:
       - id: helm-chart-version-bump
         uses: openmcp-project/blueprint-workflows/.github/actions/helm-chart/version-bump@main
         with:
           BRANCH_NAME: ${{ github.event.pull_request.head.ref }}
           BASE_BRANCH_NAME: main
     ```

#### 6. **Helm Chart Documentation**
   - **Description**: Generates README.md documentation for Helm Charts.
   - **Usage**:
     ```yaml
     steps:
       - id: helm-chart-docs
         uses: openmcp-project/blueprint-workflows/.github/actions/helm-chart/docs@main
     ```

#### Kustomize Actions

#### 7. **Kustomize Listing**
   - **Description**: Lists all Kustomize projects in the repository.
   - **Usage**:
     ```yaml
     steps:
       - id: kustomize-listing
         uses: openmcp-project/blueprint-workflows/.github/actions/kustomize/listing@main
     ```

#### 8. **Kustomize Manifest Validation**
   - **Description**: Validates Kustomize manifests.
   - **Usage**:
     ```yaml
     steps:
       - id: kustomize-manifest-validation
         uses: openmcp-project/blueprint-workflows/.github/actions/kustomize/manifest-validation@main
     ```

#### 9. **Kustomize Version Bump**
   - **Description**: Bumps the version of modified Kustomize projects.
   - **Usage**:
     ```yaml
     steps:
       - id: kustomize-version-bump
         uses: openmcp-project/blueprint-workflows/.github/actions/kustomize/version-bump@main
         with:
           BRANCH_NAME: ${{ github.event.pull_request.head.ref }}
           SOURCE_GIT_REPO_URL: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name }}
           TARGET_GIT_REPO_URL: ${{ github.server_url }}/${{ github.event.pull_request.base.repo.full_name }}
     ```

#### Other Actions

#### 10. **K8s Manifest Templating**
   - **Description**: Templates and validates Kubernetes manifests for Helm Charts and Kustomize projects.
   - **Usage**:
     ```yaml
     steps:
       - id: k8s-manifest-templating
         uses: openmcp-project/blueprint-workflows/.github/actions/k8s-manifest-templating@main
     ```

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/openmcp-project/blueprint-workflows/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Security / Disclosure
If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/openmcp-project/blueprint-workflows/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/SAP/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright 2025 SAP SE or an SAP affiliate company and blueprint-workflows contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/openmcp-project/blueprint-workflows).
