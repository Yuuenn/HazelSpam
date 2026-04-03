import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import {
    CRYBABY_TOOLBAR_SVG,
    TOOLBAR_CLEAR_SVG,
    TOOLBAR_REPEAT_SVG
} from '@/constants/danmakuActionIcons'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'
import { useDiscreteAPI } from '@/utils/ui'

interface NativeChatControlPanelVm {
    atUserName: string
    tempAtUserName: string
    atUid: unknown
    atReplyDmId: string
    atIsMystery: boolean
    chatInput: string
    clearAtInfo?: () => void
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
    container: HTMLElement
}

type EditorActionTone = 'surface' | 'primary' | 'dangerSurface'

export type CrybabyEditorAction = {
    id: 'crybaby' | 'repeat' | 'clear'
    label: string
    iconSvg: string
    tone: EditorActionTone
    disabled: boolean
    allowClickWhenDisabled?: boolean
    active?: boolean
    onClick: () => void
    onDisabledClick?: () => void
}

const DEFAULT_COMPOSER_LIMIT = 40
const boundaryPunctuationRegex = /[\s,.;:!?，。！？；：、~～\-—()（）[\]【】{}<>《》"“”'‘’`]/
const crybabySuffixCandidates = ['.', ',', ';', ':', '-'] as const
const composerLimitCounterRegex = /^\s*\d+\s*\/\s*(\d+)\s*$/
const SEND_LOCK_DURATION_MS = 1000
const SEND_LOCK_TOAST_COOLDOWN_MS = 900

const normalizeMentionUname = (value: string) => value.replace(/^@+/, '').trim()

const getTextLength = (value: string) => Array.from(value).length

const parsePositiveInteger = (value: string | undefined): number => {
    if (!value) return 0
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0
    }
    return parsed
}

const parsePositiveIntegerFromUnknown = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 0 ? Math.floor(value) : 0
    }
    if (typeof value === 'string') {
        return parsePositiveInteger(value)
    }
    return 0
}

