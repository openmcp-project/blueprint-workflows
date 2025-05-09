export declare const ListingYamlKeys: {
    readonly dir: "dir";
    readonly name: "name";
    readonly folderName: "folderName";
    readonly relativePath: "relativePath";
    readonly manifestPath: "manifestPath";
};
export declare const HelmChartFiles: {
    readonly Chartyaml: "Chart.yaml";
    readonly ciConfigYaml: ".ci.config.yaml";
    readonly valuesCiYaml: "values.ci.yaml";
    readonly valuesYaml: "values.yaml";
    readonly ReadmeMd: "README.md";
    readonly listingFile: "helm-chart-listing.yaml";
};
export declare const envvars: {
    readonly SOURCE_GIT_REPO_URL: "SOURCE_GIT_REPO_URL";
    readonly TARGET_GIT_REPO_URL: "TARGET_GIT_REPO_URL";
    readonly BRANCH_NAME: "BRANCH_NAME";
    readonly BASE_BRANCH_NAME: "BASE_BRANCH_NAME";
    readonly GIT_REPOSITORY_FOLDER: "GIT_REPOSITORY_FOLDER";
    readonly GITHUB_WORKSPACE: "GITHUB_WORKSPACE";
    readonly TOKEN: "TOKEN";
};
export declare const github: {
    readonly inputGitRepositoryFolder: "GIT_REPOSITORY_FOLDER";
};
export declare const Functionality: {
    helmDocs: string;
    helmChartLinting: string;
    helmChartValidation: string;
    helmChartVersionBump: string;
    helmChartDependencyUpdate: string;
    k8sManifestTemplating: string;
};
export declare const Yaml: {
    readonly enable: "enable";
};
export declare const HelmChartDoc: {
    readonly footerTemplateFile: "helm/charts/_templates_footer.gotmpl";
    readonly headerTempalteFile: "helm/charts/_templates_header.gotmpl";
    readonly ReadmeMdGoTmpl: "README.md.gotmpl";
};
export declare const ErrorMsgs: {
    readonly missingEnv: "Missing env %s";
};
export declare const Msgs: {
    readonly HelmChartListingFolderContaining: "Helm Chart Listing Folder containing %s";
    readonly HelmChartListingFileYamlContent: "Helm Chart Listing File Yaml Content";
    readonly HelmChartListingFileWritten: "Helm Chart Listing File %s written.";
};
