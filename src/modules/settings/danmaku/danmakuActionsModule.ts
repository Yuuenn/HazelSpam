import { watch } from 'vue'
import { dq } from '@/utils/dom'
import { BILIAPI } from '@/utils/bili'
import { useDiscreteAPI } from '@/utils/ui'
import { useBiliStore } from '@/stores/useBiliStore'
import BaseModule from '@/modules/BaseModule'

class DanmakuActionsModule extends BaseModule {
    config = this.moduleStore.moduleConfig.settings.danmakuActions
    private readonly inlineActionButtonClass = 'hazelspam-inline-action-btn'
    private readonly inlineActionIconClass = 'hazelspam-inline-action-btn__icon'
    private readonly actionGroupClass = 'hazelspam-dm-action-group'
    private dmObserver: MutationObserver | null = null
    private waitForDmAreaTimer: number | null = null
    private configWatchReady = false
    private pendingBindNodes = new Set<HTMLElement>()
    private pendingBindFrameId: number | null = null

    private stopWaitingForDanmakuArea() {
        if (this.waitForDmAreaTimer === null) return
        window.clearInterval(this.waitForDmAreaTimer)
        this.waitForDmAreaTimer = null
    }

    private isTextDanmakuItem(node: Node | null): node is HTMLElement {
        if (!(node instanceof HTMLElement)) return false
        if (!node.classList.contains('chat-item')) return false
        if (!node.classList.contains('danmaku-item')) return false
        if (node.classList.contains('chat-emoticon') || node.classList.contains('bulge-emoticon')) {
            return false
        }

        const msg = node.dataset.danmaku?.trim() ?? ''
        return msg.length > 0
    }

    // 仅保留直接渲染模式：在弹幕列表项旁挂载“复制/+1”按钮。
    private bindDanmakuItem(node: HTMLElement) {
        if (!this.config.enable) return
        this.renderDirectly(node)
    }

    private clearPendingBindTasks() {
        this.pendingBindNodes.clear()
        if (this.pendingBindFrameId !== null) {
            window.cancelAnimationFrame(this.pendingBindFrameId)
            this.pendingBindFrameId = null
        }
    }

    private flushPendingBindNodes() {
        this.pendingBindFrameId = null
        if (!this.config.enable) {
            this.pendingBindNodes.clear()
            return
        }

        for (const node of this.pendingBindNodes) {
            if (!document.contains(node) || !this.isTextDanmakuItem(node)) {
                continue
            }
            this.bindDanmakuItem(node)
        }

        this.pendingBindNodes.clear()
    }

    private schedulePendingBindFlush() {
        if (this.pendingBindFrameId !== null) {
            return
        }

        this.pendingBindFrameId = window.requestAnimationFrame(() => {
            this.flushPendingBindNodes()
        })
    }

    private queueDanmakuItem(node: HTMLElement) {
        if (!this.config.enable || !this.isTextDanmakuItem(node)) {
            return
        }

        this.pendingBindNodes.add(node)
    }

    private bindFromAddedNode(node: Node) {
        let hasPendingNode = false

        if (this.isTextDanmakuItem(node)) {
            this.queueDanmakuItem(node)
            hasPendingNode = true
        }

        if (!(node instanceof HTMLElement)) return
        node.querySelectorAll<HTMLElement>('.chat-item.danmaku-item').forEach((item) => {
            if (this.isTextDanmakuItem(item)) {
                this.queueDanmakuItem(item)
                hasPendingNode = true
            }
        })

        if (hasPendingNode) {
            this.schedulePendingBindFlush()
        }
    }

    private scanExistingDanmakuItems(scope: ParentNode = document) {
        if (!this.config.enable) return
        let hasPendingNode = false
        scope.querySelectorAll<HTMLElement>('.chat-item.danmaku-item').forEach((node) => {
            if (this.isTextDanmakuItem(node)) {
                this.queueDanmakuItem(node)
                hasPendingNode = true
            }
        })

        if (hasPendingNode) {
            this.schedulePendingBindFlush()
        }
    }

    private clearDirectActionButtons() {
        this.clearPendingBindTasks()
        document.querySelectorAll(`.${this.actionGroupClass}`).forEach((group) => group.remove())
    }

