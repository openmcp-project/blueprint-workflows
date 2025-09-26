import * as path from 'path';
import * as yaml from 'yaml';
import * as exec2 from '@actions/exec';
export declare function assertNullOrEmpty(input: string, msg: string): void;
export declare function checkRequiredInput(inputKey: string): string;
export declare function lookup(dir: string, lookupFile: string, results?: string[]): string[];
export declare function findYamlKeyByDir(yamlContent: string, targetDir: string): string | null;
export declare function readYamlFile(dir: path.FormatInputPathObject): yaml.Document extends true ? unknown : any;
export declare function isFunctionEnabled(dir: path.FormatInputPathObject, functionName: string, defaultBehavior?: boolean): boolean;
export declare function isFileFoundInPath(file: string, dir: path.FormatInputPathObject, cwd: path.FormatInputPathObject): string | boolean;
export declare const removeDuplicatesFromStringArray: (arr: string[]) => string[];
export declare function unrapYamlbyKey(yamlDoc: yaml.Document, key: string, defaultValue?: string | boolean): yaml.Document extends true ? unknown : any;
export declare class Git {
    private static instance;
    private constructor();
    static getInstance(): Git;
    /**
     * commit
     */
    add(pathspec: path.FormatInputPathObject, cwd?: string): Promise<exec2.ExecOutput>;
    diff(tag?: string, cwd?: string): Promise<exec2.ExecOutput>;
    status(cwd?: string): Promise<exec2.ExecOutput>;
    push(cwd?: string): Promise<exec2.ExecOutput>;
    commit(message: string, cwd?: string): Promise<exec2.ExecOutput>;
    exec(commandLine: string, args?: string[], execOptions?: exec2.ExecOptions): Promise<exec2.ExecOutput>;
}
export declare class HelmChart {
    private static instance;
    private constructor();
    static getInstance(): HelmChart;
    exec(commandLine: string, args?: string[], execOptions?: exec2.ExecOptions): Promise<exec2.ExecOutput>;
    listRepositories(): Promise<string>;
    isRepositoryAdded(repositoryList: any, helmRepositoryUrl: string): boolean;
    addRepository(HELM_REPOSITORY_NAME: string, HELM_REPOSITORY_URL: string, HELM_REPO_USERNAME: string, HELM_REPO_TOKEN: string): Promise<string>;
    dependencyUpdate(filePath: path.FormatInputPathObject): void;
    getListingFileContent(filePath: path.FormatInputPathObject): string;
    /**
     * template
     */
    template(dir: path.ParsedPath, valueFiles: string, options?: string[]): Promise<string>;
    /**
     *
     */
    getHelmValueFiles(dir: path.ParsedPath): string;
    DependencyUpdate(dir: path.ParsedPath): Promise<string>;
    lint(dir: path.ParsedPath, options?: string[]): Promise<string>;
    /**
     * Reads a specific feature section from a YAML configuration file for a given function name and feature name.
     * @param dir - Directory path as a path.FormatInputPathObject.
     * @param functionName - The name of the function section in the YAML.
     * @param featureName - The name of the feature to retrieve within the function section.
     * @returns The feature object if found, or false if not present.
     */
    readPipelineFeature(dir: path.FormatInputPathObject, functionName: string, featureName: string): yaml.Document | false;
    readPipelineFeatureOptions(dir: path.FormatInputPathObject, functionName: string): yaml.Document extends true ? unknown : any;
    generateReadmeDocumentation(dir: path.ParsedPath, templateFiles: string[], options?: string[]): Promise<string>;
}
export declare class Kustomize {
    private static instance;
    private constructor();
    static getInstance(): Kustomize;
    exec(commandLine: string, args?: string[], execOptions?: exec2.ExecOptions): Promise<exec2.ExecOutput>;
    getListingFileContent(filePath: path.FormatInputPathObject): string;
    /**
     * Reads or creates a .version file for a kustomize project
     * @param dir - Directory path
     * @returns The version string from the .version file, or "0.0.1" if file doesn't exist
     */
    readOrCreateVersionFile(dir: string): string;
    /**
     * Writes version to .version file
     * @param dir - Directory path
     * @param version - Version string to write
     */
    writeVersionFile(dir: string, version: string): void;
}
export declare class CustomError extends Error {
    constructor(message: string);
}