const isNativeChatControlPanelVm = (value: unknown): value is NativeChatControlPanelVm => {
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

const getNativeComposerContext = (): NativeComposerContext | null => {
    if (typeof document === 'undefined') return null

    const panelElement = document.querySelector<HTMLElement>('.chat-control-panel') as
        | (HTMLElement & { __vue__?: unknown })
        | null
    if (!panelElement || !isNativeChatControlPanelVm(panelElement.__vue__)) {
        return null
    }

    const panel = panelElement.__vue__
    const closestContainer =
        typeof panelElement.closest === 'function'
            ? panelElement.closest<HTMLElement>('.chat-input-ctnr')
            : null
    const scopedContainer =
        closestContainer ?? document.querySelector<HTMLElement>('.chat-input-ctnr')
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

    return {
        panel,
        textarea,
        container
    }
}

const findNativeSendButton = (scope: ParentNode): HTMLButtonElement | null => {
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

const setNativeChatInputValue = (textarea: HTMLTextAreaElement, value: string) => {
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

const clearReplyState = (panel: NativeChatControlPanelVm) => {
    panel.clearAtInfo?.()
    panel.atUserName = ''
    panel.tempAtUserName = ''
    panel.atUid = 0
    panel.atReplyDmId = ''
    panel.atIsMystery = false
}

const resolveDefaultComposerLimit = (storeLimit: number | null | undefined) => {
    const normalized = Number(storeLimit)
    if (Number.isFinite(normalized) && normalized > 0) {
        return Math.floor(normalized)
    }
    return DEFAULT_COMPOSER_LIMIT
}

const resolveCounterTextLimit = (value: string | null | undefined): number => {
    if (!value) return 0
    const matched = value.trim().match(composerLimitCounterRegex)
    if (!matched) return 0
    return parsePositiveInteger(matched[1])
}

const resolveComposerLengthLimitFromContainer = (container: ParentNode | null): number => {
    if (!container || typeof container.querySelectorAll !== 'function') {
        return 0
    }

    const directCounter = container.querySelector<HTMLElement>('.input-limit-hint')
    const directCounterLimit = resolveCounterTextLimit(directCounter?.textContent)
    if (directCounterLimit > 0) {
        return directCounterLimit
    }

    const candidates = Array.from(container.querySelectorAll<HTMLElement>('span, div'))
    for (const candidate of candidates) {
        const candidateLimit = resolveCounterTextLimit(candidate.textContent)
        if (candidateLimit > 0) {
            return candidateLimit
        }
    }

    return 0
}

const resolveComposerLengthLimit = (
    textarea: HTMLTextAreaElement | null,
    storeLimit: number | null | undefined,
    container?: ParentNode | null
) => {
    const counterLimit = resolveComposerLengthLimitFromContainer(
        container ??
            (typeof textarea?.closest === 'function'
                ? textarea.closest<HTMLElement>('.chat-input-ctnr')
                : null)
    )
    if (counterLimit > 0) {
        return counterLimit
    }

    const textareaLimit = Number(textarea?.maxLength)
    if (Number.isFinite(textareaLimit) && textareaLimit > 0) {
        return Math.floor(textareaLimit)
    }
    return resolveDefaultComposerLimit(storeLimit)
}

const readComposerDraft = (
    panel: NativeChatControlPanelVm,
    textarea: HTMLTextAreaElement
): ComposerDraft => {
    const replyMid = parsePositiveIntegerFromUnknown(panel.atUid)
    const replyUname = normalizeMentionUname(panel.atUserName || panel.tempAtUserName || '')
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

const renderComposerDraft = (draft: ComposerDraft) => {
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

const canDraftBeSent = (draft: ComposerDraft) => draft.bodyText.trim().length > 0

const needsSpaceBetween = (left: string, right: string) => {
    if (left.length === 0 || right.length === 0) return false

    const leftChar = left.charAt(left.length - 1)
    const rightChar = right[0] ?? ''
    if (leftChar.length === 0 || rightChar.length === 0) return false

    if (boundaryPunctuationRegex.test(leftChar)) return false
    if (boundaryPunctuationRegex.test(rightChar)) return false
    return true
}

const smartJoinText = (left: string, right: string) => {
    if (left.length === 0) return right
    if (right.length === 0) return left
    return needsSpaceBetween(left, right) ? `${left} ${right}` : `${left}${right}`
}

const mergeDraftForAppend = (currentDraft: ComposerDraft, incomingDraft: ComposerDraft) => {
    if (incomingDraft.replyMid > 0 && incomingDraft.replyUname.length > 0) {
        if (
            currentDraft.replyMid > 0 &&
            currentDraft.replyUname.length > 0 &&
            currentDraft.replyMid === incomingDraft.replyMid
        ) {
            return {
                ...currentDraft,
                bodyText: smartJoinText(currentDraft.bodyText, incomingDraft.bodyText)
            }
        }

        if (currentDraft.replyMid <= 0 && currentDraft.bodyText.trim().length === 0) {
            return {
                ...incomingDraft
            }
        }

        return {
            ...currentDraft,
            bodyText: smartJoinText(currentDraft.bodyText, renderComposerDraft(incomingDraft))
        }
    }

    return {
        ...currentDraft,
        bodyText: smartJoinText(currentDraft.bodyText, incomingDraft.bodyText)
    }
}

const isSameComposerDraft = (left: ComposerDraft, right: ComposerDraft) =>
    left.bodyText === right.bodyText &&
    left.replyMid === right.replyMid &&
    left.replyAttr === right.replyAttr &&
    left.replyUname === right.replyUname &&
    left.replayDmid === right.replayDmid

const cloneComposerDraft = (draft: ComposerDraft): ComposerDraft => ({
    ...draft
})

const toHostToolbarIconMarkup = (svgMarkup: string) =>
    svgMarkup.includes('class="hazelspam-host-toolbar-icon"')
        ? svgMarkup
        : svgMarkup.replace('<svg ', '<svg class="hazelspam-host-toolbar-icon" ')

const CRYBABY_EDITOR_SVG = toHostToolbarIconMarkup(CRYBABY_TOOLBAR_SVG)
const TOOLBAR_REPEAT_EDITOR_SVG = toHostToolbarIconMarkup(TOOLBAR_REPEAT_SVG)
const TOOLBAR_CLEAR_EDITOR_SVG = toHostToolbarIconMarkup(TOOLBAR_CLEAR_SVG)

export const useCrybabyView = () => {
    const biliStore = useBiliStore()
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const { message, notification } = useDiscreteAPI(['message', 'notification'])

    const isNativeComposerReady = ref(false)
    const composerText = ref('')
    const composerLengthLimit = ref(resolveDefaultComposerLimit(biliStore.danmakuLengthLimit))

    let syncTimer: number | null = null
    let boundTextarea: HTMLTextAreaElement | null = null
    let shouldSkipComposerTextWatch = false
    let repeatBaseDraft: ComposerDraft | null = null
    let repeatLastAppliedDraft: ComposerDraft | null = null
    let crybabyDraftCycle: ComposerDraft[] = []
    let sendLockUntil = 0
    let sendLockToastAt = 0

    const isCrybabyModeEnabled = computed({
        get: () => moduleStore.moduleConfig.settings.danmakuActions.enable,
        set: (value: boolean) => {
            moduleStore.moduleConfig.settings.danmakuActions.enable = value
        }
    })

    const isCrybabyAutoFillEnabled = computed(
        () => moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled
    )
    const generalEmojiEmoticons = computed(
        () => biliStore.emotionData.find((item) => item.pkg_id === 100)?.emoticons ?? []
    )

    const composerCharacterCount = computed(() => getTextLength(composerText.value))

    const syncComposerTextFromNative = (value: string) => {
        if (composerText.value === value) {
            return
        }

        shouldSkipComposerTextWatch = true
        composerText.value = value
    }

    const detachNativeTextareaListener = () => {
        if (!boundTextarea) return
        boundTextarea.removeEventListener('input', handleNativeTextareaInput)
        boundTextarea.removeEventListener('change', handleNativeTextareaInput)
        boundTextarea = null
    }

    const handleNativeTextareaInput = (event: Event) => {
        const target = event.target
        if (!(target instanceof HTMLTextAreaElement)) {
            return
        }

        composerLengthLimit.value = resolveComposerLengthLimit(
            target,
            biliStore.danmakuLengthLimit,
            target.closest<HTMLElement>('.chat-input-ctnr')
        )
        isNativeComposerReady.value = true
        syncComposerTextFromNative(target.value)
    }

    const refreshNativeComposerBinding = () => {
        const context = getNativeComposerContext()
        if (!context) {
            isNativeComposerReady.value = false
            composerLengthLimit.value = resolveDefaultComposerLimit(biliStore.danmakuLengthLimit)
            detachNativeTextareaListener()
            return
        }

        isNativeComposerReady.value = true
        composerLengthLimit.value = resolveComposerLengthLimit(
            context.textarea,
            biliStore.danmakuLengthLimit,
            context.container
        )

        if (boundTextarea !== context.textarea) {
            detachNativeTextareaListener()
            boundTextarea = context.textarea
            boundTextarea.addEventListener('input', handleNativeTextareaInput)
            boundTextarea.addEventListener('change', handleNativeTextareaInput)
        }

        syncComposerTextFromNative(context.textarea.value)
    }

    const startComposerSync = () => {
        refreshNativeComposerBinding()
        if (syncTimer !== null) return

        syncTimer = window.setInterval(() => {
            refreshNativeComposerBinding()
        }, 500)
    }

    const stopComposerSync = () => {
        if (syncTimer !== null) {
            window.clearInterval(syncTimer)
            syncTimer = null
        }
        detachNativeTextareaListener()
    }

    const resetRepeatDraftState = () => {
        repeatBaseDraft = null
        repeatLastAppliedDraft = null
    }

    const resetCrybabyDraftCycle = () => {
        crybabyDraftCycle = []
    }

    const normalizeForDiff = (text: string) => text.trim()

    const isWordLikeChar = (char: string) => {
        if (char.length === 0) return false
        return /[0-9A-Za-z\u4E00-\u9FFF]/.test(char)
    }

    const isSafePunctuationMutationIndex = (text: string, index: number) => {
        const leftChar = index > 0 ? text.charAt(index - 1) : ''
        const rightChar = index < text.length - 1 ? text.charAt(index + 1) : ''

        if (isWordLikeChar(leftChar) || isWordLikeChar(rightChar)) {
            return true
        }

        if (leftChar === ' ' || leftChar === '　' || rightChar === ' ' || rightChar === '　') {
            return true
        }

        return false
    }

    const replaceFirstOutsideSquareBracket = (
        text: string,
        matcher: (char: string, index: number, source: string) => boolean,
        replacement: string
    ) => {
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

    const replaceFirstOutsideSquareBracketWithReplacer = (
        text: string,
        matcher: (char: string, index: number, source: string) => boolean,
        replacement: (char: string, index: number, source: string) => string
    ) => {
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

            return `${text.slice(0, index)}${replacement(char, index, text)}${text.slice(index + 1)}`
        }

        return null
    }

    const resolveCrybabyHalfwidthRotation = (char: string) => {
        switch (char) {
            case ' ':
                return ','
            case '.':
                return ','
            case ',':
                return ';'
            case ';':
                return ':'
            case ':':
                return '-'
            case '-':
                return '.'
            default:
                return null
        }
    }

    const buildCrybabyReplacementCandidates = (baseBody: string) => {
        const candidates: string[] = []
        const seenBodies = new Set([baseBody])
        const pushCandidate = (next: string | null) => {
            if (!next || seenBodies.has(next)) {
                return
            }

            candidates.push(next)
            seenBodies.add(next)
        }

        const normalizedHalfwidthCandidate =
            replaceFirstOutsideSquareBracket(baseBody, (char) => char === '　', ' ') ??
            replaceFirstOutsideSquareBracket(
                baseBody,
                (char, index, source) =>
                    char === '，' && isSafePunctuationMutationIndex(source, index),
                ','
            ) ??
            replaceFirstOutsideSquareBracket(
                baseBody,
                (char, index, source) =>
                    char === '。' && isSafePunctuationMutationIndex(source, index),
                '.'
            )

        pushCandidate(normalizedHalfwidthCandidate)

        let currentBody = normalizedHalfwidthCandidate ?? baseBody
        for (let step = 0; step < crybabySuffixCandidates.length; step += 1) {
            const nextBody = replaceFirstOutsideSquareBracketWithReplacer(
                currentBody,
                (char, index, source) =>
                    resolveCrybabyHalfwidthRotation(char) !== null &&
                    isSafePunctuationMutationIndex(source, index),
                (char) => resolveCrybabyHalfwidthRotation(char) ?? char
            )

            if (!nextBody || seenBodies.has(nextBody)) {
                break
            }

            pushCandidate(nextBody)
            currentBody = nextBody
        }

        return candidates
    }

    const buildCrybabyDraftCycle = (baseDraft: ComposerDraft, textarea: HTMLTextAreaElement) => {
        const baseBody = baseDraft.bodyText
        const baseNormalized = normalizeForDiff(baseBody)
        if (baseNormalized.length === 0) {
            return []
        }

        const maxLength = resolveComposerLengthLimit(textarea, biliStore.danmakuLengthLimit)
        const bodyCandidates = crybabySuffixCandidates
            .map((suffix) => smartJoinText(baseBody, suffix))
            .filter(
                (bodyText, index, candidates) =>
                    normalizeForDiff(bodyText) !== baseNormalized &&
                    candidates.indexOf(bodyText) === index
            )
            .filter((bodyText) => {
                const draft: ComposerDraft = {
                    ...baseDraft,
                    bodyText
                }
                return getTextLength(renderComposerDraft(draft)) <= maxLength
            })

        const finalBodyCycle =
            bodyCandidates.length > 0 ? bodyCandidates : buildCrybabyReplacementCandidates(baseBody)

        const cycleDrafts = [baseBody, ...finalBodyCycle].map((bodyText) => ({
            ...baseDraft,
            bodyText
        }))

        return cycleDrafts.filter(
            (draft, index, drafts) =>
                drafts.findIndex((candidate) => isSameComposerDraft(candidate, draft)) === index
        )
    }

    const createCrybabyDraft = (lastDraft: ComposerDraft, textarea: HTMLTextAreaElement) => {
        let cycleIndex = crybabyDraftCycle.findIndex((draft) =>
            isSameComposerDraft(draft, lastDraft)
        )

        if (cycleIndex < 0) {
            crybabyDraftCycle = buildCrybabyDraftCycle(lastDraft, textarea)
            cycleIndex = crybabyDraftCycle.findIndex((draft) =>
                isSameComposerDraft(draft, lastDraft)
            )
        }

        if (crybabyDraftCycle.length <= 1 || cycleIndex < 0) {
            resetCrybabyDraftCycle()
            return null
        }

        const nextIndex = (cycleIndex + 1) % crybabyDraftCycle.length
        return cloneComposerDraft(crybabyDraftCycle[nextIndex])
    }

    const disableCrybabyWithNotice = () => {
        moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled = false
        resetCrybabyDraftCycle()
        notification.info({
            title: 'Crybaby 自动装填已关闭',
            content: '无法生成不同弹幕',
            closable: false,
            duration: 3000
        })
    }

    const applyComposerDraft = (
        context: NativeComposerContext,
        draft: ComposerDraft,
        overflowTitle: string
    ) => {
        const nextText = renderComposerDraft(draft)
        const limit = resolveComposerLengthLimit(context.textarea, biliStore.danmakuLengthLimit)

        if (getTextLength(nextText) > limit) {
            notification.error({
                title: overflowTitle,
                content: `内容超出字符数上限 (${limit})`,
                closable: false,
                duration: 3000
            })
            return false
        }

        if (draft.replyMid > 0 && draft.replyUname.length > 0) {
            const mentionPrefix = `@${draft.replyUname}`
            context.panel.clearAtInfo?.()
            context.panel.atUserName = mentionPrefix
            context.panel.tempAtUserName = mentionPrefix
            context.panel.atUid = draft.replyMid
            context.panel.atReplyDmId = draft.replayDmid
            context.panel.atIsMystery = draft.replyAttr > 0
        } else {
            clearReplyState(context.panel)
        }

        setNativeChatInputValue(context.textarea, nextText)
        syncComposerTextFromNative(nextText)
        return true
    }

    const applyPlainComposerText = (nextValue: string) => {
        const context = getNativeComposerContext()
        if (!context) {
            isNativeComposerReady.value = false
            return
        }

        composerLengthLimit.value = resolveComposerLengthLimit(
            context.textarea,
            biliStore.danmakuLengthLimit,
            context.container
        )

        const replyMid = parsePositiveIntegerFromUnknown(context.panel.atUid)
        const replyUname = normalizeMentionUname(
            context.panel.atUserName || context.panel.tempAtUserName || ''
        )
        const mentionPrefix = replyUname.length > 0 ? `@${replyUname}` : ''
        const shouldKeepReplyState =
            replyMid > 0 && mentionPrefix.length > 0 && nextValue.startsWith(mentionPrefix)

        if (!shouldKeepReplyState) {
            clearReplyState(context.panel)
        }

        if (context.textarea.value === nextValue) {
            return
        }

        setNativeChatInputValue(context.textarea, nextValue)
    }

    const resolveRepeatBaseDraft = (currentDraft: ComposerDraft) => {
        const shouldResetBase =
            !repeatBaseDraft ||
            !repeatLastAppliedDraft ||
            !isSameComposerDraft(currentDraft, repeatLastAppliedDraft)

        if (shouldResetBase) {
            repeatBaseDraft = cloneComposerDraft(currentDraft)
            repeatLastAppliedDraft = null
        }

        return cloneComposerDraft(repeatBaseDraft ?? currentDraft)
    }

    const toggleCrybabyAutoFill = () => {
        const nextValue = !moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled
        moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled = nextValue
        const hostToolbarCrybabyButton = document.querySelector<HTMLButtonElement>(
            '[data-hazelspam-toolbar-action="crybaby"]'
        )
        if (hostToolbarCrybabyButton) {
            hostToolbarCrybabyButton.setAttribute('aria-pressed', String(nextValue))
        }
        message.info(nextValue ? 'Crybaby 自动装填已开启' : 'Crybaby 自动装填已关闭')
        if (!nextValue) {
            resetCrybabyDraftCycle()
            sendLockUntil = 0
        }
    }

    const isSendLocked = () => Date.now() < sendLockUntil

    const notifySendLocked = () => {
        const now = Date.now()
        if (now - sendLockToastAt < SEND_LOCK_TOAST_COOLDOWN_MS) {
            return
        }
        sendLockToastAt = now
        notification.info({
            title: 'Crybaby 自动装填正在冷却',
            content: '请稍后尝试发送',
            closable: false,
            duration: 3000
        })
    }

    const lockSend = () => {
        sendLockUntil = Math.max(sendLockUntil, Date.now() + SEND_LOCK_DURATION_MS)
    }

    const insertEmojiToComposer = (emoji: string) => {
        if (emoji.trim().length === 0) return

        const context = getNativeComposerContext()
        if (!context) {
            message.error('未找到直播间输入框')
            isNativeComposerReady.value = false
            return
        }

        const currentValue = context.textarea.value
        const selectionStart =
            typeof context.textarea.selectionStart === 'number'
                ? context.textarea.selectionStart
                : currentValue.length
        const selectionEnd =
            typeof context.textarea.selectionEnd === 'number'
                ? context.textarea.selectionEnd
                : selectionStart
        const insertFrom = Math.max(0, selectionStart)
        const insertTo = Math.max(insertFrom, selectionEnd)
        const nextValue = currentValue.slice(0, insertFrom) + emoji + currentValue.slice(insertTo)
        const limit = resolveComposerLengthLimit(
            context.textarea,
            biliStore.danmakuLengthLimit,
            context.container
        )
        if (getTextLength(nextValue) > limit) {
            notification.error({
                title: '插入表情失败',
                content: `内容超出字符数上限 (${limit})`,
                closable: false,
                duration: 3000
            })
            return
        }

        setNativeChatInputValue(context.textarea, nextValue)
        syncComposerTextFromNative(nextValue)

        const nextCursor = insertFrom + emoji.length
        context.textarea.focus()
        context.textarea.setSelectionRange(nextCursor, nextCursor)
    }

    const repeatCurrentDanmaku = () => {
        const context = getNativeComposerContext()
        if (!context) {
            notification.error({
                title: '增加重复弹幕失败',
                content: '未找到直播间输入框',
                closable: false,
                duration: 3000
            })
            isNativeComposerReady.value = false
            return
        }

        const currentDraft = readComposerDraft(context.panel, context.textarea)
        if (!canDraftBeSent(currentDraft)) {
            resetRepeatDraftState()
            notification.error({
                title: '增加重复弹幕失败',
                content: '未获取到有效内容',
                closable: false,
                duration: 3000
            })
            return
        }

        const repeatDraft = resolveRepeatBaseDraft(currentDraft)
        const mergedDraft = mergeDraftForAppend(currentDraft, repeatDraft)
        if (!applyComposerDraft(context, mergedDraft, '增加重复弹幕失败')) {
            return
        }

        repeatLastAppliedDraft = cloneComposerDraft(mergedDraft)
    }

    const notifyRepeatActionUnavailable = () => {
        if (!isNativeComposerReady.value) {
            notification.error({
                title: '增加重复弹幕失败',
                content: '未找到直播间输入框',
                closable: false,
                duration: 3000
            })
            return
        }

        notification.error({
            title: '增加重复弹幕失败',
            content: '未获取到有效内容',
            closable: false,
            duration: 3000
        })
    }

    const clearComposerText = () => {
        const context = getNativeComposerContext()
        if (!context) {
            message.error('未找到直播间输入框')
            isNativeComposerReady.value = false
            return
        }

        resetRepeatDraftState()
        clearReplyState(context.panel)
        setNativeChatInputValue(context.textarea, '')
        syncComposerTextFromNative('')
    }

    const handleSendCurrentDanmaku = () => {
        if (isSendLocked()) {
            notifySendLocked()
            return
        }

        const context = getNativeComposerContext()
        if (!context) {
            message.error('未找到直播间输入框')
            isNativeComposerReady.value = false
            return
        }

        const sendButton = findNativeSendButton(context.container)
        if (!sendButton) {
            message.error('未找到发送按钮')
            return
        }

        if (sendButton.disabled) {
            notification.error({
                title: '发送失败',
                content: '当前发送按钮不可用',
                closable: false,
                duration: 3000
            })
            return
        }

        const currentDraft = readComposerDraft(context.panel, context.textarea)
        if (!canDraftBeSent(currentDraft)) {
            notification.error({
                title: '发送失败',
                content: '未获取到有效内容',
                closable: false,
                duration: 3000
            })
            return
        }

        const pendingDraft = cloneComposerDraft(currentDraft)
        sendButton.click()

        if (!isCrybabyAutoFillEnabled.value) {
            return
        }

        window.setTimeout(() => {
            const latestContext = getNativeComposerContext()
            if (!latestContext || latestContext.textarea.value.trim().length > 0) {
                return
            }

            const nextDraft = createCrybabyDraft(pendingDraft, latestContext.textarea)
            if (!nextDraft) {
                disableCrybabyWithNotice()
                return
            }

            if (!applyComposerDraft(latestContext, nextDraft, 'Crybaby 自动装填失败')) {
                disableCrybabyWithNotice()
                return
            }

            lockSend()
        }, 120)
    }

    const isSendDisabled = computed(
        () => !isNativeComposerReady.value || composerText.value.trim().length === 0
    )

    const editorActions = computed<CrybabyEditorAction[]>(() => [
        {
            id: 'crybaby',
            label: isCrybabyAutoFillEnabled.value
                ? '关闭 Crybaby 自动装填'
                : '激活 Crybaby：为您自动调整弹幕，方便快速连击发送',
            iconSvg: CRYBABY_EDITOR_SVG,
            tone: isCrybabyAutoFillEnabled.value ? 'primary' : 'surface',
            disabled: !isNativeComposerReady.value,
            active: isCrybabyAutoFillEnabled.value,
            onClick: toggleCrybabyAutoFill
        },
        {
            id: 'repeat',
            label: '增加重复弹幕，不懂的话多点几次试试',
            iconSvg: TOOLBAR_REPEAT_EDITOR_SVG,
            tone: 'surface',
            disabled: !isNativeComposerReady.value || composerCharacterCount.value === 0,
            allowClickWhenDisabled: true,
            onClick: repeatCurrentDanmaku,
            onDisabledClick: notifyRepeatActionUnavailable
        },
        {
            id: 'clear',
            label: '清空内容',
            iconSvg: TOOLBAR_CLEAR_EDITOR_SVG,
            tone: 'dangerSurface',
            disabled: !isNativeComposerReady.value || composerCharacterCount.value === 0,
            onClick: clearComposerText
        }
    ])

    const closePanel = () => {
        uiStore.uiConfig.isShowPanel = false
    }

    watch(
        composerText,
        (value) => {
            if (shouldSkipComposerTextWatch) {
                shouldSkipComposerTextWatch = false
                return
            }

            resetRepeatDraftState()
            resetCrybabyDraftCycle()
            applyPlainComposerText(value)
        },
        { flush: 'sync' }
    )

    watch(
        () => biliStore.danmakuLengthLimit,
        (limit) => {
            if (!isNativeComposerReady.value) {
                composerLengthLimit.value = resolveDefaultComposerLimit(limit)
            }
        }
    )

    onMounted(() => {
        startComposerSync()
    })

    onActivated(() => {
        startComposerSync()
    })

    onDeactivated(() => {
        stopComposerSync()
    })

    onBeforeUnmount(() => {
        stopComposerSync()
    })

    return {
        isNativeComposerReady,
        composerLengthLimit,
        composerCharacterCount,
        composerText,
        generalEmojiEmoticons,
        editorActions,
        isSendDisabled,
        isCrybabyModeEnabled,
        insertEmojiToComposer,
        handleSendCurrentDanmaku,
        closePanel
    }
}