    private startDanmakuObserver(dmArea: Element) {
        this.dmObserver?.disconnect()
        this.clearPendingBindTasks()
        this.dmObserver = new MutationObserver((mutationsList) => {
            if (!this.config.enable) return
            mutationsList.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => this.bindFromAddedNode(node))
            })
        })
        this.dmObserver.observe(dmArea, { childList: true, subtree: true })
        this.scanExistingDanmakuItems(dmArea)
    }

    // 弹幕容器可能晚于脚本初始化出现，先轮询直到可用。
    private ensureDanmakuObserver() {
        const dmArea = dq('.chat-items')
        if (dmArea) {
            this.stopWaitingForDanmakuArea()
            this.startDanmakuObserver(dmArea)
            return
        }

        if (this.waitForDmAreaTimer !== null) return
        this.waitForDmAreaTimer = window.setInterval(() => {
            const area = dq('.chat-items')
            if (!area) return
            this.stopWaitingForDanmakuArea()
            this.startDanmakuObserver(area)
        }, 500)
    }

    private watchConfigState() {
        if (this.configWatchReady) return
        this.configWatchReady = true

        watch(
            () => this.config.enable,
            (enable) => {
                if (enable) {
                    this.scanExistingDanmakuItems()
                } else {
                    this.clearDirectActionButtons()
                }
            },
            { immediate: true }
        )
    }

    private getDanmakuText(node: HTMLElement) {
        return node.dataset.danmaku?.trim() ?? ''
    }

    private createInlineActionButton(
        iconClass: string,
        title: string,
        onClick: (event: MouseEvent) => void
    ) {
        const button = document.createElement('button')
        button.type = 'button'
        button.title = title
        button.ariaLabel = title
        button.classList.add(this.inlineActionButtonClass)

        const icon = document.createElement('i')
        icon.className = `${iconClass} ${this.inlineActionIconClass}`.trim()
        button.appendChild(icon)

        button.addEventListener('click', onClick)

        return button
    }

    private renderDirectly(node: HTMLElement) {
        const msg = this.getDanmakuText(node)
        if (!msg) return

        const msgEle = node.querySelector('.danmaku-item-right')
        if (!msgEle) return
        if (node.querySelector(`.${this.actionGroupClass}`)) return

        const btnContainer = document.createElement('div')
        btnContainer.classList.add(this.actionGroupClass)
        btnContainer.style.cssText =
            'display:inline-flex;align-items:center;gap:var(--hazelspam-space-2xs, 2px);' +
            'margin-left:var(--hazelspam-space-2xs, 2px);padding-top:var(--hazelspam-space-xs, 4px);vertical-align:middle;'

        const copyButton = this.createInlineActionButton('pi pi-clipboard', '复制弹幕', (e) => {
            e.stopPropagation()
            void this.dmCopy(msg)
        })

        const repeatButton = this.createInlineActionButton('pi pi-comments', '弹幕 +1', (e) => {
            e.stopPropagation()
            void this.dmRepeat(msg)
        })

        btnContainer.append(copyButton, repeatButton)
        msgEle.after(btnContainer)
    }

    private async dmRepeat(msg: string) {
        const content = msg.trim()
        if (!content) return

        const roomid = useBiliStore().BilibiliLive?.ROOMID
        const { notification } = useDiscreteAPI(['notification'])
        if (!roomid) {
            notification.error({
                title: '发送失败',
                content: '未获取到直播间信息，请刷新页面重试',
                closable: false,
                duration: 3000
            })
            return
        }

        try {
            const response = await BILIAPI.sendMsg(content, roomid)
            if (response.code === 0) {
                this.logger.log(`弹幕 ${content} 发送成功`, response)
                notification.success({
                    title: '发送成功',
                    content,
                    closable: false,
                    duration: 2500
                })
            } else {
                this.logger.error(`弹幕 ${content} 发送失败`, response)
                notification.error({
                    title: String(response.message ?? '发送失败'),
                    content,
                    closable: false,
                    duration: 3000
                })
            }
        } catch (error) {
            this.logger.error(`弹幕 ${content} 发送失败`, error)
            notification.error({
                title: '发送失败',
                content,
                closable: false,
                duration: 3000
            })
        }
    }

    private async dmCopy(msg: string) {
        const content = msg.trim()
        if (!content) return

        try {
            await navigator.clipboard.writeText(content)
        } catch (error) {
            this.logger.log('复制到剪切板失败', error)
            const { message } = useDiscreteAPI(['message'])
            message.error('复制失败，请检查剪切板权限')
        }
    }

    public async run() {
        this.watchConfigState()
        this.ensureDanmakuObserver()
    }
}

export default DanmakuActionsModule
