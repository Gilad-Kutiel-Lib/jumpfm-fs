import { JumpFm, Panel } from 'jumpfm-api'


import * as fs from 'fs-extra';
import * as watch from 'node-watch';
import * as path from 'path';


var showHiddenFiles = false

class FileSystem {
    watcher = { close: () => { } }
    readonly panel: Panel

    constructor(panel: Panel) {
        this.panel = panel
        panel.listen(this)
    }

    onPanelCd = () => {
        const url = this.panel.getUrl()
        this.watcher.close()
        if (url.protocol) return
        this.ll()
        this.watcher = watch(url.path, { recursive: false }, this.ll)
    }

    ll = () => {
        const fullPath = this.panel.getPath()
        this.panel.setItems(
            fs.readdirSync(fullPath)
                .filter(name => showHiddenFiles || name.indexOf('.') != 0)
                .map(name => path.join(fullPath, name))
                .filter(fullPath => fs.existsSync(fullPath))
                .map(fullPath => this.panel.itemFromPath(fullPath))
        )
    }
}

export const load = (jumpFm: JumpFm) => {
    const panels = jumpFm.panels
    const fss: FileSystem[] = panels.map(panel => new FileSystem(panel))

    const msg = () => {
        jumpFm.statusBar.msg(showHiddenFiles ? ['info'] : ['info', 'del'])
            ('hidden', {
                txt: '.h',
                dataTitle: `${showHiddenFiles ? 'Showing' : 'Hiding'} dot files`
            })
    }

    jumpFm.bindKeys('toggleHiddenFiles', ['h'], () => {
        showHiddenFiles = !showHiddenFiles
        fss.forEach(fs => fs.ll())
        msg()
    }).filterMode([])
    msg()
}