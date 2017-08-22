import { JumpFm, Panel } from 'jumpfm-api'

import * as fs from 'fs'
import * as watch from 'node-watch'
import * as path from 'path'


var showHiddenFiles = false

class FileSystem {
    watcher = { close: () => { } }
    readonly panel: Panel
    readonly jumpFm: JumpFm

    constructor(jumpFm: JumpFm, panel: Panel) {
        this.jumpFm = jumpFm
        this.panel = panel
        panel.listen(this)
    }

    onPanelCd = () => {
        this.watcher.close()
        const url = this.panel.getUrl()

        if (url.protocol) return

        this.ll()
        setImmediate(() => {
            let to
            this.watcher = watch(url.path, { recursive: false }, () => {
                clearTimeout(to)
                to = setTimeout(this.ll)
            })
        })
    }

    ll = () => {
        const fullPath = this.panel.getPath()
        fs.readdir(fullPath, (err, files) => {
            this.panel.setItems(
                files
                    .filter(name => showHiddenFiles || name.indexOf('.') != 0)
                    .map(name => ({
                        name: name
                        , path: path.join(fullPath, name)
                    }))
                    .filter(item => fs.existsSync(item.path))
            ).getItems().forEach(item => {
                fs.stat(item.path, (err, stat) => {
                    item.setTime(stat.mtime.getTime())
                    item.setSize(stat.size)
                })
            })
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

    // jumpFm.bindKeys('toggleHiddenFiles', ['h'], () => {
    //     showHiddenFiles = !showHiddenFiles
    //     fss.forEach(fs => fs.ll())
    //     msg()
    // }).filterMode([])
    // msg()
}