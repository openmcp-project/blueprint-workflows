import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'
import * as constants from './constants'
import * as core from '@actions/core'
import * as jsYaml from 'js-yaml'
import * as exec2 from '@actions/exec'
//const exec2 = require('@actions/exec');
//import * as io from '@actions/io'

export function assertNullOrEmpty(input: string, msg: string): void {
  if (input === null || input.length == 0) {
    throw new Error(msg)
  }
}
export function checkRequiredInput(inputKey: string): string {
  const input: string = core.getInput(inputKey)

  assertNullOrEmpty(input, 'Missing value for input `' + inputKey + '`!')

  return input
}
export function lookup(dir: string, lookupFile: string, results: string[] = []): string[] {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Check if lookupFile exists in this directory
      if (fs.existsSync(path.join(filePath, lookupFile))) {
        results.push(filePath)
      }
      // lookup into the subdirectory
      lookup(filePath, lookupFile, results)
    }
  }
  return results
}

export function findYamlKeyByDir(yamlContent: string, targetDir: string): string | null {
  // Parse the YAML content
  const parsedYaml = jsYaml.load(yamlContent) as Record<string, any>

  // Iterate through the keys of the YAML object
  for (const key in parsedYaml) {
    if (parsedYaml[key]?.dir === targetDir) {
      return key // Return the key if the dir matches the targetDir
    }
  }

  return null // Return null if no match is found
}
export function readYamlFile(dir: path.FormatInputPathObject): yaml.Document extends true ? unknown : any {
  if (fs.existsSync(path.format(dir)) === false) {
    return false
  }
  const fileContent = fs.readFileSync(path.format(dir), { encoding: 'utf8' })
  return yaml.parseDocument(fileContent)
}
export function isFunctionEnabled(dir: path.FormatInputPathObject, functionName: string, defaultBehavior: boolean = true): boolean {
  if (fs.existsSync(path.join(path.format(dir), constants.HelmChartFiles.ciConfigYaml)) == false) {
    return defaultBehavior
  }

  const ciConfigFileDoc = readYamlFile(path.parse(path.join(path.format(dir), constants.HelmChartFiles.ciConfigYaml)))

  let ciConfigFileDocFunction: any = ciConfigFileDoc.get(functionName)

  // put this out of listing core functionality and move it to the respective action (e.g. helm chart validation / helm docs generation / helm version bump / yamllint ect...)
  if (ciConfigFileDoc.has(functionName) && ciConfigFileDocFunction.has(constants.Yaml.enable) && ciConfigFileDocFunction.get(constants.Yaml.enable).toString() == 'true') {
    core.debug(functionName + ' - enabled=' + ciConfigFileDocFunction.get(constants.Yaml.enable).toString())
    return true
  } else if (ciConfigFileDoc.has(functionName) && ciConfigFileDocFunction.has(constants.Yaml.enable) && ciConfigFileDocFunction.get(constants.Yaml.enable).toString() == 'false') {
    core.debug(functionName + ' - enabled=' + ciConfigFileDocFunction.get(constants.Yaml.enable).toString())
    return false
  }
  return defaultBehavior
}

export function isFileFoundInPath(file: string, dir: path.FormatInputPathObject, cwd: path.FormatInputPathObject): string | boolean {
  let dirName: string = path.dirname(path.format(dir))
  dirName = path.format(cwd) + '/' + dirName

  core.debug('dirname:' + dirName + ' file:' + file)

  if (fs.existsSync(dirName + '/' + file)) {
    return dirName
  }
  if (dirName === '/' || dirName === '.' || dirName === path.format(cwd) || dirName === path.format(cwd) + '/.') {
    return false
  }
  return isFileFoundInPath(file, path.parse(path.dirname(path.format(dir))), cwd)
}

