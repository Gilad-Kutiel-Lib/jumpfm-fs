import { JumpFm, Panel, Item } from 'jumpfm-api'

import * as fs from 'fs'
import * as watch from 'node-watch'
import * as path from 'path'



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

    jumpFm.panels.forEach((panel, i) => {
        const ll = () => {
            const fullPath = panel.getUrl().path
            fs.readdir(fullPath, (err, files) => {
                panel.setItems(
                    files
                        .map(name => ({
                            name: name
                            , path: path.join(fullPath, name)
                        }))
                        .filter(item => fs.existsSync(item.path))
                        .map(item => ({
                            name: item.name
                            , path: item.path
                            , isDirectory: () => fs.statSync(item.path).isDirectory()
                            , open: () => jumpFm.electron.shell.openItem(item.path)
                        }))
                )
            })
        }

        panel.filterSet('hidden', filterHidden)

        panel.onItemsAdded((items: Item[]) => {
            if (panel.getUrl().protocol) return
            items.forEach(item => {
                fs.stat(item.path, (err, stat) => {
                    item.setTime(stat.mtime.getTime())
                    item.setSize(stat.size)
                })
            })
        })

        panel.onCd(() => {
            console.log('stopping')
            jumpFm.watchStop('fs' + i)
            const url = panel.getUrl()

            if (url.protocol) return

            ll()
            jumpFm.watchStart('fs' + i, url.path, () => {
                console.log('WATCH TRIGGER', i)
                ll()
            })
        })
    })

    jumpFm.bind('toggleHiddenFiles', ['h'], () => {
        showHiddenFiles = !showHiddenFiles
        updateStatus()
        jumpFm.panels.forEach(panel => {
            if (showHiddenFiles) panel.filterRemove('hidden')
            else panel.filterSet('hidden', filterHidden)
        })
    })
    updateStatus()
}