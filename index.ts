import { JumpFm, Panel } from 'jumpfm-api'

import * as fs from 'fs-extra'
import * as watch from 'node-watch'
import * as path from 'path'


var showHiddenFiles = false

class FileSystem {
    watcher = { close: () => { } }
    readonly maxFiles: number;
    readonly panel: Panel
    readonly jumpFm: JumpFm

    constructor(jumpFm: JumpFm, panel: Panel) {
        this.jumpFm = jumpFm
        this.maxFiles = jumpFm.settings.getNum('maxFiles', 1000)
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

    readDirAndSlice = (fullPath: string, cb: (files: string[]) => void): void => {
        fs.readdir(fullPath, (err, items) => {
            console.log('items')
            if (items.length <= this.maxFiles) return cb(items)
            this.jumpFm.statusBar.warn('fs', {
                txt: 'fs warn',
                dataTitle: `Showing only ${this.maxFiles} files out of ${items.length}`
            }, 15000)
            cb(items.slice(0, this.maxFiles))
        })
    }

    ll = () => {
        const fullPath = this.panel.getPath()
        this.readDirAndSlice(fullPath, (files) => {
            this.panel.setItems(
                files
                    .filter(name => showHiddenFiles || name.indexOf('.') != 0)
                    .map(name => path.join(fullPath, name))
                    .filter(fullPath => fs.existsSync(fullPath))
                    .map(fullPath => this.panel.itemFromPath(fullPath))
            )
        })
    }
}

export const load = (jumpFm: JumpFm) => {
    const panels = jumpFm.panels
    const fss: FileSystem[] = panels.map(panel => new FileSystem(jumpFm, panel))

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