export const removeDuplicatesFromStringArray = (arr: string[]): string[] => {
  let unique: string[] = arr.reduce(function (acc: string[], curr: string) {
    if (!acc.includes(curr)) acc.push(curr)
    return acc
  }, [])
  return unique
}
export function unrapYamlbyKey(yamlDoc: yaml.Document, key: string, defaultValue?: string | boolean): yaml.Document extends true ? unknown : any {
  let listingYamlItem: any = yamlDoc.get(key)
  if (listingYamlItem === undefined) {
    if (defaultValue === undefined) {
      core.debug('Yaml Document:' + yaml.stringify(yamlDoc))
      throw new CustomError('Unabel to read yaml key `' + key + '` of yaml document!')
    }
    return defaultValue
  }
  if (listingYamlItem === null || listingYamlItem.length == 0) {
    return defaultValue
  }
  return listingYamlItem
}

export class Git {
  private static instance: Git

  private constructor() {}

  static getInstance() {
    if (this.instance) {
      return this.instance
    }
    this.instance = new Git()
    return this.instance
  }

  /**
   * commit
   */
  public async add(pathspec: path.FormatInputPathObject, cwd?: string) {
    let cmdCommand: string = 'git add "' + path.format(pathspec) + '"'
    return await this.exec(cmdCommand, [], { cwd: cwd })
  }

  public async diff(tag = 'HEAD', cwd?: string) {
    let cmdCommand: string = 'git diff --name-only ' + tag
    return await this.exec(cmdCommand, [], { cwd: cwd })
  }
  public async status(cwd?: string) {
    let cmdCommand: string = 'git status --porcelain'
    return await this.exec(cmdCommand, [], { cwd: cwd })
  }

  public async push(cwd?: string) {
    let cmdCommand: string = 'git push'
    return await this.exec(cmdCommand, [], { cwd: cwd })
  }

  public async commit(message: string, cwd?: string) {
    let cmdCommand2: string = 'git commit -am "' + message + '"'
    return await this.exec(cmdCommand2, [], { cwd: cwd })
  }

  public async exec(commandLine: string, args?: string[], execOptions?: exec2.ExecOptions): Promise<exec2.ExecOutput> {
    let stdOut = ''
    let stdErr = ''
    let silient: boolean = true

    if (core.isDebug()) {
      silient = false
    }

    let options: exec2.ExecOptions = {
      silent: silient,
      failOnStdErr: false
    }

    if (execOptions !== undefined) {
      options = { ...options, ...execOptions }
    }

    options.listeners = {
      stdout: (data: Buffer) => {
        stdOut += data.toString()
      },
      stderr: (data: Buffer) => {
        stdErr += data.toString()
      }
    }
    core.debug('commandLine: `' + commandLine + '` args: `' + args?.join(' ') + '`')
    let exitCode = await exec2.exec(commandLine, args, options)
    core.debug('exitCode: `' + exitCode + '` stdout: "' + stdOut + '" stderror: "' + stdErr + '"')

    return { exitCode: exitCode, stdout: stdOut, stderr: stdErr }
  }
}
export class HelmChart {
  private static instance: HelmChart

  private constructor() {}

  static getInstance() {
    if (this.instance) {
      return this.instance
    }
    this.instance = new HelmChart()
    return this.instance
  }
  public async exec(commandLine: string, args?: string[], execOptions?: exec2.ExecOptions): Promise<exec2.ExecOutput> {
    let stdOut = ''
    let stdErr = ''

    let options: exec2.ExecOptions = {
      silent: false,
      failOnStdErr: false
    }
    if (execOptions !== undefined) {
      options = { ...options, ...execOptions }
    }
    options.listeners = {
      stdout: (data: Buffer) => {
        stdOut += data.toString()
      },
      stderr: (data: Buffer) => {
        stdErr += data.toString()
      }
    }
    core.debug('commandLine: `' + commandLine + '` args: `' + args?.join(' ') + '`')
    let exitCode = await exec2.exec(commandLine, args, options)
    core.debug('exitCode: `' + exitCode + '` stdout: "' + stdOut + '" stderror: "' + stdErr + '"')

    return { exitCode: exitCode, stdout: stdOut, stderr: stdErr }
  }
  public async listRepositories(): Promise<string> {
    let cmdExec = 'helm repo list -o yaml'

    let result: exec2.ExecOutput = await this.exec(cmdExec, [])
    if (result.stderr) {
      throw new Error(this.listRepositories.name + '() ' + result.stderr)
    }
    return result.stdout
  }

