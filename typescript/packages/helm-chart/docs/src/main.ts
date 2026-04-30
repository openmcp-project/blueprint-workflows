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
    core.startGroup('Helm Documentation README.md Generation')

    let tableRows = []
    let tableHeader = [
      { data: 'UID Helm Chart', header: true },
      { data: 'Result', header: true },
      { data: 'Folder', header: true }
    ]
    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    core.summary.addHeading('Helm Documentation README.md Generation Results').addRaw(summaryRawContent)
    let updatedReadmeCount = 0

    for (const item of Object.keys(helmChartListingYamlDoc.toJSON())) {
      let yamlitem = utils.unrapYamlbyKey(helmChartListingYamlDoc, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)
      let dir: path.ParsedPath = path.parse(listingYamlDir)

      if (utils.isFunctionEnabled(dir, constants.Functionality.helmDocs, true)) {
        let helmOptions: string[] = []
        let options: yaml.Document = new yaml.Document('')

        if (utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.helmDocs) !== false) {
          options = utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.helmDocs)
        }

        if (utils.unrapYamlbyKey(options, '--document-dependency-values', true)) {
          helmOptions.push('--document-dependency-values')
        }
        if (utils.unrapYamlbyKey(options, '--documentation-strict-mode', false)) {
          helmOptions.push('--documentation-strict-mode')
        }
        if (utils.unrapYamlbyKey(options, '--skip-version-footer', false)) {
          helmOptions.push('--skip-version-footer')
        }

        helmOptions.push('--sort-values-order ' + utils.unrapYamlbyKey(options, '--sort-values-order', 'alphanum'))
        helmOptions.push('--badge-style ' + utils.unrapYamlbyKey(options, '--badge-style', 'flat-square'))
        //helmOptions.push('--output-file ' + listingYamlDir + '/' + utils.unrapYamlbyKey(options, '--output-file', 'README.md'))
        let readmeFileName = utils.unrapYamlbyKey(options, '--output-file', 'README.md')

        const templateFiles: string[] = [
          GITHUB_WORKSPACE + '/' + constants.HelmChartDoc.headerTempalteFile,
          listingYamlDir + '/' + constants.HelmChartDoc.ReadmeMdGoTmpl,
          GITHUB_WORKSPACE + '/' + constants.HelmChartDoc.footerTemplateFile
        ]

        await utilsHelmChart.generateReadmeDocumentation(dir, templateFiles, helmOptions)
        tableRows.push([item, '✅', listingYamlRelativePath])

        let result = await utils.Git.getInstance().status(GITHUB_WORKSPACE)
        let modifiedFolders: string[] = result.stdout.split('\n')

        core.debug(
          'Is ' +
            listingYamlRelativePath +
            '/' +
            readmeFileName +
            ' included in modified files? ' +
            modifiedFolders.some(str => str.includes(listingYamlRelativePath + '/' + readmeFileName))
        )

        if (modifiedFolders.some(str => str.includes(listingYamlRelativePath + '/' + readmeFileName))) {
          //if (modifiedFolders.includes('M ' + listingYamlRelativePath + '/' + readmeFileName)) {
          await utils.Git.getInstance().add(dir, GITHUB_WORKSPACE)
          await utils.Git.getInstance().commit('chore(ci): update Helm Chart ' + listingYamlRelativePath + '/' + readmeFileName + ' file', GITHUB_WORKSPACE)
          updatedReadmeCount++
        }
      } else {
        tableRows.push([item, ':heavy_exclamation_mark:', listingYamlRelativePath])
      }
    }

    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails('Legende', '✅ = README.md generated \n :heavy_exclamation_mark: = README.md generation disabled by ' + constants.HelmChartFiles.ciConfigYaml)
      .write()
    core.endGroup()

    if (updatedReadmeCount > 0) {
      core.info('Helm Documentation README.md generation completed. Updated ' + updatedReadmeCount + ' README.md files.')
      await utils.Git.getInstance().push(GITHUB_WORKSPACE)
    } else {
      core.info('Helm Documentation README.md generation completed. No README.md files were updated.')
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
