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

    core.startGroup(util.format(constants.Msgs.HelmChartListingFolderContaining, constants.HelmChartFiles.Chartyaml))

    // List all directories containing "Chart.yaml"
    // https://github.com/actions/toolkit/tree/main/packages/glob
    const helmChartDirs = utils.lookup(startDir, constants.HelmChartFiles.Chartyaml)
    core.debug('Directories containing ' + constants.HelmChartFiles.Chartyaml + ':' + helmChartDirs.map((item: any) => `\n- ${item}`))
    core.endGroup()

    core.startGroup(util.format(constants.Msgs.HelmChartListingFolderContaining, constants.HelmChartFiles.ciConfigYaml))

    const helmChartListingYamlDoc = new yaml.Document({})
    helmChartListingYamlDoc.commentBefore = ' Helm Chart Listing Document which contains all found Helm Charts with ' + constants.HelmChartFiles.Chartyaml

    for (const chartYamlDir of helmChartDirs) {
      let chartFileContent = fs.readFileSync(path.join(chartYamlDir, constants.HelmChartFiles.Chartyaml), {
        encoding: 'utf8'
      })
      let chartFileDoc = yaml.parseDocument(chartFileContent)
      let listingYamlKey: any = chartFileDoc.get(constants.ListingYamlKeys.name)
      let helmChartListingYamlDocKeyValue = new String().concat(path.basename(chartYamlDir), '__', listingYamlKey)

      let helmChartListingYamlItem = helmChartListingYamlDoc.createPair(helmChartListingYamlDocKeyValue, {
        dir: chartYamlDir,
        name: chartFileDoc.get(constants.ListingYamlKeys.name),
        folderName: path.basename(chartYamlDir),
        relativePath: path.relative(GITHUB_WORKSPACE, chartYamlDir),
        manifestPath: path.dirname(path.relative(GITHUB_WORKSPACE, chartYamlDir))
      })
      helmChartListingYamlDoc.add(helmChartListingYamlItem)
    }
    core.endGroup()

    core.startGroup(constants.Msgs.HelmChartListingFileYamlContent)
    core.debug(yaml.stringify(helmChartListingYamlDoc))
    core.endGroup()
    fs.writeFileSync(GITHUB_WORKSPACE + '/' + constants.HelmChartFiles.listingFile, yaml.stringify(helmChartListingYamlDoc), {
      flag: 'w'
    })

    core.notice(util.format(constants.Msgs.HelmChartListingFileWritten, constants.HelmChartFiles.listingFile))

    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'
    await core.summary.addHeading('Helm Chart Listing Results').addRaw(summaryRawContent).write()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