  public isRepositoryAdded(repositoryList: any, helmRepositoryUrl: string): boolean {
    let helmRepoListDoc = yaml.parse(repositoryList)
    // Loop through the YAML data and find the matching URL
    for (const item of helmRepoListDoc) {
      if (item.url === helmRepositoryUrl) {
        core.debug('Found Helm Repository Url with alias `' + item.name + '` [url: `' + item.url + '`')
        return true
      }
    }
    core.debug('Did NOT find Helm Repository Url: `' + helmRepositoryUrl + '`')
    return false
  }
  public async addRepository(HELM_REPOSITORY_NAME: string, HELM_REPOSITORY_URL: string, HELM_REPO_USERNAME: string, HELM_REPO_TOKEN: string) {
    //
    let args: string[] = [
      'repo',
      'add',
      ' "' + HELM_REPOSITORY_NAME + '"',
      ' "' + HELM_REPOSITORY_URL + '"',
      ' --username "' + HELM_REPO_USERNAME + '"',
      ' --password "' + HELM_REPO_TOKEN + '"'
    ]
    let cmdExec = 'helm ' + args.join(' ')
    let result: exec2.ExecOutput = await this.exec(cmdExec)

    if (result.stderr) {
      throw new Error(this.addRepository.name + '() ' + result.stderr)
    }
    return result.stdout
  }
  // TODO: refactor .github/actions/helm-chart/dep-build/src/main.ts here?
  public dependencyUpdate(filePath: path.FormatInputPathObject) {
    this.listRepositories()
  }
  public getListingFileContent(filePath: path.FormatInputPathObject): string {
    const filePathWet = path.join(path.format(filePath), constants.HelmChartFiles.listingFile)

    if (fs.existsSync(filePathWet)) {
      return fs.readFileSync(filePathWet, { encoding: 'utf8' })
    } else {
      throw new Error('File ' + filePathWet + ' not found!')
    }
  }
  /**
   * template
   * @param ignoreWarnings - Array of regex patterns to ignore in stderr. Default pattern for deprecated chart warning is always included.
   */
  public async template(dir: path.ParsedPath, valueFiles: string, options?: string[], ignoreWarnings?: string[]) {
    let cmdOptions: string = ''
    if (options !== undefined) {
      cmdOptions = options?.join(' ')
    }
    let cmdExec = 'helm template helm-release-name "' + path.format(dir) + '" ' + valueFiles + ' ' + cmdOptions

    let result: exec2.ExecOutput = await this.exec(cmdExec)

    // Default patterns that are always ignored (backward compatible)
    const defaultPatterns = ['^WARNING: This chart is deprecated$']
    const patterns = ignoreWarnings ? [...defaultPatterns, ...ignoreWarnings] : defaultPatterns

    if (result.stderr && result.stderr.trim() !== '') {
      const stderrLines = result.stderr
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')

      for (const line of stderrLines) {
        const isIgnored = patterns.some(pattern => new RegExp(pattern).test(line))
        if (!isIgnored) {
          throw new Error(`Helm Chart ${path.format(dir)} templating produced unexpected stderr: ${result.stderr}`)
        }
      }
    }

    if (result.stdout.length === 0 || result.stdout.length === 1 || result.stdout.length < 50 || result.stdout === null || result.stdout == '' || result.stdout == ' ') {
      throw new Error('Helm Chart ' + path.format(dir) + ' Templating failed with empty manifest!\n' + result.stdout + result.stderr)
    }

    if (result.exitCode !== 0 && result.stderr) {
      throw new Error(this.lint.name + '() Helm Chart ' + path.format(dir) + ' exitCode: ' + result.exitCode + ' stdErr: ' + result.stderr)
    }
    return result.stdout
  }

