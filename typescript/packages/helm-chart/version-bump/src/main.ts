import * as core from '@actions/core'
//import * as github from '@actions/github'
import { utils, constants } from '../../../shared/dist'
import * as path from 'path'
import * as yaml from 'yaml'
import * as semver from 'semver'
import * as fs from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    /*
    if (github.context.eventName !== "pull_request") {
      // The core module on the other hand let's you get
      // inputs or create outputs or control the action flow
      // e.g. by producing a fatal error
      core.setFailed("Can only run on pull requests!");
      return;
    }*/
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Specify the directory to start searching from
    const BRANCH_NAME: string = utils.checkRequiredInput(constants.envvars.BRANCH_NAME)
    const BASE_BRANCH_NAME: string = utils.checkRequiredInput(constants.envvars.BASE_BRANCH_NAME)
    const SOURCE_GIT_REPO_URL: string = utils.checkRequiredInput(constants.envvars.SOURCE_GIT_REPO_URL)
    const TARGET_GIT_REPO_URL: string = utils.checkRequiredInput(constants.envvars.TARGET_GIT_REPO_URL)
    const GITHUB_WORKSPACE = String(process.env[constants.envvars.GITHUB_WORKSPACE])

    utils.assertNullOrEmpty(GITHUB_WORKSPACE, 'Missing env `' + constants.envvars.GITHUB_WORKSPACE + '`!')

    const pathGitRepository = path.parse(GITHUB_WORKSPACE)
    let utilsHelmChart = utils.HelmChart.getInstance()

    let helmChartListingFileContent: string = utilsHelmChart.getListingFileContent(pathGitRepository)

    let helmChartListingYamlDoc = new yaml.Document(yaml.parse(helmChartListingFileContent))
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    core.startGroup('Helm Chart Version Bump - modified files compared to ' + BASE_BRANCH_NAME)

    let summaryRawContent: string = '<details><summary>Found following Helm Charts...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    let tableRows = []
    let tableHeader = [
      { data: 'Helm Chart', header: true },
      { data: 'Base Branch Version', header: true },
      { data: 'Lokal Branch Version', header: true },
      { data: 'Status', header: true },
      { data: 'Folder', header: true }
    ]

    const TOKEN: string = core.getInput(constants.envvars.TOKEN) // Allow TOKEN to be optional
    let authenticatedRepoUrl = TARGET_GIT_REPO_URL

    if (TOKEN) {
      authenticatedRepoUrl = TARGET_GIT_REPO_URL.replace('https://', `https://${TOKEN}@`)
      console.log('Token found, using authenticated repo URL: ' + authenticatedRepoUrl)
    } else {
      console.log('Token not found, using unauthenticated repo URL: ' + authenticatedRepoUrl)
    }

    await utilsHelmChart.exec('git remote add upstream ' + authenticatedRepoUrl, [], { cwd: GITHUB_WORKSPACE })
    await utilsHelmChart.exec('git fetch --all', [], { cwd: GITHUB_WORKSPACE })
    await utilsHelmChart.exec('git remote -v', [], { cwd: GITHUB_WORKSPACE })
    await utilsHelmChart.exec('git diff --name-only "upstream/' + BASE_BRANCH_NAME + '..origin/' + BRANCH_NAME + '"', [], { cwd: GITHUB_WORKSPACE })

    let result = await utilsHelmChart.exec('git diff --name-only "origin/' + BASE_BRANCH_NAME + '..origin/' + BRANCH_NAME + '"', [], { cwd: GITHUB_WORKSPACE })
    const folders: string[] = result.stdout.split('\n')

    let foundHelmChartFolderModified: Record<string, string> = {}

    folders.forEach(function (value: string) {
      if (utils.isFileFoundInPath(constants.HelmChartFiles.Chartyaml, path.parse(value), path.parse(GITHUB_WORKSPACE)) !== false) {
        let dirName: string = String(utils.isFileFoundInPath(constants.HelmChartFiles.Chartyaml, path.parse(value), path.parse(GITHUB_WORKSPACE)))
        let yamlKey = utils.findYamlKeyByDir(helmChartListingFileContent, dirName)
        if (yamlKey === null) {
          throw new Error('Unable to find key in ' + constants.HelmChartFiles.listingFile + ' for dir ' + dirName)
        }
        foundHelmChartFolderModified[yamlKey] = dirName
      }
    })
    let summaryRawContentModifiedFiles: string = '<details><summary>Modified Files</summary>\n\n```yaml\n' + yaml.stringify(folders) + '\n```\n\n</details>'

    core.summary.addHeading('Helm Chart Version Bump Results').addRaw(summaryRawContentModifiedFiles).addRaw(summaryRawContent)

    for (const key of Object.keys(foundHelmChartFolderModified)) {
      let listingItem = utils.unrapYamlbyKey(helmChartListingYamlDoc, key)
      let dir = utils.unrapYamlbyKey(listingItem, 'dir')
      let relativePath = utils.unrapYamlbyKey(listingItem, 'relativePath')

      if (utils.readYamlFile(path.parse(dir + '/' + constants.HelmChartFiles.Chartyaml)) === false) {
        throw new Error('Could NOT find ' + constants.HelmChartFiles.Chartyaml + ' in ' + dir)
      }

      let chartYaml: yaml.Document = utils.readYamlFile(path.parse(dir + '/' + constants.HelmChartFiles.Chartyaml))
      let chartVersion = utils.unrapYamlbyKey(chartYaml, 'version', '0.0.0')
      let chartName = utils.unrapYamlbyKey(chartYaml, 'name', '-')

      if (utils.isFunctionEnabled(path.parse(dir), constants.Functionality.helmChartVersionBump, true)) {
        let cmdCommand: string = 'git ls-tree -r "origin/' + BASE_BRANCH_NAME + '" --name-only' //| grep -q \"" + relativePath + "/" + constants.HelmChartFiles.Chartyaml + "$\""
        let result = await utilsHelmChart.exec(cmdCommand, [], { cwd: GITHUB_WORKSPACE })
        const filesOnBaseBranch: string[] = result.stdout.split('\n')
        if (filesOnBaseBranch.includes(relativePath + '/' + constants.HelmChartFiles.Chartyaml)) {
          if(TARGET_GIT_REPO_URL !== SOURCE_GIT_REPO_URL) {
            let cmdCommand: string = 'git show "upstream/' + BASE_BRANCH_NAME + ':' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '"'
          } else {
            let cmdCommand: string = 'git show "origin/' + BASE_BRANCH_NAME + ':' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '"'
          }
          core.debug(cmdCommand)
          let result = await utilsHelmChart.exec(cmdCommand, [], { cwd: GITHUB_WORKSPACE })
          let baseBranchChartYamlDoc: yaml.Document = new yaml.Document(yaml.parse(result.stdout))

          let baseBranchChartVersion = utils.unrapYamlbyKey(baseBranchChartYamlDoc, 'version', '0.0.0')
          // TODO: could maybe break, if .version is not semver parsable??
          let baseBranchBumpedVersion = String(semver.inc(baseBranchChartVersion, 'patch'))
          let semVerAction: string = '-'
          switch (semver.compare(chartVersion, baseBranchBumpedVersion)) {
            case 1: // chartVersion > baseBranchBumpedVersion
              semVerAction = '✅ Okay'
              break
            case -1: // chartVersion < baseBranchBumpedVersion
              semVerAction = ':eight_spoked_asterisk: Bumped'
              chartYaml.set('version', baseBranchBumpedVersion)

              const options = {
                lineWidth: 0 // Prevents automatic line wrapping
              }

              fs.writeFileSync(GITHUB_WORKSPACE + '/' + relativePath + '/' + constants.HelmChartFiles.Chartyaml, yaml.stringify(chartYaml, options), 'utf-8')

              await utils.Git.getInstance().add(path.parse(GITHUB_WORKSPACE + '/' + relativePath + '/' + constants.HelmChartFiles.Chartyaml), GITHUB_WORKSPACE)
              await utils.Git.getInstance().commit(
                'chore(ci): update ' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '.version ' + chartVersion + '- >' + baseBranchBumpedVersion + '"',
                GITHUB_WORKSPACE
              )

              break
            case 0: // chartVersion == baseBranchBumpedVersion
              semVerAction = '✅ Okay'
              break

            default:
              semVerAction = '⁉️ :interrobang: WTF??'
              break
          }
          tableRows.push([chartName, baseBranchChartVersion, chartVersion, semVerAction, relativePath])
        } else {
          // Chart.yaml does not EXIST on BASE_BRANCH_NAME -> new Helm Chart!
          tableRows.push([chartName, '-', chartVersion, ':sparkle: ❇️ New', relativePath])
        }
      } else {
        tableRows.push([chartName, '-', chartVersion, '➖ Disabled', relativePath])
      }
    }

    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails(
        'Legende',
        '✅ = Lokal Branch Chart.yaml .version is equal or greater than Base Branch Chart.yaml .version \n\n :eight_spoked_asterisk: = Lokal Branch Chart.yaml version was bumped \n :sparkle: = Helm Chart does NOT exist on ' +
          BASE_BRANCH_NAME +
          ' -> Bump intial Version \n ➖ = Version Bump Feature Disabled by ' +
          constants.HelmChartFiles.ciConfigYaml
      )
      .write()

    core.endGroup()
    await utils.Git.getInstance().push(GITHUB_WORKSPACE)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
