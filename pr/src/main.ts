import {setFailed, getInput} from '@actions/core'
import {env} from 'process'
import * as fs from 'fs'
import * as shell from 'shelljs'
import {publishResults, UploadOptions} from 'nunit-result/src/publish-results'

async function run(): Promise<void> {
  try {
    const accessToken = getInput('access-token')
    const imageName = getInput('image-name')
    const dockerFilePath = getInput('docker-file-path')
    const dockerTarget = getInput('docker-target')

    const workspacePath = env['GITHUB_WORKSPACE']
    const testResultsPath = `${workspacePath}/test-results`
    fs.mkdirSync(testResultsPath)

    let res = shell.exec(
      `docker build -t ${imageName} --target ${dockerTarget} -f ${dockerFilePath} .`
    )
    if (res.code !== 0) {
      setFailed(res.stderr)
      return
    }
    res = shell.exec(
      `docker run -v ${testResultsPath}:/app/test-results ${imageName}`
    )
    if (res.code !== 0) {
      setFailed(res.stderr)
      return
    }

    const options = new UploadOptions(
      testResultsPath,
      accessToken,
      'Tests Report',
      30
    )
    await publishResults(options)
  } catch (error) {
    setFailed(error.message)
  }
}

run()
