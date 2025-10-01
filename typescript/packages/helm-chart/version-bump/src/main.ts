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
      { data: 'Local Branch Version', header: true },
      { data: 'Base Branch Version', header: true },
      { data: 'New Version', header: true },
      { data: 'Status', header: true },
      { data: 'Folder', header: true }
    ]

    let result = await utilsHelmChart.exec('git status', [], { cwd: GITHUB_WORKSPACE })
    if (TARGET_GIT_REPO_URL !== SOURCE_GIT_REPO_URL) {
      const TOKEN: string = core.getInput(constants.envvars.TOKEN) // Allow TOKEN to be optional
      let authenticatedRepoUrl = TARGET_GIT_REPO_URL

      if (TOKEN) {
        authenticatedRepoUrl = TARGET_GIT_REPO_URL.replace('https://', `https://${TOKEN}@`)
        console.log('Token found, using authenticated repo URL: ' + authenticatedRepoUrl)
      } else {
        console.log('Token not found, using unauthenticated repo URL: ' + authenticatedRepoUrl)
      }

      await utilsHelmChart.exec('git remote add upstream ' + authenticatedRepoUrl, [], { cwd: GITHUB_WORKSPACE })
      await utilsHelmChart.exec('git remote -v', [], { cwd: GITHUB_WORKSPACE })
      await utilsHelmChart.exec('git fetch --all', [], { cwd: GITHUB_WORKSPACE })
      result = await utilsHelmChart.exec('git diff --name-only "upstream/' + BASE_BRANCH_NAME + '..origin/' + BRANCH_NAME + '"', [], { cwd: GITHUB_WORKSPACE })
    } else {
      result = await utilsHelmChart.exec('git diff --name-only "origin/' + BASE_BRANCH_NAME + '..origin/' + BRANCH_NAME + '"', [], { cwd: GITHUB_WORKSPACE })
    }

    const folders: string[] = result.stdout.split('\n')

    console.log('Looking for dirs with modified files')
    let foundHelmChartFolderModified: Record<string, string> = {}
    folders
      .filter(filePath => {
        const fileName = path.basename(filePath)
        return !constants.versionBumpIgnoredFiles.includes(fileName)
      })
      .forEach(function (value: string) {
        if (utils.isFileFoundInPath(constants.HelmChartFiles.Chartyaml, path.parse(value), path.parse(GITHUB_WORKSPACE)) !== false) {
          let dirName: string = String(utils.isFileFoundInPath(constants.HelmChartFiles.Chartyaml, path.parse(value), path.parse(GITHUB_WORKSPACE)))
          let yamlKey = utils.findYamlKeyByDir(helmChartListingFileContent, dirName)
          if (yamlKey === null) {
            throw new Error('Unable to find key in ' + constants.HelmChartFiles.listingFile + ' for dir ' + dirName)
          }
          foundHelmChartFolderModified[yamlKey] = dirName
          core.debug('foundHelmChartFolderModified[' + yamlKey + '] = ' + dirName)
        }
      })
    let summaryRawContentModifiedFiles: string = '<details><summary>Modified Files</summary>\n\n```yaml\n' + yaml.stringify(folders) + '\n```\n\n</details>'

    core.summary.addHeading('Helm Chart Version Bump Results').addRaw(summaryRawContentModifiedFiles).addRaw(summaryRawContent)

    console.log('Looking for ' + constants.HelmChartFiles.Chartyaml + ' files')
    let cmdChartSearch: string = '/bin/bash -c "git ls-tree -r \"origin/' + BASE_BRANCH_NAME + '\" --name-only | grep ' + constants.HelmChartFiles.Chartyaml + ' || true"'
    let resultFiles = await utilsHelmChart.exec(cmdChartSearch, [], { cwd: GITHUB_WORKSPACE })
    const filesOnBaseBranch: string[] = resultFiles.stdout.split(/\r?\n/)
    for (const file of filesOnBaseBranch) {
      core.debug(file)
    }

    for (const key of Object.keys(foundHelmChartFolderModified)) {
      console.log('Processing ' + key)
      let listingItem = utils.unrapYamlbyKey(helmChartListingYamlDoc, key)
      let dir = utils.unrapYamlbyKey(listingItem, 'dir')
      let relativePath = utils.unrapYamlbyKey(listingItem, 'relativePath')
      core.debug('dir: ' + key + ' relativePath: ' + relativePath)

      if (utils.readYamlFile(path.parse(dir + '/' + constants.HelmChartFiles.Chartyaml)) === false) {
        throw new Error('Could NOT find ' + constants.HelmChartFiles.Chartyaml + ' in ' + dir)
      }

      let chartYaml: yaml.Document = utils.readYamlFile(path.parse(dir + '/' + constants.HelmChartFiles.Chartyaml))
      let chartVersion = utils.unrapYamlbyKey(chartYaml, 'version', '0.0.0') //Chart version in local branch
      let chartName = utils.unrapYamlbyKey(chartYaml, 'name', '-')

      if (utils.isFunctionEnabled(path.parse(dir), constants.Functionality.helmChartVersionBump, true)) {
        if (filesOnBaseBranch.includes(relativePath + '/' + constants.HelmChartFiles.Chartyaml)) {
          console.log('Found ' + constants.HelmChartFiles.Chartyaml + ' in ' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '. Bumping version...')
          let cmdShowChart: string = ''
          if (TARGET_GIT_REPO_URL !== SOURCE_GIT_REPO_URL) {
            console.log('Using upstream repo URL: ' + SOURCE_GIT_REPO_URL)
            cmdShowChart = '/bin/bash -c "git show \"upstream/' + BASE_BRANCH_NAME + ':' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '\" || echo \"version: 0.0.0\""'
          } else {
            console.log('Using origin repo URL: ' + SOURCE_GIT_REPO_URL)
            cmdShowChart = '/bin/bash -c "git show \"origin/' + BASE_BRANCH_NAME + ':' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '\" || echo \"version: 0.0.0\""'
          }
          core.debug(cmdShowChart)
          let result = await utilsHelmChart.exec(cmdShowChart, [], { cwd: GITHUB_WORKSPACE })
          let baseBranchChartYamlDoc: yaml.Document = new yaml.Document(yaml.parse(result.stdout))

          let baseBranchChartVersion = utils.unrapYamlbyKey(baseBranchChartYamlDoc, 'version', '0.0.0') // Chart version in base branch
          // TODO: could maybe break, if .version is not semver parsable??
          let baseBranchBumpedVersion = String(semver.inc(baseBranchChartVersion, 'patch')) // Bumped chart version in base branch
          let semVerAction: string = '-'
          switch (semver.compare(chartVersion, baseBranchChartVersion)) {
            case 1: // chartVersion > baseBranchChartVersion
              console.log('Chart version is greater than base branch bumped version')
              if (semver.major(chartVersion) > semver.major(baseBranchBumpedVersion)) {
                semVerAction = '✅❗ Okay. Major Version increase!'
              } else if (semver.minor(chartVersion) > semver.minor(baseBranchBumpedVersion)) {
                semVerAction = '✅❗ Okay. Minor Version increase!'
              } else {
                semVerAction = '✅ Okay. Patch Version increase!'
              }
              baseBranchBumpedVersion = chartVersion
              break
            case -1: // chartVersion <= baseBranchChartVersion
            case 0:
              console.log('Chart version is lesser or equal to base branch  version')
              semVerAction = '✳️ Bumped'

              chartYaml.set('version', baseBranchBumpedVersion)

              const options = {
                lineWidth: 0 // Prevents automatic line wrapping
              }

              fs.writeFileSync(GITHUB_WORKSPACE + '/' + relativePath + '/' + constants.HelmChartFiles.Chartyaml, yaml.stringify(chartYaml, options), 'utf-8')

              await utils.Git.getInstance().add(path.parse(GITHUB_WORKSPACE + '/' + relativePath + '/' + constants.HelmChartFiles.Chartyaml), GITHUB_WORKSPACE)
              await utils.Git.getInstance().commit(
                'chore(ci): update ' + relativePath + '/' + constants.HelmChartFiles.Chartyaml + '.version ' + chartVersion + ' -> ' + baseBranchBumpedVersion + '"',
                GITHUB_WORKSPACE
              )

              break
            default:
              // This should not happen, but if it does, we need to handle it
              console.warn('Chart version is not comparable to base branch version')
              semVerAction = '⁉️ WTF??'
              break
          }
          tableRows.push([chartName, chartVersion, baseBranchChartVersion, baseBranchBumpedVersion, semVerAction, relativePath])
        } else {
          // Chart.yaml does not EXIST on BASE_BRANCH_NAME -> new Helm Chart!
          tableRows.push([chartName, chartVersion, '-', chartVersion, '❇️ New', relativePath])
        }
      } else {
        tableRows.push([chartName, chartVersion, '-', chartVersion, '➖ Disabled', relativePath])
      }
    }

    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails(
        'Legend',
        '✅ = Local branch Chart.yaml .version is already greater than Base branch Chart.yaml .version\n' +
          '✳️ = Local Branch Chart.yaml version was bumped automatically by patch version\n' +
          '❇️ = Helm Chart does NOT exist on Base branch, using local version \n' +
          '❗ = Uncommon situation, please check manually \n' +
          '➖ = Version Bump Feature Disabled by ' +
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
