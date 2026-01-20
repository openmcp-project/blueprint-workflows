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
    core.startGroup('Helm Chart Manifest Validation')
    let tableRows = []
    let tableHeader = [
      { data: 'UID Helm Chart', header: true },
      { data: 'Result', header: true },
      { data: 'Folder', header: true }
    ]
    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    core.summary.addHeading('Helm Chart Manifest Validation Results').addRaw(summaryRawContent)

    // loop through all helm charts and do dependency update
    for (const item of Object.keys(helmChartListingYamlDoc.toJSON())) {
      let yamlitem = utils.unrapYamlbyKey(helmChartListingYamlDoc, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)

      let dir: path.ParsedPath = path.parse(listingYamlDir)

      if (utils.isFunctionEnabled(dir, constants.Functionality.helmChartValidation, true)) {
        let helmOptions: string[] = []
        let options: yaml.Document = new yaml.Document('')

        if (utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.helmChartValidation) !== false) {
          options = utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.helmChartValidation)
        }

        if (utils.unrapYamlbyKey(options, '--skip-crds', false)) {
          helmOptions.push('--skip-crds')
        }
        if (utils.unrapYamlbyKey(options, '--skip-tests', false)) {
          helmOptions.push('--skip-tests')
        }
        if (utils.unrapYamlbyKey(options, '--include-crds', false)) {
          helmOptions.push('--include-crds')
        }
        if (utils.unrapYamlbyKey(options, '--dependency-update', true)) {
          helmOptions.push('--dependency-update')
        }

        // Read ignoreWarnings from the section level (not inside options)
        const ignoreWarnings = utilsHelmChart.readIgnoreWarnings(dir, constants.Functionality.helmChartValidation)

        await utilsHelmChart.template(dir, utilsHelmChart.getHelmValueFiles(dir), helmOptions, ignoreWarnings)
        tableRows.push([item, '✅', listingYamlRelativePath])
      } else {
        tableRows.push([item, ':heavy_exclamation_mark:', listingYamlRelativePath])
      }
    }
    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails('Legende', '✅ = Manifest Validated \n :heavy_exclamation_mark: = Validation Disabled by ' + constants.HelmChartFiles.ciConfigYaml)
      .write()

    core.endGroup()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
