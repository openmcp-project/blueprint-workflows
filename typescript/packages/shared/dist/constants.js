export const ListingYamlKeys = {
    dir: 'dir',
    name: 'name',
    folderName: 'folderName',
    relativePath: 'relativePath',
    manifestPath: 'manifestPath'
};
export const HelmChartFiles = {
    Chartyaml: 'Chart.yaml',
    ciConfigYaml: '.ci.config.yaml',
    valuesCiYaml: 'values.ci.yaml',
    valuesYaml: 'values.yaml',
    ReadmeMd: 'README.md',
    listingFile: 'helm-chart-listing.yaml'
};
export const KustomizeFiles = {
    KustomizationYaml: 'kustomization.yaml',
    KustomizationYml: 'kustomization.yml',
    ciConfigYaml: '.ci.config.yaml',
    ReadmeMd: 'README.md',
    listingFile: 'kustomize-listing.yaml'
};
export const versionBumpIgnoredFiles = ['.ci.config.yaml'];
export const envvars = {
    SOURCE_GIT_REPO_URL: 'SOURCE_GIT_REPO_URL',
    TARGET_GIT_REPO_URL: 'TARGET_GIT_REPO_URL',
    BRANCH_NAME: 'BRANCH_NAME',
    BASE_BRANCH_NAME: 'BASE_BRANCH_NAME',
    GIT_REPOSITORY_FOLDER: 'GIT_REPOSITORY_FOLDER',
    GITHUB_WORKSPACE: 'GITHUB_WORKSPACE',
    TOKEN: 'TOKEN'
};
// TODO: do we need this really??
export const github = {
    inputGitRepositoryFolder: 'GIT_REPOSITORY_FOLDER'
};
export const Functionality = {
    yamllintsh: 'yamllint.sh',
    yamllint: 'yamllint',
    helmDocs: 'helm-docs',
    helmChartLinting: 'helm-chart-linting',
    helmChartValidation: 'helm-chart-validation',
    helmChartVersionBump: 'helm-chart-version-bump',
    helmChartDependencyUpdate: 'helm-chart-dependency-update',
    k8sManifestTemplating: 'k8s-manifest-templating',
    kustomizeListing: 'kustomize-listing',
    kustomizeVersionBump: 'kustomize-version-bump'
};
export const Yaml = {
    enable: 'enable'
};
export const HelmChartDoc = {
    footerTemplateFile: 'helm/charts/_templates_footer.gotmpl',
    headerTempalteFile: 'helm/charts/_templates_header.gotmpl',
    ReadmeMdGoTmpl: 'README.md.gotmpl'
};
export const ErrorMsgs = {
    missingEnv: 'Missing env %s'
};
export const Msgs = {
    HelmChartListingFolderContaining: 'Helm Chart Listing Folder containing %s',
    HelmChartListingFileYamlContent: 'Helm Chart Listing File Yaml Content',
    HelmChartListingFileWritten: 'Helm Chart Listing File %s written.',
    KustomizeListingFolderContaining: 'Kustomize Listing Folder containing %s',
    KustomizeListingFileYamlContent: 'Kustomize Listing File Yaml Content',
    KustomizeListingFileWritten: 'Kustomize Listing File %s written.'
};
