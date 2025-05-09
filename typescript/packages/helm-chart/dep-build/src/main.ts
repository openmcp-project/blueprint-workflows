import * as core from '@actions/core'
import { utils, constants } from '../../../shared/dist'
import * as path from 'path'
import * as yaml from 'yaml'
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    const GITHUB_WORKSPACE = String(process.env[constants.envvars.GITHUB_WORKSPACE])

    utils.assertNullOrEmpty(GITHUB_WORKSPACE, 'Missing env `' + constants.envvars.GITHUB_WORKSPACE + '`!')

    const pathGitRepository = path.parse(GITHUB_WORKSPACE)
    let utilsHelmChart = utils.HelmChart.getInstance()

    let helmChartListingFileContent: string = utilsHelmChart.getListingFileContent(pathGitRepository)

    let helmChartListingYamlDoc = new yaml.Document(yaml.parse(helmChartListingFileContent))
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    core.startGroup('Helm Dependency Update')

    let tableRows = []
    let tableHeader = [
      { data: 'UID Helm Chart', header: true },
      { data: 'Result', header: true },
      { data: 'Folder', header: true }
    ]
    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    core.summary.addHeading('Helm Chart Dependency Update Results').addRaw(summaryRawContent)

    for (const item of Object.keys(helmChartListingYamlDoc.toJSON())) {
      let yamlitem = utils.unrapYamlbyKey(helmChartListingYamlDoc, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)
      let dir: path.ParsedPath = path.parse(listingYamlDir)

      if (utils.isFunctionEnabled(dir, constants.Functionality.helmChartDependencyUpdate, true)) {
        await utilsHelmChart.DependencyUpdate(dir)
        tableRows.push([item, '✅', listingYamlRelativePath])
      } else {
        tableRows.push([item, ':heavy_exclamation_mark:', listingYamlRelativePath])
      }
    }
    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails('Legende', '✅ = Helm Chart Dependencies Updated \n :heavy_exclamation_mark: = Update Disabled by ' + constants.CIConfigYamlFile.name)
      .write()

    core.endGroup()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
