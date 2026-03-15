import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue'

type TextareaLikeInstance = {
    $el?: unknown
}

type TextSelectionRange = {
    start: number
    end: number
}

const resolveTextareaElement = (instance: unknown): HTMLTextAreaElement | null => {
    if (!instance) return null

    const host = (instance as TextareaLikeInstance).$el ?? instance
    if (host instanceof HTMLTextAreaElement) {
        return host
    }

    if (host && typeof (host as ParentNode).querySelector === 'function') {
        return (host as ParentNode).querySelector('textarea')
    }

    return null
}

const isSameStyleRecord = (current: Record<string, string>, next: Record<string, string>) => {
    const currentKeys = Object.keys(current)
    const nextKeys = Object.keys(next)
    if (currentKeys.length !== nextKeys.length) return false
    return nextKeys.every((key) => current[key] === next[key])
}

const setStyleIfChanged = (
    styleRef: { value: Record<string, string> },
    nextStyle: Record<string, string>
) => {
    if (isSameStyleRecord(styleRef.value, nextStyle)) return
    styleRef.value = nextStyle
}

export const useTextPreviewOverlay = (options: {
    currentText: Ref<string>
    isPreviewEnabled: Ref<boolean>
}) => {
    const { currentText, isPreviewEnabled } = options

    const textInputRef = ref<unknown>(null)
    const textPreviewInputRef = ref<unknown>(null)
    const mainTextareaEl = ref<HTMLTextAreaElement | null>(null)
    const previewTextareaEl = ref<HTMLTextAreaElement | null>(null)
    const textSelectionRange = ref<TextSelectionRange | null>(null)
    const textOverlayTransform = ref('translateY(0px)')
    const previewOverlayViewportStyle = ref<Record<string, string>>({})
    const previewOverlayContentStyle = ref<Record<string, string>>({})

    let mainScrollListener: ((event: Event) => void) | null = null
    let previewScrollListener: ((event: Event) => void) | null = null
    let cursorListener: ((event: Event) => void) | null = null
    let syncLock = false
    let relayoutTimer: ReturnType<typeof setTimeout> | null = null

    const setTextOverlayTransform = (scrollTop: number) => {
        textOverlayTransform.value = `translateY(${-scrollTop}px)`
    }

    const syncPreviewOverlayStyle = () => {
        const preview = previewTextareaEl.value
        if (!preview) return

        const previewStyle = getComputedStyle(preview)
        const borderTop = parseFloat(previewStyle.borderTopWidth || '0') || 0
        const borderRight = parseFloat(previewStyle.borderRightWidth || '0') || 0
        const borderBottom = parseFloat(previewStyle.borderBottomWidth || '0') || 0
        const borderLeft = parseFloat(previewStyle.borderLeftWidth || '0') || 0
        const maxBorder = Math.max(borderTop, borderRight, borderBottom, borderLeft)
        const radiusValue = parseFloat(previewStyle.borderRadius || '0') || 0
        const innerRadius = Math.max(0, radiusValue - maxBorder)

        const offsetX = preview.offsetLeft + borderLeft
        const offsetY = preview.offsetTop + borderTop
        const width = Math.max(0, preview.clientWidth)
        const height = Math.max(0, preview.clientHeight)

        setStyleIfChanged(previewOverlayViewportStyle, {
            top: `${offsetY}px`,
            left: `${offsetX}px`,
            width: `${width}px`,
            height: `${height}px`,
            boxSizing: 'border-box',
            borderRadius: `${innerRadius}px`,
            paddingTop: previewStyle.paddingTop,
            paddingRight: previewStyle.paddingRight,
            paddingBottom: previewStyle.paddingBottom,
            paddingLeft: previewStyle.paddingLeft,
            fontSize: previewStyle.fontSize,
            lineHeight: previewStyle.lineHeight,
            fontFamily: previewStyle.fontFamily,
            fontWeight: previewStyle.fontWeight,
            letterSpacing: previewStyle.letterSpacing
        })

        setStyleIfChanged(previewOverlayContentStyle, {
            wordSpacing: previewStyle.wordSpacing,
            textIndent: previewStyle.textIndent
        })
    }

    const syncMainToPreview = (event: Event) => {
        const target = event.target as HTMLTextAreaElement | null
        if (!target || !previewTextareaEl.value || syncLock) return

        syncLock = true
        previewTextareaEl.value.scrollTop = target.scrollTop
        setTextOverlayTransform(target.scrollTop)
        requestAnimationFrame(() => {
            syncLock = false
        })
    }

    const syncPreviewToMain = (event: Event) => {
        const target = event.target as HTMLTextAreaElement | null
        if (!target || !mainTextareaEl.value || syncLock) return

        syncLock = true
        mainTextareaEl.value.scrollTop = target.scrollTop
        setTextOverlayTransform(target.scrollTop)
        requestAnimationFrame(() => {
            syncLock = false
        })
    }

    const updateTextSelectionRange = (event?: Event) => {
        const target = (event?.target as HTMLTextAreaElement | null) ?? mainTextareaEl.value
        if (!target) return

        const maxLength = target.value.length
        const start = Math.max(0, Math.min(target.selectionStart ?? maxLength, maxLength))
        const end = Math.max(start, Math.min(target.selectionEnd ?? start, maxLength))
        textSelectionRange.value = { start, end }
    }

    const insertTextAtCursor = (textToInsert: string) => {
        const text = currentText.value || ''
        const textarea = mainTextareaEl.value

        const activeRange =
            textarea && document.activeElement === textarea
                ? {
                      start: textarea.selectionStart ?? text.length,
                      end: textarea.selectionEnd ?? text.length
                  }
                : null

        const range = activeRange ??
            textSelectionRange.value ?? { start: text.length, end: text.length }
        const start = Math.max(0, Math.min(range.start, text.length))
        const end = Math.max(start, Math.min(range.end, text.length))

        currentText.value = `${text.slice(0, start)}${textToInsert}${text.slice(end)}`
        const cursor = start + textToInsert.length
        textSelectionRange.value = { start: cursor, end: cursor }

        nextTick(() => {
            const target = mainTextareaEl.value
            if (!target) return
            target.focus()
            target.setSelectionRange(cursor, cursor)
            updateTextSelectionRange()
        })
    }

    const bindTextareas = () => {
        const nextMain = resolveTextareaElement(textInputRef.value)
        const nextPreview = isPreviewEnabled.value
            ? resolveTextareaElement(textPreviewInputRef.value)
            : null

        if (nextMain !== mainTextareaEl.value) {
            if (mainTextareaEl.value && mainScrollListener) {
                mainTextareaEl.value.removeEventListener('scroll', mainScrollListener)
            }
            if (mainTextareaEl.value && cursorListener) {
                mainTextareaEl.value.removeEventListener('click', cursorListener)
                mainTextareaEl.value.removeEventListener('keyup', cursorListener)
                mainTextareaEl.value.removeEventListener('select', cursorListener)
                mainTextareaEl.value.removeEventListener('input', cursorListener)
            }

            mainTextareaEl.value = nextMain
            if (nextMain) {
                mainScrollListener = (event: Event) => syncMainToPreview(event)
                cursorListener = (event: Event) => updateTextSelectionRange(event)
                nextMain.addEventListener('scroll', mainScrollListener, { passive: true })
                nextMain.addEventListener('click', cursorListener, { passive: true })
                nextMain.addEventListener('keyup', cursorListener, { passive: true })
                nextMain.addEventListener('select', cursorListener, { passive: true })
                nextMain.addEventListener('input', cursorListener, { passive: true })
            } else {
                mainScrollListener = null
                cursorListener = null
            }
        }

        if (nextPreview !== previewTextareaEl.value) {
            if (previewTextareaEl.value && previewScrollListener) {
                previewTextareaEl.value.removeEventListener('scroll', previewScrollListener)
            }

            previewTextareaEl.value = nextPreview
            if (nextPreview) {
                nextPreview.readOnly = true
                previewScrollListener = (event: Event) => syncPreviewToMain(event)
                nextPreview.addEventListener('scroll', previewScrollListener, { passive: true })
            } else {
                previewScrollListener = null
            }
        }

        const currentScrollTop = mainTextareaEl.value?.scrollTop ?? 0
        if (previewTextareaEl.value) {
            previewTextareaEl.value.scrollTop = currentScrollTop
        }
        syncPreviewOverlayStyle()
        setTextOverlayTransform(currentScrollTop)
    }

    const scheduleRelayout = () => {
        if (relayoutTimer) {
            clearTimeout(relayoutTimer)
            relayoutTimer = null
        }

        nextTick(() => {
            bindTextareas()
            requestAnimationFrame(() => bindTextareas())
            relayoutTimer = setTimeout(() => {
                bindTextareas()
                relayoutTimer = null
            }, 260)
        })
    }

    onBeforeUnmount(() => {
        if (mainTextareaEl.value && mainScrollListener) {
            mainTextareaEl.value.removeEventListener('scroll', mainScrollListener)
        }
        if (mainTextareaEl.value && cursorListener) {
            mainTextareaEl.value.removeEventListener('click', cursorListener)
            mainTextareaEl.value.removeEventListener('keyup', cursorListener)
            mainTextareaEl.value.removeEventListener('select', cursorListener)
            mainTextareaEl.value.removeEventListener('input', cursorListener)
        }
        if (previewTextareaEl.value && previewScrollListener) {
            previewTextareaEl.value.removeEventListener('scroll', previewScrollListener)
        }
        if (relayoutTimer) {
            clearTimeout(relayoutTimer)
        }
    })

    return {
        textInputRef,
        textPreviewInputRef,
        textOverlayTransform,
        previewOverlayViewportStyle,
        previewOverlayContentStyle,
        scheduleRelayout,
        insertTextAtCursor
    }
}
