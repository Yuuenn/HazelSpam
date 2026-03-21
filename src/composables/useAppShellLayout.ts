import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { APP_DIALOG_STYLE_SCOPE_SELECTOR } from '@/constants/brand'

const SHELL_DESIGN_HEIGHT = 760
const SHELL_MAX_HEIGHT_OFFSET = 72
const SHELL_MOBILE_MAX_HEIGHT_OFFSET = 28
const SHELL_COMPACT_MAX_WIDTH = 560
const SHELL_MOBILE_MAX_WIDTH = 760
const SHELL_TABLET_MAX_WIDTH = 1180
const SCROLL_HINT_TARGET_SELECTOR = '.hazelspam-faux-scroll'
const SCROLL_HINT_EDGE_EPSILON = 2

export const appShellScrollScopeSelector = APP_DIALOG_STYLE_SCOPE_SELECTOR

export type AppShellLayoutTier = 'desktop' | 'tablet' | 'mobile' | 'compact'

type ShellViewportMetrics = {
    scale: number
    stageHeight: number
    renderHeight: number
}

export const resolveShellLayoutTier = (viewportWidth: number): AppShellLayoutTier => {
    const safeViewportWidth = Number.isFinite(viewportWidth) ? Math.max(1, viewportWidth) : Infinity

    if (safeViewportWidth <= SHELL_COMPACT_MAX_WIDTH) {
        return 'compact'
    }

    if (safeViewportWidth <= SHELL_MOBILE_MAX_WIDTH) {
        return 'mobile'
    }

    if (safeViewportWidth <= SHELL_TABLET_MAX_WIDTH) {
        return 'tablet'
    }

    return 'desktop'
}

export const resolveShellViewportMetrics = ({
    viewportHeight,
    viewportWidth
}: {
    viewportHeight: number
    viewportWidth?: number
}): ShellViewportMetrics => {
    const safeViewportHeight = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 1
    const layoutTier = resolveShellLayoutTier(viewportWidth ?? Infinity)
    const viewportOffset = layoutTier === 'compact' ? SHELL_MOBILE_MAX_HEIGHT_OFFSET : SHELL_MAX_HEIGHT_OFFSET
    const availableHeight = Math.max(1, safeViewportHeight - viewportOffset)
    const renderHeight = Math.min(SHELL_DESIGN_HEIGHT, availableHeight)

    return {
        // Keep width usable on short/mobile viewports by shrinking render height directly.
        scale: 1,
        stageHeight: renderHeight,
        renderHeight
    }
}

