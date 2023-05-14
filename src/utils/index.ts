import path from 'node:path'
import { window, workspace } from 'vscode'
import type { TextEditor, Uri } from 'vscode'
// get current project path
export function getProjectPath(isFsPath = false): string | undefined {
  let currentUri: Uri | undefined
  if (Array.isArray(workspace.workspaceFolders)) {
    if (workspace.workspaceFolders.length === 1) {
      currentUri = workspace.workspaceFolders[0].uri
    }
    else if (workspace.workspaceFolders.length > 1) {
      const activeTextEditor: TextEditor | undefined = window.activeTextEditor
      if (activeTextEditor) {
        const workspaceFolder = workspace.workspaceFolders.find((folder: any) =>
          activeTextEditor.document.uri.path.startsWith(folder.uri.path),
        )
        if (workspaceFolder)
          currentUri = workspaceFolder.uri
      }
    }
    return !currentUri ? undefined : isFsPath ? currentUri.fsPath : currentUri.path
  }
}

export function getConfig(name: string) {
  return workspace.getConfiguration('open-browser').get(name)
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

const textTransforms: Record<string, (t: string) => string> = {
  uppercase: (t: string) => t.toUpperCase(),
  lowercase: (t: string) => t.toLowerCase(),
  capitalize: (t: string) => t.trim().split(/[-_]/g).map(capitalize).join(' '),
}

// get current project basename
export function getProjectName(projectPath: string): string {
  const projectName = path.basename(projectPath)
  const transform = getConfig('textTransform') as string
  if (textTransforms[transform])
    return textTransforms[transform](projectName)
  return projectName
}

export function getProjectColor(projectPath: string) {
  const isColorful = getConfig('colorful')
  if (!isColorful)
    return
  const color = getConfig('color')
  if (!projectPath)
    return color || undefined
  return color || stringToColor(projectPath)
}

export function stringToColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF
    colour += (`00${value.toString(16)}`).slice(-2)
  }
  return colour
}
