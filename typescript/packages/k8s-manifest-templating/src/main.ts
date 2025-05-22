import * as core from '@actions/core'
import { utils, constants } from '../../../../typescript/packages/shared/'
import * as fs from 'fs'
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
    const manifestPath: path.FormatInputPathObject = path.parse(GITHUB_WORKSPACE + '/manifests/')
    if (fs.existsSync(path.format(manifestPath))) {
      fs.rmSync(path.format(manifestPath), { recursive: true })
    } else {
      fs.mkdirSync(path.format(manifestPath), { recursive: true })
    }
    core.startGroup('K8s Manifest Templating')

    let tableRows = []
    let tableHeader = [
      { data: 'Helm Chart', header: true },
      { data: 'Helm Chart Folder', header: true },
      { data: 'UID', header: true },
      { data: 'Result', header: true },
      { data: 'Manifest Folder', header: true }
    ]
    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    /* ==================== MANIFEST GENERATION ==================== */
    core.summary.addHeading('K8s Manifest Templating Results').addRaw(summaryRawContent)

    for (const item of Object.keys(helmChartListingYamlDoc.toJSON())) {
      let yamlitem = utils.unrapYamlbyKey(helmChartListingYamlDoc, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      let listingYamlName = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.name)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)
      let dir: path.ParsedPath = path.parse(listingYamlDir)

      if (utils.isFunctionEnabled(dir, constants.Functionality.k8sManifestTemplating, true)) {
        let manifestTargetFolder: path.FormatInputPathObject = path.parse(GITHUB_WORKSPACE + '/manifests/' + listingYamlRelativePath)

        fs.mkdirSync(path.format(manifestTargetFolder), { recursive: true })
        core.debug('Created folder: ' + path.format(manifestTargetFolder))

        let helmOptions: string[] = []
        let options: yaml.Document = new yaml.Document('')

        if (utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.k8sManifestTemplating) !== false) {
          options = utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.k8sManifestTemplating)
        }

        if (utils.unrapYamlbyKey(options, '--skip-crds', false)) {
          helmOptions.push('--skip-crds')
        }
        helmOptions.push('--output-dir "' + path.format(manifestTargetFolder) + '"')

        let helmTemplatingOptions = utilsHelmChart.readPipelineFeature(dir, constants.Functionality.k8sManifestTemplating, 'helm-charts')
        console.log('helmTemplatingOptions', helmTemplatingOptions)

        await utilsHelmChart.template(dir, '-f ' + GITHUB_WORKSPACE + '/' + listingYamlRelativePath + '/' + constants.HelmChartFiles.valuesYaml, helmOptions)
        tableRows.push([listingYamlName, listingYamlRelativePath, item, '✅', 'manifests/' + listingYamlRelativePath])
      } else {
        tableRows.push([listingYamlName, listingYamlRelativePath, item, ':heavy_exclamation_mark: Disabled', '-'])
      }
    }
    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails(
        'Legend',
        '✅ = K8s Manifest Templated and moved to ./manifest/* folder \n :heavy_exclamation_mark: = K8s Manifest Templating disabled by ' + constants.HelmChartFiles.ciConfigYaml
      )
      .write()

    let result = await utils.Git.getInstance().status(GITHUB_WORKSPACE)
    let modifiedFolders: string[] = result.stdout.split('\n')

    if (modifiedFolders.some(str => str.includes('manifests/'))) {
      await utils.Git.getInstance().add(manifestPath, GITHUB_WORKSPACE)
      await utils.Git.getInstance().commit('chore(ci): k8s manifest templated for Helm Charts', GITHUB_WORKSPACE)
      await utils.Git.getInstance().push(GITHUB_WORKSPACE)

      core.info('Modifications committed and changes pushed to remote.')
    } else {
      core.notice('No modifications to commit or push.')
    }

    core.endGroup()

    ///////////////////////////////////////////////////////////////////////////////////////////////////
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
