import * as core from '@actions/core'
import { utils, constants } from '../../../shared/dist'
import * as path from 'path'
import * as yaml from 'yaml'
import * as fs from 'fs'
import { execSync } from 'child_process'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Specify the directory to start searching from

    const GITHUB_WORKSPACE = process.env[constants.envvars.GITHUB_WORKSPACE]

    if (!GITHUB_WORKSPACE || GITHUB_WORKSPACE.trim() === '') {
      core.setFailed('Missing env `' + constants.envvars.GITHUB_WORKSPACE + '`!')
      return
    }

    const pathGitRepository = path.parse(GITHUB_WORKSPACE)

    // Check if kustomize listing file exists
    const kustomizeListingPath = path.join(GITHUB_WORKSPACE, constants.KustomizeFiles.listingFile)
    if (!fs.existsSync(kustomizeListingPath)) {
      core.setFailed(`Kustomize listing file not found at ${kustomizeListingPath}. Run kustomize-listing action first.`)
      return
    }

    const kustomizeListingFileContent: string = fs.readFileSync(kustomizeListingPath, 'utf8')
    let kustomizeListingYamlDoc = new yaml.Document(yaml.parse(kustomizeListingFileContent))

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    core.startGroup('Kustomize Manifest Validation')
    let tableRows: any[] = []
    let tableHeader = [
      { data: 'UID Kustomize Project', header: true },
      { data: 'Result', header: true },
      { data: 'Folder', header: true }
    ]
    let summaryRawContent: string =
      '<details><summary>Found following Kustomize projects...</summary>\n\n```yaml\n' + yaml.stringify(kustomizeListingYamlDoc) + '\n```\n\n</details>'

    core.summary.addHeading('Kustomize Manifest Validation Results').addRaw(summaryRawContent)

    // loop through all kustomize projects and validate manifests
    for (const item of Object.keys(kustomizeListingYamlDoc.toJSON())) {
      let yamlitem = utils.unrapYamlbyKey(kustomizeListingYamlDoc, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)

      let dir: path.ParsedPath = path.parse(listingYamlDir)

      // Check if validation is enabled for this directory
      if (utils.isFunctionEnabled(dir, constants.Functionality.kustomizeListing, true)) {
        try {
          // Run kustomize build to validate the manifest
          core.info(`Validating Kustomize project in ${listingYamlDir}`)

          // Check if kustomize is available
          try {
            execSync('which kustomize', { stdio: 'pipe' })
          } catch {
            core.setFailed('kustomize command not found. Please install kustomize: https://kubectl.docs.kubernetes.io/installation/kustomize/')
            return
          }

          // Run kustomize build --dry-run to validate without applying
          const result = execSync(`kubectl kustomize ${listingYamlDir}`, {
            encoding: 'utf8',
            stdio: 'pipe'
          })

          if (result && result.length > 0) {
            core.info(`✅ Kustomize manifest validation successful for ${listingYamlRelativePath}`)
            tableRows.push([item, '✅', listingYamlRelativePath])
          } else {
            core.warning(`⚠️ Kustomize build produced empty output for ${listingYamlRelativePath}`)
            tableRows.push([item, '⚠️', listingYamlRelativePath])
          }
        } catch (error) {
          core.error(`❌ Kustomize manifest validation failed for ${listingYamlRelativePath}: ${error}`)
          tableRows.push([item, '❌', listingYamlRelativePath])
        }
      } else {
        tableRows.push([item, ':heavy_exclamation_mark:', listingYamlRelativePath])
      }
    }

    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails(
        'Legend',
        '✅ = Manifest Validated \n ⚠️ = Empty Output \n ❌ = Validation Failed \n :heavy_exclamation_mark: = Validation Disabled by ' + constants.KustomizeFiles.ciConfigYaml
      )
      .write()

    core.endGroup()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
