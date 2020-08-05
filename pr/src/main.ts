import {setFailed, getInput} from '@actions/core'
import {env} from 'process'
import * as fs from 'fs'
import * as shell from 'shelljs'
import {publishResults, UploadOptions} from 'nunit-result/src/publish-results'

async function run(): Promise<void> {
  const wd = process.cwd()
  try {
    const accessToken = getInput('access-token')
    const imageName = getInput('image-name')
    const dockerFilePath = getInput('docker-file-path')
    const dockerTarget = getInput('docker-target')
    const workingDirectory = getInput('working-directory')
    const srcReplacement = getInput('src-replacement')

    process.chdir(workingDirectory)

    let res = shell.exec(
      `docker build -t ${imageName} --target ${dockerTarget} -f ${dockerFilePath} .`
    )
    if (res.code !== 0) {
      setFailed(res.stderr)
      return
    }

    const workspacePath = env['GITHUB_WORKSPACE']
    const testResultsPath = `${workspacePath}/test-results`
    fs.mkdirSync(testResultsPath)

    res = shell.exec(
      `docker run -v ${testResultsPath}:/app/test-results ${imageName}`
    )

    //try to upload tests results before checking the code
    const options = new UploadOptions(
      `${testResultsPath}/*.xml`,
      accessToken,
      'PR Tests Report',
      30,
      srcReplacement
    )
    await publishResults(options)

    if (res.code !== 0) {
      setFailed(res.stderr)
      return
    }
  } catch (error) {
    setFailed(error.message)
  } finally {
    process.chdir(wd)
  }
}

run()