  /**
   *
   */
  public getHelmValueFiles(dir: path.ParsedPath): string {
    let helmValueFiles = '-f ' + path.join(path.format(dir), constants.HelmChartFiles.valuesYaml)

    if (fs.existsSync(path.join(path.format(dir), constants.HelmChartFiles.valuesCiYaml))) {
      helmValueFiles = helmValueFiles + ' -f ' + path.join(path.format(dir), constants.HelmChartFiles.valuesCiYaml)
    } else {
      core.debug(this.getHelmValueFiles.name + ' Didnt find ' + constants.HelmChartFiles.valuesCiYaml + ' in ' + path.format(dir))
    }
    return helmValueFiles
  }
  public async DependencyUpdate(dir: path.ParsedPath) {
    let cmdExec = 'helm dependency update ' + path.format(dir)

    let result: exec2.ExecOutput = await this.exec(cmdExec, [])
    if (result.exitCode !== 0) {
      throw new Error(this.DependencyUpdate.name + '() failed with exit code: ' + result.exitCode)
    }
    return result.stdout
  }
  public async lint(dir: path.ParsedPath, options?: string[]) {
    let helmValueFiles = this.getHelmValueFiles(dir)

    let cmdOptions: string = ''
    if (options !== undefined) {
      cmdOptions = options?.join(' ')
    }

    let cmdExec = 'helm lint ' + path.format(dir) + ' ' + helmValueFiles + ' ' + cmdOptions
    let result: exec2.ExecOutput = await this.exec(cmdExec)

    if (result.exitCode !== 0 && result.stderr) {
      throw new Error(this.lint.name + '() exitCode: ' + result.exitCode + ' stdErr: ' + result.stderr)
    }
    return result.stdout
  }

  /**
   * Reads a specific feature section from a YAML configuration file for a given function name and feature name.
   * @param dir - Directory path as a path.FormatInputPathObject.
   * @param functionName - The name of the function section in the YAML.
   * @param featureName - The name of the feature to retrieve within the function section.
   * @returns The feature object if found, or false if not present.
   */
  public readPipelineFeature(dir: path.FormatInputPathObject, functionName: string, featureName: string): yaml.Document | false {
    const configPath = path.join(path.format(dir), constants.HelmChartFiles.ciConfigYaml)
    if (!fs.existsSync(configPath)) {
      return false
    }

    const ciConfigFileDoc = readYamlFile(path.parse(configPath))
    const functionSection = unrapYamlbyKey(ciConfigFileDoc, functionName, false)
    if (functionSection === false) {
      return false
    }

    const featureSection = unrapYamlbyKey(functionSection, featureName, false)
    if (featureSection === false) {
      return false
    }

    return featureSection
  }

