import { JumpFm, Panel, Item } from 'jumpfm-api'

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
            )
        })
    }
}

let showHiddenFiles = false

const filterHidden = (item) => item.name.indexOf('.') != 0

export const load = (jumpFm: JumpFm) => {
    const updateStatus = () => {
        jumpFm.statusBar.msg('fs')
            .setText('.h')
            .setType(showHiddenFiles ? 'warn' : 'info')
            .setTooltip(
            (showHiddenFiles ? 'Showing' : 'Not Showing')
            + ' dot files'
            )
    }

    const panels = jumpFm.panels
    const fss: FileSystem[] = panels.map(panel => new FileSystem(jumpFm, panel))

    const onItemsAdded = (items: Item[]) => {
        items.forEach(item => {
            fs.stat(item.path, (err, stat) => {
                item.setTime(stat.mtime.getTime())
                item.setSize(stat.size)
            })
        })
    }

    panels.forEach(panel => {
        panel.filterSet('hidden', filterHidden)
        panel.onItemsAdded(onItemsAdded)
    })

    jumpFm.bind('toggleHiddenFiles', ['h'], () => {
        showHiddenFiles = !showHiddenFiles
        updateStatus()
        panels.forEach(panel => {
            if (showHiddenFiles) panel.filterRemove('hidden')
            else panel.filterSet('hidden', filterHidden)
        })
    })
    updateStatus()
}