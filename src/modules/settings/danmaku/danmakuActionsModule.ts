import { watch } from 'vue'
import { dq } from '@/utils/dom'
import { BILIAPI } from '@/utils/bili'
import { useDiscreteAPI } from '@/utils/ui'
import { useBiliStore } from '@/stores/useBiliStore'
import BaseModule from '@/modules/BaseModule'

interface DanmakuActionPayload {
    displayContent: string
    sendContent: string
    replyMid: number
    replyAttr: number
    replyUname: string
    replayDmid: string
}

interface NativeChatControlPanelVm {
    atUserName: string
    tempAtUserName: string
    atUid: unknown
    atReplyDmId: string
    atIsMystery: boolean
    chatInput: string
    clearAtInfo?: () => void
}

interface NativeChatComposerState {
    text: string
    atUserName: string
    tempAtUserName: string
    atUid: unknown
    atReplyDmId: string
    atIsMystery: boolean
}

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

        return this.createDanmakuActionPayload(node) !== null
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

    private getDanmakuMessageElement(node: HTMLElement) {
        return node.querySelector<HTMLElement>('.danmaku-item-right')
    }

    private parsePositiveInteger(value: string | undefined): number {
        if (!value) return 0
        const parsed = Number.parseInt(value, 10)
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return 0
        }
        return parsed
    }

    private parseBoolean(value: string | undefined): boolean {
        if (!value) return false
        return value === 'true' || value === '1'
    }

    private createDanmakuActionPayload(node: HTMLElement): DanmakuActionPayload | null {
        const msgElement = this.getDanmakuMessageElement(node)
        const msgDataset = msgElement?.dataset
        const nodeDataset = node.dataset
        const visibleText = msgElement?.textContent?.replace(/\u00a0/g, ' ') ?? ''
        const fallbackText =
            (msgDataset?.danmaku ?? nodeDataset.danmaku ?? '')?.replace(/\u00a0/g, ' ') ?? ''

        const mentionElement = msgElement?.querySelector<HTMLElement>('.reply-uname[data-uid]')
        const mentionReplyMid = this.parsePositiveInteger(mentionElement?.dataset.uid)
        const datasetReplyMid = this.parsePositiveInteger(
            msgDataset?.replymid ??
                msgDataset?.replyMid ??
                nodeDataset.replymid ??
                nodeDataset.replyMid
        )
        const replyMid = mentionReplyMid || datasetReplyMid
        const replyUname =
            mentionElement?.dataset.uname?.trim() ??
            mentionElement?.textContent?.replace(/^@/, '').trim() ??
            msgDataset?.replyUname?.trim() ??
            msgDataset?.replyuname?.trim() ??
            nodeDataset.replyUname?.trim() ??
            nodeDataset.replyuname?.trim() ??
            ''
        const mentionMystery = this.parseBoolean(mentionElement?.dataset.mystery)
        const datasetMystery = this.parseBoolean(
            msgDataset?.mystery ?? nodeDataset.mystery ?? nodeDataset.replyMystery
        )
        const replyAttr = Number(mentionMystery || datasetMystery)
        const replayDmid =
            replyMid > 0
                ? (msgDataset?.id_str ??
                  msgDataset?.idStr ??
                  nodeDataset.id_str ??
                  nodeDataset.idStr ??
                  '')
                : ''

        const mentionBodyText =
            msgElement && mentionElement
                ? Array.from(msgElement.childNodes ?? [])
                      .filter((child) => child !== mentionElement)
                      .map((child) => child.textContent?.replace(/\u00a0/g, ' ') ?? '')
                      .join('')
                : ''

        let sendContent = ''
        if (replyMid > 0) {
            sendContent = fallbackText || mentionBodyText
        } else {
            sendContent = fallbackText || visibleText
        }
        if (replyMid > 0 && replyUname) {
            const mentionPrefix = `@${replyUname}`
            if (sendContent.startsWith(mentionPrefix)) {
                sendContent = sendContent.slice(mentionPrefix.length)
            }
        }
        if (replyMid > 0 && sendContent.trim().length === 0) {
            sendContent = ''
        }
        if (sendContent.trim().length === 0) {
            if (replyMid <= 0) {
                return null
            }
        }

        const displayContent = visibleText || fallbackText
        if (displayContent.trim().length === 0 && replyMid === 0) {
            return null
        }

        return {
            displayContent,
            sendContent,
            replyMid,
            replyAttr,
            replyUname,
            replayDmid
        }
    }

    private isNativeChatControlPanelVm(value: unknown): value is NativeChatControlPanelVm {
        if (!value || typeof value !== 'object') return false

        const candidate = value as Record<string, unknown>
        return (
            typeof candidate.atUserName === 'string' &&
            typeof candidate.tempAtUserName === 'string' &&
            typeof candidate.atReplyDmId === 'string' &&
            typeof candidate.atIsMystery === 'boolean' &&
            typeof candidate.chatInput === 'string' &&
            'atUid' in candidate
        )
    }

    private getNativeChatControlPanelVm() {
        if (typeof document === 'undefined') return null
        const panel = document.querySelector<HTMLElement>('.chat-control-panel') as
            | (HTMLElement & { __vue__?: unknown })
            | null
        if (!panel) return null

        return this.isNativeChatControlPanelVm(panel.__vue__) ? panel.__vue__ : null
    }

    private getNativeChatInput() {
        if (typeof document === 'undefined') return null
        return document.querySelector<HTMLTextAreaElement>('.chat-input-ctnr textarea.chat-input')
    }

    private getNativeSendButton() {
        if (typeof document === 'undefined') return null
        return (
            Array.from(document.querySelectorAll<HTMLButtonElement>('.control-panel-ctnr button')).find(
                (button) => button.textContent?.trim() === '发送'
            ) ?? null
        )
    }

    private setNativeChatInputValue(textarea: HTMLTextAreaElement, value: string) {
        const valueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        )?.set
        if (valueSetter) {
            valueSetter.call(textarea, value)
        } else {
            textarea.value = value
        }
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
        textarea.dispatchEvent(new Event('change', { bubbles: true }))
    }

    private buildNativeMentionMessage(payload: DanmakuActionPayload) {
        const bodyText = payload.sendContent.startsWith(' ')
            ? payload.sendContent
            : ` ${payload.sendContent}`
        return `@${payload.replyUname}${bodyText}`
    }

    private shouldRestoreNativeChatComposer(state: NativeChatComposerState) {
        if (state.text.length > 0) return true
        if (state.atUserName.length > 0 || state.tempAtUserName.length > 0) return true
        return typeof state.atUid === 'number' && state.atUid > 0
    }

    private restoreNativeChatComposer(state: NativeChatComposerState) {
        const panel = this.getNativeChatControlPanelVm()
        const textarea = this.getNativeChatInput()
        if (!panel || !textarea) return

        panel.clearAtInfo?.()
        panel.atUserName = state.atUserName
        panel.tempAtUserName = state.tempAtUserName
        panel.atUid = state.atUid
        panel.atReplyDmId = state.atReplyDmId
        panel.atIsMystery = state.atIsMystery
        this.setNativeChatInputValue(textarea, state.text)
    }

    private waitForNextFrame() {
        return new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve())
        })
    }

    private async sendStructuredMentionWithNativeComposer(payload: DanmakuActionPayload) {
        if (payload.replyMid <= 0 || !payload.replyUname || payload.sendContent.trim().length === 0) {
            return false
        }

        const panel = this.getNativeChatControlPanelVm()
        const textarea = this.getNativeChatInput()
        const sendButton = this.getNativeSendButton()
        if (!panel || !textarea || !sendButton || sendButton.disabled) {
            return false
        }

        const previousState: NativeChatComposerState = {
            text: textarea.value,
            atUserName: panel.atUserName,
            tempAtUserName: panel.tempAtUserName,
            atUid: panel.atUid,
            atReplyDmId: panel.atReplyDmId,
            atIsMystery: panel.atIsMystery
        }

        const mentionPrefix = `@${payload.replyUname}`
        panel.clearAtInfo?.()
        panel.atUserName = mentionPrefix
        panel.tempAtUserName = mentionPrefix
        panel.atUid = payload.replyMid
        panel.atReplyDmId = payload.replayDmid
        panel.atIsMystery = payload.replyAttr > 0
        this.setNativeChatInputValue(textarea, this.buildNativeMentionMessage(payload))
        await this.waitForNextFrame()
        sendButton.click()

        if (this.shouldRestoreNativeChatComposer(previousState)) {
            window.setTimeout(() => {
                this.restoreNativeChatComposer(previousState)
            }, 120)
        }

        return true
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
        const payload = this.createDanmakuActionPayload(node)
        if (!payload) return

        const msgEle = this.getDanmakuMessageElement(node)
        if (!msgEle) return
        if (node.querySelector(`.${this.actionGroupClass}`)) return

        const btnContainer = document.createElement('div')
        btnContainer.classList.add(this.actionGroupClass)
        btnContainer.style.cssText =
            'display:inline-flex;align-items:center;gap:var(--hazelspam-space-2xs, 2px);' +
            'margin-left:var(--hazelspam-space-2xs, 2px);padding-top:var(--hazelspam-space-xs, 4px);vertical-align:middle;'

        const copyButton = this.createInlineActionButton('pi pi-clipboard', '复制弹幕', (e) => {
            e.stopPropagation()
            void this.dmCopy(payload.displayContent)
        })

        const repeatButton = this.createInlineActionButton('pi pi-comments', '弹幕 +1', (e) => {
            e.stopPropagation()
            void this.dmRepeat(node, payload)
        })

        btnContainer.append(copyButton, repeatButton)
        msgEle.after(btnContainer)
    }

    private async dmRepeat(_sourceNode: HTMLElement | null, payload: DanmakuActionPayload) {
        const sendContent = payload.sendContent
        if (sendContent.trim().length === 0) return
        const displayContent = payload.displayContent || sendContent
        const replyUnameForSend = payload.replyMid > 0 ? '' : payload.replyUname

        const { notification } = useDiscreteAPI(['notification'])
        if (await this.sendStructuredMentionWithNativeComposer(payload)) {
            this.logger.log(`弹幕 ${displayContent} 已通过原生输入框发送`)
            return
        }

        const roomid = useBiliStore().BilibiliLive?.ROOMID
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
            const response = await BILIAPI.sendMsg(
                sendContent,
                roomid,
                0,
                16777215,
                1,
                0,
                0,
                payload.replyMid,
                payload.replyAttr,
                payload.replayDmid,
                { appId: 100, platform: 5 },
                0,
                replyUnameForSend
            )
            if (response.code === 0) {
                this.logger.log(`弹幕 ${displayContent} 发送成功`, response)
                notification.success({
                    title: '发送成功',
                    content: displayContent,
                    closable: false,
                    duration: 2500
                })
            } else {
                this.logger.error(`弹幕 ${displayContent} 发送失败`, response)
                notification.error({
                    title: String(response.message ?? '发送失败'),
                    content: displayContent,
                    closable: false,
                    duration: 3000
                })
            }
        } catch (error) {
            this.logger.error(`弹幕 ${displayContent} 发送失败`, error)
            notification.error({
                title: '发送失败',
                content: displayContent,
                closable: false,
                duration: 3000
            })
        }
    }

    private async dmCopy(msg: string) {
        const content = msg
        if (content.trim().length === 0) return

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