  public readPipelineFeatureOptions(dir: path.FormatInputPathObject, functionName: string): yaml.Document extends true ? unknown : any {
    if (fs.existsSync(path.join(path.format(dir), constants.HelmChartFiles.ciConfigYaml)) == false) {
      return false
    }

    const ciConfigFileDoc = readYamlFile(path.parse(path.join(path.format(dir), constants.HelmChartFiles.ciConfigYaml)))
    if (unrapYamlbyKey(ciConfigFileDoc, functionName, false) === false) {
      return false
    }
    const yamlContent: yaml.Document = unrapYamlbyKey(ciConfigFileDoc, functionName)

    if (unrapYamlbyKey(yamlContent, 'options', false) === false) {
      return false
    }
    return unrapYamlbyKey(yamlContent, 'options')
  }
  public async generateReadmeDocumentation(dir: path.ParsedPath, templateFiles: string[], options?: string[]) {
    let helmDocsTemplateFiles: string[] = []
    for (const templateFile of templateFiles) {
      if (fs.existsSync(templateFile)) {
        helmDocsTemplateFiles.push(templateFile)
      } else {
        core.debug('File ' + templateFile + ' not found!')
      }
    }
    const templateFilesStr: string = helmDocsTemplateFiles.map(item => '--template-files "' + item + '"').join(' ')

    let cmdOptions: string = ''
    if (options !== undefined) {
      cmdOptions = options?.join(' ')
    }
    let cmdExec = 'helm-docs ' + templateFilesStr + ' ' + cmdOptions + ' --chart-search-root="' + path.format(dir) + '"' + ' --log-level debug'
    let result: exec2.ExecOutput = await this.exec(cmdExec)

    if (result.exitCode !== 0 && result.stderr) {
      throw new Error(this.generateReadmeDocumentation.name + '() exitCode: ' + result.exitCode + ' stdErr: ' + result.stderr)
    }
    return result.stdout
  }
}

export class Kustomize {
  private static instance: Kustomize

  private constructor() {}

  static getInstance() {
    if (this.instance) {
      return this.instance
    }
    this.instance = new Kustomize()
    return this.instance
  }

  public async exec(commandLine: string, args?: string[], execOptions?: exec2.ExecOptions): Promise<exec2.ExecOutput> {
    let stdOut = ''
    let stdErr = ''

    let options: exec2.ExecOptions = {
      silent: false,
      failOnStdErr: false
    }
    if (execOptions !== undefined) {
      options = { ...options, ...execOptions }
    }
    options.listeners = {
      stdout: (data: Buffer) => {
        stdOut += data.toString()
      },
      stderr: (data: Buffer) => {
        stdErr += data.toString()
      }
    }
    core.debug('commandLine: `' + commandLine + '` args: `' + args?.join(' ') + '`')
    let exitCode = await exec2.exec(commandLine, args, options)
    core.debug('exitCode: `' + exitCode + '` stdout: "' + stdOut + '" stderror: "' + stdErr + '"')

    return { exitCode: exitCode, stdout: stdOut, stderr: stdErr }
  }

  public getListingFileContent(filePath: path.FormatInputPathObject): string {
    const filePathWet = path.join(path.format(filePath), constants.KustomizeFiles.listingFile)

    if (fs.existsSync(filePathWet)) {
      return fs.readFileSync(filePathWet, { encoding: 'utf8' })
    } else {
      throw new Error('File ' + filePathWet + ' not found!')
    }
  }

  /**
   * Reads or creates a .version file for a kustomize project
   * @param dir - Directory path
   * @returns The version string from the .version file, or "0.0.0" if file doesn't exist
   */
  public readOrCreateVersionFile(dir: string): string {
    const versionFilePath = path.join(dir, '.version')

    if (fs.existsSync(versionFilePath)) {
      const versionContent = fs.readFileSync(versionFilePath, { encoding: 'utf8' }).trim()
      return versionContent || '0.0.0'
    } else {
      // Create .version file with default version 0.0.0
      fs.writeFileSync(versionFilePath, '0.0.0', { encoding: 'utf8' })
      return '0.0.0'
    }
  }

  /**
   * Writes version to .version file
   * @param dir - Directory path
   * @param version - Version string to write
   */
  public writeVersionFile(dir: string, version: string): void {
    const versionFilePath = path.join(dir, '.version')
    fs.writeFileSync(versionFilePath, version, { encoding: 'utf8' })
  }
}

export class CustomError extends Error {
  constructor(message: string) {
    super(message) // Call the constructor of the base class `Error`
    this.name = 'CustomError' // Set the error name to your custom error class name
    // Set the prototype explicitly to maintain the correct prototype chain
    Object.setPrototypeOf(this, CustomError.prototype)
  }
}