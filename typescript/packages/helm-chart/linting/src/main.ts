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
    // Specify the directory to start searching from
    const GITHUB_WORKSPACE = String(process.env[constants.envvars.GITHUB_WORKSPACE])

    utils.assertNullOrEmpty(GITHUB_WORKSPACE, 'Missing env `' + constants.envvars.GITHUB_WORKSPACE + '`!')

    const pathGitRepository = path.parse(GITHUB_WORKSPACE)
    let utilsHelmChart = utils.HelmChart.getInstance()

    let helmChartListingFileContent: string = utilsHelmChart.getListingFileContent(pathGitRepository)

    let helmChartListingYamlDoc = new yaml.Document(yaml.parse(helmChartListingFileContent))
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    core.startGroup('Helm Chart Linting')

    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    let tableRows = []
    let tableHeader = [
      { data: 'UID Helm Chart', header: true },
      { data: 'Result', header: true },
      { data: 'Folder', header: true }
    ]

    core.summary.addHeading('Helm Chart Linting Results').addRaw(summaryRawContent)
    // loop through all helm charts and do dependency update
    for (const item of Object.keys(helmChartListingYamlDoc.toJSON())) {
      let yamlitem = utils.unrapYamlbyKey(helmChartListingYamlDoc, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)

      let dir: path.ParsedPath = path.parse(listingYamlDir)

      if (utils.isFunctionEnabled(dir, constants.Functionality.helmChartLinting, true)) {
        let helmOptions: string[] = []
        let options: yaml.Document = new yaml.Document('')

        if (utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.helmChartLinting) !== false) {
          options = utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.helmChartLinting)
        }

        if (utils.unrapYamlbyKey(options, '--strict', true)) {
          helmOptions.push('--strict')
        }
        if (utils.unrapYamlbyKey(options, '--with-subcharts', false)) {
          helmOptions.push('--with-subcharts')
        }

        await utilsHelmChart.lint(dir, helmOptions)
        tableRows.push([item, '✅', listingYamlRelativePath])
      } else {
        tableRows.push([item, ':heavy_exclamation_mark:', listingYamlRelativePath])
      }
    }
    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails('Legende', '✅ = No linting warnings/errors \n :heavy_exclamation_mark: = Linting Disabled by ' + constants.HelmChartFiles.ciConfigYaml)
      .write()

    core.endGroup()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