export const useAppShellLayout = (isPanelVisible: Ref<boolean>) => {
    const shellScale = ref(1)
    const shellStageHeight = ref(SHELL_DESIGN_HEIGHT)
    const shellRenderHeight = ref(SHELL_DESIGN_HEIGHT)
    const shellLayoutTier = ref<AppShellLayoutTier>('desktop')

    const scrollHintListeners = new Map<HTMLElement, () => void>()
    const observedScrollHintRoots = new Set<Node>()
    let scrollHintMutationObserver: MutationObserver | null = null
    let scrollHintRefreshRaf: number | null = null
    let hostScrollLocked = false
    let originalHtmlOverflow = ''
    let originalHtmlOverscrollBehavior = ''
    let originalBodyOverflow = ''
    let originalBodyOverscrollBehavior = ''
    let hostScrollLockObserver: MutationObserver | null = null
    let hostScrollLockApplying = false

    const applyScrollHintState = (element: HTMLElement, state: 'none' | 'up' | 'down' | 'both') => {
        element.dataset.scrollHint = state

        const shell = element.parentElement
        if (shell?.classList.contains('hazelspam-scroll-hint-shell')) {
            shell.dataset.scrollHint = state
        }
    }

    const lockHostPageScroll = () => {
        const html = document.documentElement
        const body = document.body

        if (!hostScrollLocked) {
            originalHtmlOverflow = html.style.overflow
            originalHtmlOverscrollBehavior = html.style.overscrollBehavior
            originalBodyOverflow = body.style.overflow
            originalBodyOverscrollBehavior = body.style.overscrollBehavior
        }

        hostScrollLockApplying = true
        html.style.overflow = 'hidden'
        html.style.overscrollBehavior = 'none'
        body.style.overflow = 'hidden'
        body.style.overscrollBehavior = 'none'
        hostScrollLocked = true
        hostScrollLockApplying = false
    }

    const unlockHostPageScroll = () => {
        if (!hostScrollLocked) {
            return
        }

        const html = document.documentElement
        const body = document.body

        hostScrollLockApplying = true
        html.style.overflow = originalHtmlOverflow
        html.style.overscrollBehavior = originalHtmlOverscrollBehavior
        body.style.overflow = originalBodyOverflow
        body.style.overscrollBehavior = originalBodyOverscrollBehavior
        hostScrollLocked = false
        hostScrollLockApplying = false
    }

    const shellStageStyle = computed(() => ({
        '--hazelspam-shell-design-height': `${SHELL_DESIGN_HEIGHT}px`,
        '--hazelspam-shell-stage-height': `${Math.round(shellStageHeight.value)}px`,
        '--hazelspam-shell-render-height': `${Math.round(shellRenderHeight.value)}px`,
        '--hazelspam-shell-scale': shellScale.value.toFixed(4)
    }))
    const shellStageClass = computed(() => [
        'hazelspam-layout',
        `hazelspam-layout--${shellLayoutTier.value}`
    ])

    const resolveViewportHeight = () => {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight
        return Number.isFinite(viewportHeight) ? viewportHeight : window.innerHeight
    }

    const resolveViewportWidth = () => {
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth
        return Number.isFinite(viewportWidth) ? viewportWidth : window.innerWidth
    }

    const updateShellViewport = () => {
        const viewportWidth = resolveViewportWidth()
        shellLayoutTier.value = resolveShellLayoutTier(viewportWidth)

        const metrics = resolveShellViewportMetrics({
            viewportHeight: resolveViewportHeight(),
            viewportWidth
        })

        shellScale.value = metrics.scale
        shellStageHeight.value = metrics.stageHeight
        shellRenderHeight.value = metrics.renderHeight
    }

    const updateScrollHintState = (element: HTMLElement) => {
        const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight)
        if (maxScrollTop <= SCROLL_HINT_EDGE_EPSILON) {
            applyScrollHintState(element, 'none')
            return
        }

        const scrollTop = Math.max(0, element.scrollTop)
        const canScrollUp = scrollTop > SCROLL_HINT_EDGE_EPSILON
        const canScrollDown = maxScrollTop - scrollTop > SCROLL_HINT_EDGE_EPSILON

        if (canScrollUp && canScrollDown) {
            applyScrollHintState(element, 'both')
            return
        }

        if (canScrollUp) {
            applyScrollHintState(element, 'up')
            return
        }

        if (canScrollDown) {
            applyScrollHintState(element, 'down')
            return
        }

        applyScrollHintState(element, 'none')
    }

    const bindScrollHintListener = (element: HTMLElement) => {
        if (scrollHintListeners.has(element)) {
            updateScrollHintState(element)
            return
        }

        const onScroll = () => updateScrollHintState(element)
        element.addEventListener('scroll', onScroll, { passive: true })
        scrollHintListeners.set(element, () => element.removeEventListener('scroll', onScroll))
        updateScrollHintState(element)
    }

    const pruneDetachedScrollHintListeners = () => {
        for (const [element, cleanup] of scrollHintListeners) {
            if (document.contains(element)) {
                continue
            }
            cleanup()
            const shell = element.parentElement
            if (shell?.classList.contains('hazelspam-scroll-hint-shell')) {
                delete shell.dataset.scrollHint
            }
            scrollHintListeners.delete(element)
        }
    }

    const refreshScrollHintTargets = () => {
        document.querySelectorAll(SCROLL_HINT_TARGET_SELECTOR).forEach((node) => {
            if (!(node instanceof HTMLElement)) return
            bindScrollHintListener(node)
        })

        pruneDetachedScrollHintListeners()
    }

    const observeScrollHintRoot = (root: Node, options: MutationObserverInit) => {
        if (!scrollHintMutationObserver || observedScrollHintRoots.has(root)) {
            return
        }

        scrollHintMutationObserver.observe(root, options)
        observedScrollHintRoots.add(root)
    }

    const ensureScrollHintObserverTargets = () => {
        if (!scrollHintMutationObserver) {
            return
        }

        // Track direct mount/unmount under body, then observe HazelSpam-owned containers deeply.
        observeScrollHintRoot(document.body, { childList: true })
        document.querySelectorAll(APP_DIALOG_STYLE_SCOPE_SELECTOR).forEach((node) => {
            observeScrollHintRoot(node, { childList: true, subtree: true })
        })
    }

    const scheduleRefreshScrollHints = () => {
        if (scrollHintRefreshRaf !== null) {
            return
        }

        scrollHintRefreshRaf = window.requestAnimationFrame(() => {
            scrollHintRefreshRaf = null
            refreshScrollHintTargets()
        })
    }

    const handleViewportResize = () => {
        updateShellViewport()
        scheduleRefreshScrollHints()
    }

    watch(
        isPanelVisible,
        (visible) => {
            if (visible) {
                updateShellViewport()
                lockHostPageScroll()
            } else {
                unlockHostPageScroll()
            }
            scheduleRefreshScrollHints()
        },
        { immediate: true }
    )

    onMounted(() => {
        updateShellViewport()
        window.addEventListener('resize', handleViewportResize)
        window.visualViewport?.addEventListener('resize', handleViewportResize)
        scrollHintMutationObserver = new MutationObserver(() => {
            ensureScrollHintObserverTargets()
            scheduleRefreshScrollHints()
        })
        ensureScrollHintObserverTargets()
        hostScrollLockObserver = new MutationObserver(() => {
            if (hostScrollLockApplying || !isPanelVisible.value) {
                return
            }

            const html = document.documentElement
            const body = document.body
            if (
                html.style.overflow !== 'hidden' ||
                html.style.overscrollBehavior !== 'none' ||
                body.style.overflow !== 'hidden' ||
                body.style.overscrollBehavior !== 'none'
            ) {
                lockHostPageScroll()
            }
        })
        hostScrollLockObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class']
        })
        hostScrollLockObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class']
        })
        scheduleRefreshScrollHints()
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleViewportResize)
        window.visualViewport?.removeEventListener('resize', handleViewportResize)
        scrollHintMutationObserver?.disconnect()
        scrollHintMutationObserver = null
        observedScrollHintRoots.clear()
        if (scrollHintRefreshRaf !== null) {
            window.cancelAnimationFrame(scrollHintRefreshRaf)
            scrollHintRefreshRaf = null
        }
        for (const [element, cleanup] of scrollHintListeners) {
            cleanup()
            delete element.dataset.scrollHint
            const shell = element.parentElement
            if (shell?.classList.contains('hazelspam-scroll-hint-shell')) {
                delete shell.dataset.scrollHint
            }
        }
        scrollHintListeners.clear()
        hostScrollLockObserver?.disconnect()
        hostScrollLockObserver = null
        unlockHostPageScroll()
    })

    return {
        shellStageClass,
        shellStageStyle,
        shellLayoutTier,
        updateShellViewport
    }
}
