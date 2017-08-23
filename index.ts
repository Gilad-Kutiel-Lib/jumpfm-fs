import { JumpFm, Panel } from 'jumpfm-api'

import * as fs from 'fs'
import * as watch from 'node-watch'
import * as path from 'path'



class FileSystem {
    watcher = { close: () => { } }
    readonly panel: Panel
    readonly jumpFm: JumpFm

    constructor(jumpFm: JumpFm, panel: Panel) {
        this.jumpFm = jumpFm
        this.panel = panel
        panel.onCd(this.onPanelCd)
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
        const fullPath = this.panel.getUrl().path
        fs.readdir(fullPath, (err, files) => {
            this.panel.setItems(
                files
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

let showHiddenFiles = false

const filterHidden = (item) => item.name.indexOf('.') != 0

export const load = (jumpFm: JumpFm) => {
    const panels = jumpFm.panels
    const fss: FileSystem[] = panels.map(panel => new FileSystem(jumpFm, panel))

    panels.forEach(panel => panel.filterSet('hidden', filterHidden))

    jumpFm.bind('toggleHiddenFiles', ['h'], () => {
        showHiddenFiles = !showHiddenFiles
        panels.forEach(panel => {
            if (showHiddenFiles) panel.filterRemove('hidden')
            else panel.filterSet('hidden', filterHidden)
        })
    })
    // msg()
    const msg = () => {
        // jumpFm.statusBar.msg(showHiddenFiles ? ['info'] : ['info', 'del'])
        //     ('hidden', {
        //         txt: '.h',
        //         dataTitle: `${showHiddenFiles ? 'Showing' : 'Hiding'} dot files`
        //     })
    }

}