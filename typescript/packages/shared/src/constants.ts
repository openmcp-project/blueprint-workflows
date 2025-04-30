export const ListingYamlKeys = {
  dir: 'dir',
  name: 'name',
  folderName: 'folderName',
  relativePath: 'relativePath',
  manifestPath: 'manifestPath'
} as const

export const HelmChartFiles = {
  Chartyaml: 'Chart.yaml',
  ciConfigYaml: '.ci.config.yaml',
  valuesCiYaml: 'values.ci.yaml',
  valuesYaml: 'values.yaml',
  ReadmeMd: 'README.md',
  listingFile: 'helm-chart-listing.yaml'
} as const

export const envvars = {
  ORIGIN_GIT_REPO_URL: 'ORIGIN_GIT_REPO_URL',
  BRANCH_NAME: 'BRANCH_NAME',
  BASE_BRANCH_NAME: 'BASE_BRANCH_NAME',
  GIT_REPOSITORY_FOLDER: 'GIT_REPOSITORY_FOLDER',
  GITHUB_WORKSPACE: 'GITHUB_WORKSPACE',
  TOKEN: 'TOKEN'
} as const

// TODO: do we need this really??
export const github = {
  inputGitRepositoryFolder: 'GIT_REPOSITORY_FOLDER'
} as const

export const Functionality = {
  yamllintsh: 'yamllint.sh',
  yamllint: 'yamllint',
  helmDocs: 'helm-docs',
  helmChartLinting: 'helm-chart-linting',
  helmChartValidation: 'helm-chart-validation',
  helmChartVersionBump: 'helm-chart-version-bump',
  helmChartDependencyUpdate: 'helm-chart-dependency-update',
  k8sManifestTemplating: 'k8s-manifest-templating'
}
export const Yaml = {
  enable: 'enable'
} as const

export const HelmChartDoc = {
  footerTemplateFile: 'helm/charts/_templates_footer.gotmpl',
  headerTempalteFile: 'helm/charts/_templates_header.gotmpl',
  ReadmeMdGoTmpl: 'README.md.gotmpl'
} as const

export const ErrorMsgs = {
  missingEnv: 'Missing env %s'
} as const
export const Msgs = {
  HelmChartListingFolderContaining: 'Helm Chart Listing Folder containing %s',
  HelmChartListingFileYamlContent: 'Helm Chart Listing File Yaml Content',
  HelmChartListingFileWritten: 'Helm Chart Listing File %s written.'
} as const
