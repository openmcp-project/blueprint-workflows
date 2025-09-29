/**
 * The entrypoint for the action.
 */
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'
import * as util from 'util'
import { utils, constants } from '../../../shared/dist'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Specify the directory to start searching from
    //const GITHUB_WORKSPACE: string = core.getInput(constants.github.inputGitRepositoryFolder)
    const GITHUB_WORKSPACE = process.env[constants.envvars.GITHUB_WORKSPACE]?.toString()
    if (GITHUB_WORKSPACE === null) {
      core.setFailed(util.format(constants.ErrorMsgs.missingEnv, constants.envvars.GITHUB_WORKSPACE))
      return
    }
    if (GITHUB_WORKSPACE === null || GITHUB_WORKSPACE == '' || GITHUB_WORKSPACE == undefined) {
      core.setFailed(util.format(constants.ErrorMsgs.missingEnv, constants.envvars.GITHUB_WORKSPACE))
      return
    }
    const startDir = path.resolve(GITHUB_WORKSPACE)

    core.startGroup(util.format(constants.Msgs.KustomizeListingFolderContaining, constants.KustomizeFiles.KustomizationYaml))

    // List all directories containing "kustomization.yaml" or "kustomization.yml"
    // https://github.com/actions/toolkit/tree/main/packages/glob
    const kustomizationYamlDirs = utils.lookup(startDir, constants.KustomizeFiles.KustomizationYaml)
    const kustomizationYmlDirs = utils.lookup(startDir, constants.KustomizeFiles.KustomizationYml)

    // Combine both results and remove duplicates
    const allKustomizeDirs = [...new Set([...kustomizationYamlDirs, ...kustomizationYmlDirs])]

    // Filter out kustomization files that are part of Helm charts
    const kustomizeDirs = allKustomizeDirs.filter(kustomizeDir => {
      // Check if this kustomization file is in a templates directory or subdirectory of templates
      let currentPath = kustomizeDir
      let foundInHelmChartDir = false
      
      // Walk up the directory tree from the kustomization file location
      while (currentPath !== startDir && currentPath !== path.dirname(currentPath)) {
        const currentBaseName = path.basename(currentPath)
        
        // If we find a directory named "templates" in the path
        if (currentBaseName === 'templates') {
          // Check if any parent directory has Chart.yaml
          let searchPath = path.dirname(currentPath)
          
          //while (searchPath !== startDir && searchPath !== path.dirname(searchPath)) {
          const chartYamlPath = path.join(searchPath, constants.HelmChartFiles.Chartyaml)
          if (fs.existsSync(chartYamlPath)) {
            foundInHelmChartDir = true
            break
          }
          //  searchPath = path.dirname(searchPath)
          //}
          
          // if (foundTemplatesDir) {
          //   break
          // }
        }
        
        currentPath = path.dirname(currentPath)
      }
      
      // If we found a Helm chart templates directory, exclude this kustomization file
      if (foundInHelmChartDir) {
        core.debug(`Excluding kustomization file in Helm chart templates: ${kustomizeDir}`)
        return false
      }
      
      return true
    })

    core.debug('All directories containing kustomization files:' + allKustomizeDirs.map((item: any) => `\n- ${item}`))
    core.debug('Filtered directories (excluding Helm chart templates):' + kustomizeDirs.map((item: any) => `\n- ${item}`))
    core.endGroup()

    core.startGroup(util.format(constants.Msgs.KustomizeListingFolderContaining, 'kustomization files'))

    const kustomizeListingYamlDoc = new yaml.Document({})
    kustomizeListingYamlDoc.commentBefore = ' Kustomize Listing Document which contains all found Kustomize projects with kustomization.yaml or kustomization.yml'

    for (const kustomizeDir of kustomizeDirs) {
      // Check which kustomization file exists (yaml or yml)
      let kustomizationFile: string = constants.KustomizeFiles.KustomizationYaml
      let kustomizationPath = path.join(kustomizeDir, constants.KustomizeFiles.KustomizationYaml)

      if (!fs.existsSync(kustomizationPath)) {
        kustomizationFile = constants.KustomizeFiles.KustomizationYml
        kustomizationPath = path.join(kustomizeDir, constants.KustomizeFiles.KustomizationYml)
      }

      let kustomizationFileContent = fs.readFileSync(kustomizationPath, {
        encoding: 'utf8'
      })
      let kustomizationFileDoc = yaml.parseDocument(kustomizationFileContent)

      let projectName = path.basename(kustomizeDir)

      // Ensure projectName is a string
      const projectNameStr = String(projectName)
      let kustomizeListingYamlDocKeyValue = new String().concat(path.basename(kustomizeDir), '__', projectNameStr)

      let kustomizeListingYamlItem = kustomizeListingYamlDoc.createPair(kustomizeListingYamlDocKeyValue, {
        dir: kustomizeDir,
        name: projectNameStr,
        folderName: path.basename(kustomizeDir),
        relativePath: path.relative(GITHUB_WORKSPACE, kustomizeDir),
        manifestPath: path.dirname(path.relative(GITHUB_WORKSPACE, kustomizeDir)),
        kustomizationFile: kustomizationFile
      })
      kustomizeListingYamlDoc.add(kustomizeListingYamlItem)
    }
    core.endGroup()

    core.startGroup(constants.Msgs.KustomizeListingFileYamlContent)
    core.debug(yaml.stringify(kustomizeListingYamlDoc))
    core.endGroup()
    fs.writeFileSync(GITHUB_WORKSPACE + '/' + constants.KustomizeFiles.listingFile, yaml.stringify(kustomizeListingYamlDoc), {
      flag: 'w'
    })

    core.notice(util.format(constants.Msgs.KustomizeListingFileWritten, constants.KustomizeFiles.listingFile))

    let summaryRawContent: string =
      '<details><summary>Found following Kustomize projects...</summary>\n\n```yaml\n' + yaml.stringify(kustomizeListingYamlDoc) + '\n```\n\n</details>'
    if (process.env.JEST_WORKER_ID == undefined) {
      await core.summary.addHeading('Kustomize Listing Results').addRaw(summaryRawContent).write()
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
