import type { ExtensionContext } from 'vscode'
import StatusBar from './statusbar'

export function activate(context: ExtensionContext) {
  const statusBar = new StatusBar()
  context.subscriptions.push(statusBar.watchEditorChange())
  statusBar.show()
}
