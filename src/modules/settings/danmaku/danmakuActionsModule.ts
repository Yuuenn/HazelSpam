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

interface ComposerDraft {
    bodyText: string
    replyMid: number
    replyAttr: number
    replyUname: string
    replayDmid: string
}

interface NativeComposerContext {
    panel: NativeChatControlPanelVm
    textarea: HTMLTextAreaElement
    sendButton: HTMLButtonElement
    container: HTMLElement
}

interface PendingSendIntent {
    id: number
    draft: ComposerDraft
}

class DanmakuActionsModule extends BaseModule {
    config = this.moduleStore.moduleConfig.settings.danmakuActions
    private readonly inlineActionButtonClass = 'hazelspam-inline-action-btn'
    private readonly inlineActionIconClass = 'hazelspam-inline-action-btn__icon'
    private readonly actionGroupClass = 'hazelspam-dm-action-group'
    private readonly composerToolbarClass = 'hazelspam-dm-composer-toolbar'
    private readonly composerToolbarButtonClass = 'hazelspam-dm-composer-toolbar-btn'
    private readonly boundaryPunctuationRegex = /[\s,.;:!?，。！？；：、~～\-—()（）[\]【】{}<>《》"“”'‘’`]/
    private readonly sendLockDurationMs = 1000
    private readonly sendLockToastCooldownMs = 900
    private dmObserver: MutationObserver | null = null
    private waitForDmAreaTimer: number | null = null
    private waitForComposerAreaTimer: number | null = null
    private configWatchReady = false
    private pendingBindNodes = new Set<HTMLElement>()
    private pendingBindFrameId: number | null = null
    private composerToolbarElement: HTMLElement | null = null
    private crybabyToggleButton: HTMLButtonElement | null = null
    private nativeComposerListenersBound = false
    private pendingSendIntent: PendingSendIntent | null = null
    private pendingSendIntentTimer: number | null = null
    private sendIntentCounter = 0
    private sendLockUntil = 0
    private sendLockToastAt = 0
    private internalSendGuard = false

    private stopWaitingForDanmakuArea() {
        if (this.waitForDmAreaTimer === null) return
        window.clearInterval(this.waitForDmAreaTimer)
        this.waitForDmAreaTimer = null
    }

    private stopWaitingForComposerArea() {
        if (this.waitForComposerAreaTimer === null) return
        window.clearInterval(this.waitForComposerAreaTimer)
        this.waitForComposerAreaTimer = null
    }

    private clearPendingSendIntent() {
        this.pendingSendIntent = null
        if (this.pendingSendIntentTimer !== null) {
            window.clearTimeout(this.pendingSendIntentTimer)
            this.pendingSendIntentTimer = null
        }
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

    private clearComposerToolbar() {
        this.composerToolbarElement?.remove()
        this.composerToolbarElement = null
        this.crybabyToggleButton = null
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
                    this.ensureComposerEnhancements()
                } else {
                    this.sendLockUntil = 0
                    this.clearPendingSendIntent()
                    this.stopWaitingForComposerArea()
                    this.unbindNativeComposerListeners()
                    this.clearComposerToolbar()
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

    private parsePositiveIntegerFromUnknown(value: unknown): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value > 0 ? Math.floor(value) : 0
        }
        if (typeof value === 'string') {
            return this.parsePositiveInteger(value)
        }
        return 0
    }

    private normalizeMentionUname(value: string): string {
        return value.replace(/^@+/, '').trim()
    }

    private getTextLength(value: string): number {
        return Array.from(value).length
    }

    private resolveComposerLengthLimit(textarea: HTMLTextAreaElement): number {
        const textareaLimit = Number(textarea.maxLength)
        if (Number.isFinite(textareaLimit) && textareaLimit > 0) {
            return Math.floor(textareaLimit)
        }

        const storeLimit = useBiliStore().danmuLengthLimit
        if (typeof storeLimit === 'number' && Number.isFinite(storeLimit) && storeLimit > 0) {
            return Math.floor(storeLimit)
        }

        return 40
    }

    private isWithinComposerLengthLimit(textarea: HTMLTextAreaElement, value: string): boolean {
        return this.getTextLength(value) <= this.resolveComposerLengthLimit(textarea)
    }

    private toComposerDraft(payload: DanmakuActionPayload): ComposerDraft {
        return {
            bodyText: payload.sendContent,
            replyMid: payload.replyMid,
            replyAttr: payload.replyAttr,
            replyUname: this.normalizeMentionUname(payload.replyUname),
            replayDmid: payload.replayDmid
        }
    }

    private readComposerDraft(panel: NativeChatControlPanelVm, textarea: HTMLTextAreaElement): ComposerDraft {
        const replyMid = this.parsePositiveIntegerFromUnknown(panel.atUid)
        const replyUname = this.normalizeMentionUname(panel.atUserName || panel.tempAtUserName || '')
        const rawText = textarea.value.replace(/\u00a0/g, ' ')

        if (replyMid <= 0 || replyUname.length === 0) {
            return {
                bodyText: rawText,
                replyMid: 0,
                replyAttr: 0,
                replyUname: '',
                replayDmid: ''
            }
        }

        const mentionPrefix = `@${replyUname}`
        const bodyText = rawText.startsWith(mentionPrefix)
            ? rawText.slice(mentionPrefix.length)
            : rawText

        return {
            bodyText,
            replyMid,
            replyAttr: Number(panel.atIsMystery),
            replyUname,
            replayDmid: panel.atReplyDmId || ''
        }
    }

    private renderComposerDraft(draft: ComposerDraft): string {
        if (draft.replyMid <= 0 || draft.replyUname.length === 0) {
            return draft.bodyText
        }

        const mentionPrefix = `@${draft.replyUname}`
        if (draft.bodyText.length === 0) {
            return mentionPrefix
        }

        if (draft.bodyText.startsWith(' ') || draft.bodyText.startsWith('\n')) {
            return `${mentionPrefix}${draft.bodyText}`
        }

        return `${mentionPrefix} ${draft.bodyText}`
    }

    private canDraftBeSent(draft: ComposerDraft): boolean {
        return draft.bodyText.trim().length > 0
    }

    private needsSpaceBetween(left: string, right: string): boolean {
        if (left.length === 0 || right.length === 0) return false
        const leftChar = left.charAt(left.length - 1)
        const rightChar = right[0] ?? ''
        if (leftChar.length === 0 || rightChar.length === 0) return false

        if (this.boundaryPunctuationRegex.test(leftChar)) return false
        if (this.boundaryPunctuationRegex.test(rightChar)) return false
        return true
    }

    private smartJoinText(left: string, right: string): string {
        if (left.length === 0) return right
        if (right.length === 0) return left
        return this.needsSpaceBetween(left, right) ? `${left} ${right}` : `${left}${right}`
    }

    private mergeDraftForAppend(currentDraft: ComposerDraft, incomingDraft: ComposerDraft): ComposerDraft {
        if (incomingDraft.replyMid > 0 && incomingDraft.replyUname.length > 0) {
            if (
                currentDraft.replyMid > 0 &&
                currentDraft.replyUname.length > 0 &&
                currentDraft.replyMid === incomingDraft.replyMid
            ) {
                return {
                    ...currentDraft,
                    bodyText: this.smartJoinText(currentDraft.bodyText, incomingDraft.bodyText)
                }
            }

            if (currentDraft.replyMid <= 0 && currentDraft.bodyText.trim().length === 0) {
                return {
                    ...incomingDraft
                }
            }

            return {
                ...currentDraft,
                bodyText: this.smartJoinText(currentDraft.bodyText, this.renderComposerDraft(incomingDraft))
            }
        }

        return {
            ...currentDraft,
            bodyText: this.smartJoinText(currentDraft.bodyText, incomingDraft.bodyText)
        }
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
        const replyUname = this.normalizeMentionUname(
            mentionElement?.dataset.uname?.trim() ??
                mentionElement?.textContent ??
                msgDataset?.replyUname?.trim() ??
                msgDataset?.replyuname?.trim() ??
                nodeDataset.replyUname?.trim() ??
                nodeDataset.replyuname?.trim() ??
                ''
        )
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

    private getNativeComposerContext(): NativeComposerContext | null {
        if (typeof document === 'undefined') return null
        const panelElement = document.querySelector<HTMLElement>('.chat-control-panel') as
            | (HTMLElement & { __vue__?: unknown })
            | null
        if (!panelElement || !this.isNativeChatControlPanelVm(panelElement.__vue__)) {
            return null
        }

        const panel = panelElement.__vue__
        const closestContainer =
            typeof panelElement.closest === 'function'
                ? panelElement.closest<HTMLElement>('.chat-input-ctnr')
                : null
        const scopedContainer = closestContainer ?? document.querySelector<HTMLElement>('.chat-input-ctnr')
        const textarea =
            scopedContainer?.querySelector<HTMLTextAreaElement>('textarea.chat-input') ??
            document.querySelector<HTMLTextAreaElement>('.chat-input-ctnr textarea.chat-input')
        const container =
            scopedContainer ??
            (typeof textarea?.closest === 'function'
                ? textarea.closest<HTMLElement>('.chat-input-ctnr')
                : null) ??
            panelElement

        if (!textarea) return null
        const sendButton = this.findNativeSendButton(container)
        if (!sendButton) return null

        return {
            panel,
            textarea,
            sendButton,
            container
        }
    }

    private findNativeSendButton(scope: ParentNode): HTMLButtonElement | null {
        const queryRoot =
            typeof (scope as { querySelectorAll?: unknown }).querySelectorAll === 'function'
                ? scope
                : document
        const candidates = Array.from(queryRoot.querySelectorAll<HTMLButtonElement>('button'))
        const textMatched = candidates.find((button) => button.textContent?.trim() === '发送')
        if (textMatched) {
            return textMatched
        }

        const sendLike = candidates.find((button) => {
            const className = button.className || ''
            const report = button.getAttribute('data-report') || ''
            return /send/i.test(className) || /send/i.test(report)
        })
        if (sendLike) {
            return sendLike
        }

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

    private applyComposerDraft(context: NativeComposerContext, draft: ComposerDraft): boolean {
        const nextText = this.renderComposerDraft(draft)
        if (!this.isWithinComposerLengthLimit(context.textarea, nextText)) {
            const { message } = useDiscreteAPI(['message'])
            message.warning(`已超过输入上限（${this.resolveComposerLengthLimit(context.textarea)}），未填入输入框`)
            return false
        }

        context.panel.clearAtInfo?.()
        if (draft.replyMid > 0 && draft.replyUname.length > 0) {
            const mentionPrefix = `@${draft.replyUname}`
            context.panel.atUserName = mentionPrefix
            context.panel.tempAtUserName = mentionPrefix
            context.panel.atUid = draft.replyMid
            context.panel.atReplyDmId = draft.replayDmid
            context.panel.atIsMystery = draft.replyAttr > 0
        } else {
            context.panel.atUserName = ''
            context.panel.tempAtUserName = ''
            context.panel.atUid = 0
            context.panel.atReplyDmId = ''
            context.panel.atIsMystery = false
        }
        this.setNativeChatInputValue(context.textarea, nextText)
        return true
    }

    private appendDraftToComposer(incomingDraft: ComposerDraft): boolean {
        const context = this.getNativeComposerContext()
        if (!context) {
            const { message } = useDiscreteAPI(['message'])
            message.warning('未找到直播间输入框，未追加到输入框')
            return false
        }

        const currentDraft = this.readComposerDraft(context.panel, context.textarea)
        const mergedDraft = this.mergeDraftForAppend(currentDraft, incomingDraft)
        return this.applyComposerDraft(context, mergedDraft)
    }

    private normalizeForDiff(text: string): string {
        return text.trim()
    }

    private isWordLikeChar(char: string): boolean {
        if (char.length === 0) return false
        return /[0-9A-Za-z\u4E00-\u9FFF]/.test(char)
    }

    private isSafePunctuationMutationIndex(text: string, index: number): boolean {
        const leftChar = index > 0 ? text.charAt(index - 1) : ''
        const rightChar = index < text.length - 1 ? text.charAt(index + 1) : ''

        if (this.isWordLikeChar(leftChar) || this.isWordLikeChar(rightChar)) {
            return true
        }

        if (leftChar === ' ' || leftChar === '　' || rightChar === ' ' || rightChar === '　') {
            return true
        }

        return false
    }

    private replaceFirstOutsideSquareBracket(
        text: string,
        matcher: (char: string, index: number, source: string) => boolean,
        replacement: string
    ): string | null {
        let bracketDepth = 0
        for (let index = 0; index < text.length; index += 1) {
            const char = text.charAt(index)
            if (char === '[') {
                bracketDepth += 1
                continue
            }
            if (char === ']') {
                if (bracketDepth > 0) {
                    bracketDepth -= 1
                }
                continue
            }
            if (bracketDepth > 0) {
                continue
            }

            if (!matcher(char, index, text)) {
                continue
            }

            return `${text.slice(0, index)}${replacement}${text.slice(index + 1)}`
        }

        return null
    }

    private buildCrybabyReplacementCandidates(baseBody: string): string[] {
        const candidates: string[] = []
        const pushCandidate = (next: string | null) => {
            if (!next || next === baseBody) {
                return
            }
            candidates.push(next)
        }

        pushCandidate(this.replaceFirstOutsideSquareBracket(baseBody, (char) => char === ' ', '　'))
        pushCandidate(this.replaceFirstOutsideSquareBracket(baseBody, (char) => char === '　', ' '))
        pushCandidate(
            this.replaceFirstOutsideSquareBracket(
                baseBody,
                (char, index, source) =>
                    char === '，' && this.isSafePunctuationMutationIndex(source, index),
                ','
            )
        )
        pushCandidate(
            this.replaceFirstOutsideSquareBracket(
                baseBody,
                (char, index, source) =>
                    char === ',' && this.isSafePunctuationMutationIndex(source, index),
                '，'
            )
        )
        pushCandidate(
            this.replaceFirstOutsideSquareBracket(
                baseBody,
                (char, index, source) =>
                    char === '。' && this.isSafePunctuationMutationIndex(source, index),
                '.'
            )
        )
        pushCandidate(
            this.replaceFirstOutsideSquareBracket(
                baseBody,
                (char, index, source) =>
                    char === '.' && this.isSafePunctuationMutationIndex(source, index),
                '。'
            )
        )

        return Array.from(new Set(candidates))
    }

    private createCrybabyDraft(lastDraft: ComposerDraft, textarea: HTMLTextAreaElement): ComposerDraft | null {
        const baseBody = lastDraft.bodyText
        const baseNormalized = this.normalizeForDiff(baseBody)
        if (baseNormalized.length === 0) {
            return null
        }

        const suffixCandidates = ['.', ',', ';', ':', '-']
        const candidates: string[] = []
        suffixCandidates.forEach((suffix) => {
            candidates.push(this.smartJoinText(baseBody, suffix))
        })

        candidates.push(...this.buildCrybabyReplacementCandidates(baseBody))

        const maxLength = this.resolveComposerLengthLimit(textarea)
        for (const bodyText of candidates) {
            if (this.normalizeForDiff(bodyText) === baseNormalized) {
                continue
            }

            const draft: ComposerDraft = {
                ...lastDraft,
                bodyText
            }
            if (this.getTextLength(this.renderComposerDraft(draft)) <= maxLength) {
                return draft
            }
        }

        return null
    }

    private disableCrybabyWithNotice(content: string) {
        this.config.crybabyEnabled = false
        this.updateCrybabyToggleState()
        const { message } = useDiscreteAPI(['message'])
        message.warning(content)
    }

    private lockNativeSend(durationMs: number) {
        this.sendLockUntil = Math.max(this.sendLockUntil, Date.now() + durationMs)
    }

    private isNativeSendLocked(): boolean {
        return Date.now() < this.sendLockUntil
    }

    private blockNativeSend(event: Event) {
        event.preventDefault()
        event.stopPropagation()
        if ('stopImmediatePropagation' in event && typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation()
        }

        const now = Date.now()
        if (now - this.sendLockToastAt < this.sendLockToastCooldownMs) {
            return
        }

        this.sendLockToastAt = now
        const { message } = useDiscreteAPI(['message'])
        message.info('Crybaby 冷却中，请稍后发送')
    }

    private captureUserSendIntent(context: NativeComposerContext, isTrusted: boolean) {
        if (!this.config.crybabyEnabled) return
        if (!isTrusted || this.internalSendGuard) return

        const draft = this.readComposerDraft(context.panel, context.textarea)
        if (!this.canDraftBeSent(draft)) {
            return
        }

        const intentId = this.sendIntentCounter + 1
        this.sendIntentCounter = intentId
        this.pendingSendIntent = {
            id: intentId,
            draft
        }

        if (this.pendingSendIntentTimer !== null) {
            window.clearTimeout(this.pendingSendIntentTimer)
        }

        this.pendingSendIntentTimer = window.setTimeout(() => {
            this.pendingSendIntentTimer = null
            this.handlePendingSendIntent(intentId)
        }, 120)
    }

    private handlePendingSendIntent(intentId: number) {
        if (!this.config.enable || !this.config.crybabyEnabled) {
            this.clearPendingSendIntent()
            return
        }

        const pending = this.pendingSendIntent
        if (!pending || pending.id !== intentId) {
            return
        }

        this.pendingSendIntent = null
        const context = this.getNativeComposerContext()
        if (!context) {
            return
        }

        if (context.textarea.value.trim().length > 0) {
            return
        }

        const nextDraft = this.createCrybabyDraft(pending.draft, context.textarea)
        if (!nextDraft) {
            this.disableCrybabyWithNotice('Crybaby 无法生成差异化弹幕，已自动关闭')
            return
        }

        if (!this.applyComposerDraft(context, nextDraft)) {
            this.disableCrybabyWithNotice('Crybaby 未能填入输入框（超出上限），已自动关闭')
            return
        }

        this.lockNativeSend(this.sendLockDurationMs)
    }

    private bindNativeComposerListeners() {
        if (this.nativeComposerListenersBound) return
        this.nativeComposerListenersBound = true
        document.addEventListener('click', this.handleNativeSendClickCapture, true)
        document.addEventListener('keydown', this.handleNativeSendKeydownCapture, true)
    }

    private unbindNativeComposerListeners() {
        if (!this.nativeComposerListenersBound) return
        this.nativeComposerListenersBound = false
        document.removeEventListener('click', this.handleNativeSendClickCapture, true)
        document.removeEventListener('keydown', this.handleNativeSendKeydownCapture, true)
    }

    private readonly handleNativeSendClickCapture = (event: Event) => {
        if (!this.config.enable) return
        const context = this.getNativeComposerContext()
        if (!context) return

        const target = event.target
        if (!(target instanceof Node) || !context.sendButton.contains(target)) {
            return
        }

        if (this.isNativeSendLocked()) {
            this.blockNativeSend(event)
            return
        }

        this.captureUserSendIntent(context, event.isTrusted)
    }

    private readonly handleNativeSendKeydownCapture = (event: Event) => {
        if (!this.config.enable || !(event instanceof KeyboardEvent)) return
        if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
            return
        }
        if (event.isComposing) return

        const context = this.getNativeComposerContext()
        if (!context || event.target !== context.textarea) return

        if (this.isNativeSendLocked()) {
            this.blockNativeSend(event)
            return
        }

        this.captureUserSendIntent(context, event.isTrusted)
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
        const context = this.getNativeComposerContext()
        if (!context) return

        context.panel.clearAtInfo?.()
        context.panel.atUserName = state.atUserName
        context.panel.tempAtUserName = state.tempAtUserName
        context.panel.atUid = state.atUid
        context.panel.atReplyDmId = state.atReplyDmId
        context.panel.atIsMystery = state.atIsMystery
        this.setNativeChatInputValue(context.textarea, state.text)
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

        const context = this.getNativeComposerContext()
        if (!context || context.sendButton.disabled) {
            return false
        }

        const previousState: NativeChatComposerState = {
            text: context.textarea.value,
            atUserName: context.panel.atUserName,
            tempAtUserName: context.panel.tempAtUserName,
            atUid: context.panel.atUid,
            atReplyDmId: context.panel.atReplyDmId,
            atIsMystery: context.panel.atIsMystery
        }

        const mentionPrefix = `@${payload.replyUname}`
        context.panel.clearAtInfo?.()
        context.panel.atUserName = mentionPrefix
        context.panel.tempAtUserName = mentionPrefix
        context.panel.atUid = payload.replyMid
        context.panel.atReplyDmId = payload.replayDmid
        context.panel.atIsMystery = payload.replyAttr > 0
        this.setNativeChatInputValue(context.textarea, this.buildNativeMentionMessage(payload))
        await this.waitForNextFrame()

        this.internalSendGuard = true
        try {
            context.sendButton.click()
        } finally {
            window.setTimeout(() => {
                this.internalSendGuard = false
            }, 0)
        }

        if (this.shouldRestoreNativeChatComposer(previousState)) {
            window.setTimeout(() => {
                const latestContext = this.getNativeComposerContext()
                if (!latestContext) return
                if (latestContext.textarea.value.trim().length > 0) {
                    return
                }
                this.restoreNativeChatComposer(previousState)
            }, 120)
        }

        return true
    }

    private createInlineActionButton(
        iconClass: string,
        title: string,
        onClick: (event: MouseEvent) => void,
        buttonClass?: string
    ) {
        const button = document.createElement('button')
        button.type = 'button'
        button.title = title
        button.ariaLabel = title
        button.classList.add(this.inlineActionButtonClass)
        if (buttonClass) {
            button.classList.add(buttonClass)
        }

        const icon = document.createElement('i')
        icon.className = `${iconClass} ${this.inlineActionIconClass}`.trim()
        button.appendChild(icon)

        button.addEventListener('click', onClick)

        return button
    }

    private mountComposerToolbar() {
        if (!this.config.enable) return

        const context = this.getNativeComposerContext()
        if (!context) return
        if (this.composerToolbarElement && document.contains(this.composerToolbarElement)) {
            return
        }

        const toolbar = document.createElement('div')
        toolbar.className = this.composerToolbarClass
        toolbar.style.cssText =
            'display:flex;align-items:center;gap:6px;margin-bottom:6px;justify-content:flex-end;'

        const copyButton = this.createInlineActionButton(
            'pi pi-copy',
            '复制当前输入并追加到输入框',
            (event) => {
                event.stopPropagation()
                void this.copyFromComposerToolbar()
            },
            this.composerToolbarButtonClass
        )

        const clearButton = this.createInlineActionButton(
            'pi pi-trash',
            '清空输入框',
            (event) => {
                event.stopPropagation()
                this.clearComposerInput()
            },
            this.composerToolbarButtonClass
        )

        const crybabyButton = this.createInlineActionButton(
            'pi pi-megaphone',
            '切换 Crybaby 模式',
            (event) => {
                event.stopPropagation()
                this.config.crybabyEnabled = !this.config.crybabyEnabled
                this.updateCrybabyToggleState()
                const { message } = useDiscreteAPI(['message'])
                message.info(this.config.crybabyEnabled ? 'Crybaby 已开启' : 'Crybaby 已关闭')
            },
            this.composerToolbarButtonClass
        )

        toolbar.append(copyButton, clearButton, crybabyButton)
        const textareaParent = context.textarea.parentElement
        if (textareaParent) {
            textareaParent.insertBefore(toolbar, context.textarea)
        } else {
            context.container.prepend(toolbar)
        }

        this.composerToolbarElement = toolbar
        this.crybabyToggleButton = crybabyButton
        this.updateCrybabyToggleState()
    }

    private updateCrybabyToggleState() {
        if (!this.crybabyToggleButton) return
        const active = Boolean(this.config.crybabyEnabled)
        this.crybabyToggleButton.setAttribute('aria-pressed', String(active))
        this.crybabyToggleButton.style.opacity = active ? '1' : '0.72'
        this.crybabyToggleButton.style.filter = active ? 'none' : 'saturate(0.4)'
    }

    private ensureComposerEnhancements() {
        if (!this.config.enable) return

        this.bindNativeComposerListeners()
        this.mountComposerToolbar()
        if (this.waitForComposerAreaTimer !== null) return

        this.waitForComposerAreaTimer = window.setInterval(() => {
            if (!this.config.enable) return
            this.mountComposerToolbar()
            this.updateCrybabyToggleState()
        }, 500)
    }

    private clearComposerInput() {
        const context = this.getNativeComposerContext()
        if (!context) return

        context.panel.clearAtInfo?.()
        context.panel.atUserName = ''
        context.panel.tempAtUserName = ''
        context.panel.atUid = 0
        context.panel.atReplyDmId = ''
        context.panel.atIsMystery = false
        this.setNativeChatInputValue(context.textarea, '')
    }

    private async copyFromComposerToolbar() {
        const context = this.getNativeComposerContext()
        if (!context) return

        const displayText = context.textarea.value.replace(/\u00a0/g, ' ')
        if (displayText.trim().length === 0) {
            return
        }

        await this.dmCopy(displayText)
        const draft = this.readComposerDraft(context.panel, context.textarea)
        this.appendDraftToComposer(draft)
    }

    private async copyPayloadToClipboardAndComposer(payload: DanmakuActionPayload) {
        if (payload.displayContent.trim().length === 0) return
        await this.dmCopy(payload.displayContent)
        this.appendDraftToComposer(this.toComposerDraft(payload))
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
            void this.copyPayloadToClipboardAndComposer(payload)
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
