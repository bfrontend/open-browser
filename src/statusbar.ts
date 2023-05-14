import path from 'node:path'
import { StatusBarAlignment, Uri, commands, env, window } from 'vscode'
import type { StatusBarItem, TextEditor } from 'vscode'
import _ from 'lodash'
import findUp from 'findup-sync'
import type { SimpleGit } from 'simple-git'
import simpleGit from 'simple-git'
import { getConfig, getProjectColor, getProjectName, getProjectPath } from './utils'

const OPEN_COMMAND = 'open-repository.open'

class StatusBar {
  statusBar: StatusBarItem
  projectPath = ''
  browserUrl = ''
  constructor() {
    this.statusBar = window.createStatusBarItem(StatusBarAlignment.Left, getConfig('alignPriority') as number)
    const projectPath = getProjectPath()
    if (projectPath) {
      this.projectPath = projectPath
      this.getBrowserUrl().then(() => {
        this.initCommand()
        this.initBar()
      })
    }
    else {
      this.hideStatusBar()
    }
  }

  watchEditorChange() {
    return window.onDidChangeActiveTextEditor((textEditor: TextEditor | undefined) => {
      this.getBrowserUrl(textEditor)
    })
  }

  initCommand() {
    commands.registerCommand(OPEN_COMMAND, async () => {
      if (this.browserUrl)
        env.openExternal (Uri.parse (this.browserUrl))
      else
        window.showInformationMessage('You have to open a git project before being able to open it in browser')
    })
    this.statusBar.command = OPEN_COMMAND
  }

  async getBrowserUrl(textEditor?: TextEditor): Promise<string | undefined> {
    const gitPath = await this.getGitPath()
    if (!gitPath)
      return

    const repoInfo = await this.getRepoInfo(gitPath)
    const { repourl, branch } = repoInfo
    const activeTextEditor = textEditor || window.activeTextEditor
    let filePath, lines
    if (activeTextEditor) {
      const editorPath = activeTextEditor.document.uri.fsPath
      filePath = editorPath ? editorPath.substring (this.projectPath.length + 1).replace(/\\/g, '/') : undefined
      lines = this.getLines(activeTextEditor)
    }
    this.browserUrl = _.compact([repourl, 'blob', branch, filePath, lines]).join('/')
  }

  getLines(textEditor: TextEditor) {
    const useLocalRange = getConfig('useLocalRange')
    if (!useLocalRange)
      return
    const useLocalLine = getConfig('useLocalLine')
    const selections = textEditor.selections
    let lines = ''
    if (selections.length === 1) {
      const selection = selections[0]
      if (!selection.isEmpty) {
        if (selection.start.line === selection.end.line)

          lines = `#L${selection.start.line + 1}`

        else

          lines = `#L${selection.start.line + 1}-L${selection.end.line + 1}`
      }
      else if (useLocalLine) {
        lines = `#L${selection.start.line + 1}`
      }
    }
    return lines
  }

  async getBranch(git: SimpleGit): Promise<string> {
    const branches = await git.branch()
    return branches.current
  }

  async getHash(git: SimpleGit): Promise<string> {
    return (await (git.revparse(['HEAD']))).trim()
  }

  async getRepoInfo(gitPath: string): Promise<{ branch: string; repourl: string; hash: string }> {
    const git = this.getGit(gitPath)
    const remotes = await git.getRemotes(true)
    const remoteName = getConfig('remoteName') || 'origin'
    const useLocalBranch = getConfig('useLocalBranch') as boolean
    const branch = useLocalBranch ? await this.getBranch(git) : getConfig('branch') as string
    const hash = await this.getHash(git)
    const targetRemote = remotes.find(remote => remote.name === remoteName)
    if (targetRemote) {
      let repourl = (targetRemote.refs.fetch || targetRemote.refs.push).replace(/\.git$/, '')
      const match = /^git@(.*\.[^.:/]+)[:/]([^/]+)\/(.*?)(?:\.git|\/)?$/.exec(repourl)
      if (match) {
        const [_, domain, name, project] = match
        this.updateToolTip(domain)
        repourl = `https://${domain}/${name}/${project}`
      }
      else {
        const domain = repourl.replace(/https?:\/\//, '').split('/')[0]
        this.updateToolTip(domain)
      }
      return {
        repourl,
        branch,
        hash,
      }
    }
    return {
      repourl: '',
      branch,
      hash,
    }
  }

  getGit(repoPath: string) {
    return _.bindAll(simpleGit(repoPath), ['branch', 'getRemotes'])
  }

  async getGitPath() {
    const { activeTextEditor } = window
    const editorPath = activeTextEditor && activeTextEditor.document.uri.fsPath
    const rootPath = getProjectPath(true)
    const foundPath = await findUp('.git', { cwd: editorPath || rootPath })
    if (foundPath) {
      const wrapperPath = path.dirname(foundPath)
      return wrapperPath
    }
  }

  hideStatusBar() {
    this.statusBar.text = ''
    this.statusBar.hide()
  }

  updateToolTip(domain: string) {
    this.statusBar.tooltip = `Open in ${domain}`
  }

  initBar() {
    const projectName = getProjectName(this.projectPath)
    this.statusBar.text = `$(github) ${projectName}`
    this.statusBar.color = getProjectColor(this.projectPath)
  }

  show() {
    this.statusBar.show()
  }
}

export default StatusBar
