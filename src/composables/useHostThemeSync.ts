import { watch } from 'vue'
import { unsafeWindow } from '$'
import type { UiConfig } from '@/types'
import { APP_CSS_NAMESPACE } from '@/constants/brand'
import { applyAppColorTokens } from '@/theme/colorTokens'
import {
    ensureHostThemeSignalBridge,
    getLastKnownHostThemeSignalSnapshot,
    readCurrentHostThemeSignalSnapshot,
    setDarkReaderThemeSignalOverride,
    type HostThemeSignalSnapshot
} from './hostThemeSignalBridge'
import {
    HOST_SURFACE_THEME_ATTR,
    HOST_SURFACE_THEME_CONTEXT_ATTR,
    applyHostSurfaceNativeCssMapTheme,
    bootstrapBiliThemeDocumentHints as bootstrapBiliThemeDocumentHintsEarly,
    isBootstrappedHostSurfaceTheme,
    resolveBrowserTheme,
    resolveHostSurfaceThemeContext,
    setHostSurfaceThemeState,
    type HostSurfaceThemeContext
} from './hostThemeSurfaceBootstrap'

type UseHostThemeSyncOptions = {
    syncColorTokens?: boolean
}

type HostThemeApi = Window['bililiveThemeV2']
type HostThemeHandler = (theme: UiConfig['theme']) => void
type PatchedHostThemeApi = HostThemeApi & {
    __hazelspamPatched?: boolean
    __hazelspamOriginalChangeTheme?: HostThemeHandler | null
    __hazelspamOriginalInitThemeWithCSR?: HostThemeHandler | null
    __hazelspamOriginalGetTheme?: (() => UiConfig['theme']) | null
}
type HostDarkModeLabConfig = {
    status?: number
    option?: unknown
}
type HostDarkModeLabVm = {
    _isDestroyed?: boolean
    configs?: Record<string, HostDarkModeLabConfig>
    plugs?: Record<string, HostDarkModeLabConfig>
    getStatus?: (key: string) => 'on' | 'off'
    toggleSwitch?: (event: { target: EventTarget | null }, key: string) => Promise<unknown>
}
type HostDarkModeLabController = {
    switchNode: HTMLElement
    vm: HostDarkModeLabVm
}
type VueInstanceWithParent = {
    $parent?: unknown
}
type ElementWithVue = HTMLElement & {
    __vue__?: VueInstanceWithParent
}
type HostSidebarControllerVm = {
    currentPopupName?: string | null
    openPopup?: (name: string) => void
    closePopup?: () => void
}
type HostThemeApplicationMode = 'host-complete' | 'surface-patch' | 'ui-only'
type BiliThemeRequestSource = 'startup' | 'browser-sync' | 'host-follow' | 'host-api' | 'manual'
type BiliThemeStrategyId = 'live-room' | 'blackboard' | 'lite-live'
type HostThemeApplicationResult = {
    ok: boolean
    mode: HostThemeApplicationMode
    targetTheme: UiConfig['theme']
    effectiveTheme: UiConfig['theme']
    source: BiliThemeRequestSource
    reason:
        | 'already-applied'
        | 'host-complete'
        | 'surface-patch'
        | 'ui-only-fallback'
        | 'host-unavailable'
}
type HostThemeSyncRuntimeState = {
    cachedDarkModeLabController: HostDarkModeLabController | null
    darkModeLabWarmupPromise: Promise<HostDarkModeLabController | null> | null
}
type BiliThemeRuntimeSnapshot = {
    strategy: BiliThemeStrategyId
    browserPreferredTheme: UiConfig['theme']
    requestedTheme: UiConfig['theme'] | null
    hostTheme: UiConfig['theme'] | null
    hostSnapshot: HostThemeSignalSnapshot | null
    effectiveTheme: UiConfig['theme']
    effectiveMode: HostThemeApplicationMode
    source: BiliThemeRequestSource
}
type BiliThemeStrategy = {
    id: BiliThemeStrategyId
    surfaceContext: HostSurfaceThemeContext | null
    supportsHostComplete: boolean
    supportsSurfacePatch: boolean
    unavailableMode: HostThemeApplicationMode
}
type ApplyResolvedThemeOptions = {
    mode?: HostThemeApplicationMode
    source?: BiliThemeRequestSource
    requestedTheme?: UiConfig['theme'] | null
}
type HostSurfaceInlinePatchTarget = {
    selector: string
    styles: Record<string, string>
}

const HOST_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'
const HOST_DARK_MODE_LABEL = '深色模式'
const HOST_DARK_MODE_KEY = 'dark'
const HOST_LAB_POPUP_NAME = 'Laboratory'
const HOST_THEME_SYNC_READINESS_TIMEOUT_MS = 1200
const HOST_THEME_SYNC_READINESS_POLL_INTERVAL_MS = 50
const HOST_THEME_STARTUP_RECONCILE_TIMEOUT_MS = 3000
const HOST_THEME_STARTUP_RECONCILE_RETRY_INTERVAL_MS = 100
const HOST_THEME_COMPLETION_TIMEOUT_MS = 2000
const HOST_THEME_COMPLETION_POLL_INTERVAL_MS = 50
const HOST_DARK_MODE_LAB_VM_TIMEOUT_MS = 1500
const HOST_DARK_MODE_LAB_PREWARM_STYLE_ID = `${APP_CSS_NAMESPACE}-host-lab-prewarm-style`
const HOST_DARK_MODE_LAB_PREWARM_ATTR = `data-${APP_CSS_NAMESPACE}-host-lab-prewarm`
const HOST_SURFACE_THEME_STYLE_ID = `${APP_CSS_NAMESPACE}-host-surface-theme-style`
const HOST_THEME_SYNC_RUNTIME_STATE_KEY = '__hazelspamUserscriptHostThemeSyncState'
const HOST_THEME_SYNCED_UI_CONFIGS = new Set<UiConfig>()
const OBSERVED_UI_CONFIGS = new WeakSet<UiConfig>()
const LITE_LIVE_SURFACE_INLINE_PATCH_TARGETS: HostSurfaceInlinePatchTarget[] = [
    {
        selector: '.head-info-section',
        styles: {
            'background-color': 'rgba(15, 17, 19, 0.94)',
            'background-image': 'none'
        }
    },
    {
        selector: '.gift-control-panel',
        styles: {
            'background-color': 'rgba(15, 17, 19, 0.94)',
            'background-image': 'none'
        }
    },
    {
        selector: '.chat-history-panel',
        styles: {
            'background-color': 'rgba(15, 17, 19, 0.94)'
        }
    },
    {
        selector: '.chat-input-ctnr',
        styles: {
            'background-color': 'rgba(15, 17, 19, 0.94)'
        }
    }
]

let currentHostTheme: UiConfig['theme'] = 'light'
let currentHostThemeSnapshot: HostThemeSignalSnapshot | null = null
let hostThemeBrowserSyncEnabled = false
let browserThemeMediaQueryList: MediaQueryList | null = null
let browserThemeChangeListener: ((event: MediaQueryListEvent) => void) | null = null
let hostThemePatchPollTimer: number | null = null
let hostThemeSyncGraceTimer: number | null = null
let programmaticThemeChangeDepth = 0
let isHostThemeSyncInGracePeriod = false
let currentBiliThemeRuntimeSnapshot: BiliThemeRuntimeSnapshot = {
    strategy: 'live-room',
    browserPreferredTheme: 'light',
    requestedTheme: null,
    hostTheme: null,
    hostSnapshot: null,
    effectiveTheme: 'light',
    effectiveMode: 'ui-only',
    source: 'startup'
}

const getHostThemeSyncRuntimeState = (): HostThemeSyncRuntimeState | null => {
    if (typeof window === 'undefined') {
        return null
    }

    const runtimeWindow = window as Window & {
        __hazelspamUserscriptHostThemeSyncState?: HostThemeSyncRuntimeState
    }
    if (!runtimeWindow[HOST_THEME_SYNC_RUNTIME_STATE_KEY]) {
        runtimeWindow[HOST_THEME_SYNC_RUNTIME_STATE_KEY] = {
            cachedDarkModeLabController: null,
            darkModeLabWarmupPromise: null
        }
    }

    return runtimeWindow[HOST_THEME_SYNC_RUNTIME_STATE_KEY] ?? null
}

const runWithProgrammaticThemeChangeAsync = async <T>(task: () => Promise<T>): Promise<T> => {
    programmaticThemeChangeDepth += 1
    try {
        return await task()
    } finally {
        programmaticThemeChangeDepth -= 1
    }
}

const cancelHostThemeSyncGracePeriod = () => {
    if (hostThemeSyncGraceTimer === null) {
        return
    }

    window.clearTimeout(hostThemeSyncGraceTimer)
    hostThemeSyncGraceTimer = null
}

const isSupportedTheme = (value: unknown): value is UiConfig['theme'] =>
    value === 'dark' || value === 'light'

const normalizeTheme = (value: unknown, fallback: UiConfig['theme']): UiConfig['theme'] =>
    isSupportedTheme(value) ? value : fallback

const resolveBiliThemeStrategy = (): BiliThemeStrategy => {
    const surfaceContext = resolveHostSurfaceThemeContext()
    if (surfaceContext === 'blackboard') {
        return {
            id: 'blackboard',
            surfaceContext,
            supportsHostComplete: false,
            supportsSurfacePatch: true,
            unavailableMode: 'ui-only'
        }
    }

    if (surfaceContext === 'lite-live') {
        return {
            id: 'lite-live',
            surfaceContext,
            // Some liteVersion pages now expose the same laboratory dark-mode flow as normal live rooms.
            // Try host-complete first, then fall back to surface-patch/ui-only if unavailable.
            supportsHostComplete: true,
            supportsSurfacePatch: true,
            unavailableMode: 'ui-only'
        }
    }

    return {
        id: 'live-room',
        surfaceContext: null,
        supportsHostComplete: true,
        supportsSurfacePatch: false,
        unavailableMode: 'host-complete'
    }
}

const isUiOnlyHostThemeContext = () => resolveBiliThemeStrategy().unavailableMode === 'ui-only'

const createFallbackHostThemeSnapshot = (
    theme: UiConfig['theme'],
    completeness: HostThemeSignalSnapshot['completeness'] = 'unknown'
): HostThemeSignalSnapshot => ({
    theme,
    completeness,
    completeTheme: null,
    isCompleteDark: false,
    isCompleteLight: false,
    signals: {
        apiTheme: theme,
        labTheme: null,
        cssMapTheme: null,
        navbarTheme: null,
        roomTheme: null
    }
})

const rememberHostThemeSnapshot = (snapshot: HostThemeSignalSnapshot | null) => {
    if (!snapshot) {
        return null
    }

    currentHostTheme = snapshot.theme
    currentHostThemeSnapshot = snapshot
    currentBiliThemeRuntimeSnapshot = {
        ...currentBiliThemeRuntimeSnapshot,
        strategy: resolveBiliThemeStrategy().id,
        hostTheme: snapshot.theme,
        hostSnapshot: snapshot
    }
    return snapshot
}

const isCssMapOnlyHostThemeSnapshot = (snapshot: HostThemeSignalSnapshot | null) => {
    if (!snapshot) {
        return false
    }

    return (
        snapshot.signals.cssMapTheme !== null &&
        snapshot.signals.apiTheme === null &&
        snapshot.signals.labTheme === null &&
        snapshot.signals.navbarTheme === null &&
        snapshot.signals.roomTheme === null
    )
}

const isReliableResolvedHostThemeSnapshot = (snapshot: HostThemeSignalSnapshot | null) => {
    if (!snapshot) {
        return false
    }

    if (snapshot.completeTheme) {
        return true
    }

    if (isUiOnlyHostThemeContext()) {
        return false
    }

    if (isCssMapOnlyHostThemeSnapshot(snapshot)) {
        return false
    }

    return true
}

const applyHostThemeUi = (theme: UiConfig['theme']) => {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement.style.colorScheme = theme
}

const parseRgbColor = (value: string | null | undefined) => {
    if (!value) {
        return null
    }

    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i)
    if (!match) {
        return null
    }

    const [, r, g, b, alpha] = match
    return {
        r: Number(r),
        g: Number(g),
        b: Number(b),
        alpha: alpha === undefined ? 1 : Number(alpha)
    }
}

const getColorLuminance = (value: string | null | undefined) => {
    const parsedColor = parseRgbColor(value)
    if (!parsedColor) {
        return null
    }

    return (
        (0.2126 * parsedColor.r + 0.7152 * parsedColor.g + 0.0722 * parsedColor.b) / 255
    )
}

const ensureHostSurfaceThemeStyle = () => {
    if (typeof document === 'undefined') {
        return null
    }

    const existingStyle = document.getElementById(HOST_SURFACE_THEME_STYLE_ID)
    if (existingStyle) {
        return existingStyle
    }

    const styleElement = document.createElement('style')
    styleElement.id = HOST_SURFACE_THEME_STYLE_ID
    styleElement.textContent = `
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar {
    background: rgba(17, 19, 21, 0.94) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: rgb(235, 239, 244) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar a,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar span,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar svg,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar path {
    color: rgb(235, 239, 244) !important;
    fill: currentColor !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar .center-search-container,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar .center-search,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar .nav-search-content {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar .nav-search-input,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar .nav-search-btn {
    color: rgb(235, 239, 244) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-header__bar .nav-search-input::placeholder {
    color: rgba(235, 239, 244, 0.62) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-footer {
    background: rgb(15, 17, 19) !important;
    color: rgb(208, 214, 222) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-footer a,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-footer span,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="blackboard"] .bili-footer div {
    color: rgb(208, 214, 222) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .head-info-section,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .gift-control-panel,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-history-panel,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-input-ctnr {
    background: rgba(15, 17, 19, 0.94) !important;
    background-image: none !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    box-shadow: none !important;
    color: rgb(235, 239, 244) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .head-info-section.header-info-ctnr.bg-bright-filter.live-skin-coloration-area,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .gift-control-panel.gift-control-section.bg-bright-filter {
    background: rgba(15, 17, 19, 0.94) !important;
    background-color: rgba(15, 17, 19, 0.94) !important;
    background-image: none !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .head-info-section *,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .gift-control-panel *,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-history-panel *,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-input-ctnr * {
    color: rgb(235, 239, 244) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-input-ctnr input,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-input-ctnr textarea {
    background: rgba(255, 255, 255, 0.06) !important;
}

html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-input-ctnr input::placeholder,
html[${HOST_SURFACE_THEME_ATTR}="dark"][${HOST_SURFACE_THEME_CONTEXT_ATTR}="lite-live"] .chat-input-ctnr textarea::placeholder {
    color: rgba(235, 239, 244, 0.62) !important;
}
`

    if (document.head?.appendChild) {
        document.head.appendChild(styleElement)
    } else {
        document.documentElement?.appendChild?.(styleElement)
    }

    return styleElement
}

const applyLiteLiveSurfaceInlinePatch = (theme: UiConfig['theme']) => {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
        return
    }

    LITE_LIVE_SURFACE_INLINE_PATCH_TARGETS.forEach(({ selector, styles }) => {
        const element = document.querySelector<HTMLElement>(selector)
        if (!element) {
            return
        }

        Object.entries(styles).forEach(([property, value]) => {
            if (theme === 'dark') {
                element.style.setProperty(property, value, 'important')
                return
            }

            element.style.removeProperty(property)
        })
    })
}

const applyHostSurfaceThemeInlinePatch = (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme']
) => {
    if (context === 'lite-live') {
        applyLiteLiveSurfaceInlinePatch(theme)
    }
}

const applyHostSurfaceThemeFallbackPatch = (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme']
) => {
    if (theme !== 'dark') {
        applyHostSurfaceThemeInlinePatch(context, 'light')
        return
    }

    ensureHostSurfaceThemeStyle()
    applyHostSurfaceThemeInlinePatch(context, theme)
}

const clearHostSurfaceThemeFallbackPatch = () => {
    if (typeof document === 'undefined') {
        return
    }

    const styleElement = document.getElementById(HOST_SURFACE_THEME_STYLE_ID)
    styleElement?.remove()
    applyHostSurfaceThemeInlinePatch('lite-live', 'light')
}

const clearHostSurfaceThemeState = () => {
    if (typeof document === 'undefined') {
        return
    }

    clearHostSurfaceThemeFallbackPatch()
    document.documentElement?.removeAttribute(HOST_SURFACE_THEME_CONTEXT_ATTR)
    document.documentElement?.removeAttribute(HOST_SURFACE_THEME_ATTR)
}

const isDarkSurfaceElement = (selector: string) => {
    if (
        typeof document === 'undefined' ||
        typeof document.querySelector !== 'function' ||
        typeof getComputedStyle !== 'function'
    ) {
        return false
    }

    const element = document.querySelector<HTMLElement>(selector)
    if (!element) {
        return false
    }

    const styles = getComputedStyle(element)
    const luminance = getColorLuminance(styles.backgroundColor)
    if (luminance === null) {
        return false
    }

    return luminance < 0.5
}

const getHostSurfaceRequiredSelectors = (context: HostSurfaceThemeContext) =>
    context === 'blackboard'
        ? ['.bili-header__bar', '.bili-footer']
        : ['.head-info-section', '.gift-control-panel', '.chat-history-panel', '.chat-input-ctnr']

const hasAnyHostSurfaceElement = (context: HostSurfaceThemeContext) => {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
        return false
    }

    return getHostSurfaceRequiredSelectors(context).some((selector) => document.querySelector(selector))
}

const verifyHostSurfaceThemePatch = (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme']
) => {
    if (typeof document === 'undefined') {
        return false
    }

    if (
        document.documentElement?.getAttribute(HOST_SURFACE_THEME_CONTEXT_ATTR) !== context ||
        document.documentElement?.getAttribute(HOST_SURFACE_THEME_ATTR) !== theme
    ) {
        return false
    }

    const requiredSelectors = getHostSurfaceRequiredSelectors(context)

    if (theme === 'light') {
        return requiredSelectors.every((selector) => !isDarkSurfaceElement(selector))
    }

    return requiredSelectors.every((selector) => isDarkSurfaceElement(selector))
}

const waitForHostSurfaceThemePatchVerification = async (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme'],
    timeoutMs = HOST_THEME_COMPLETION_TIMEOUT_MS
) => {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
        if (verifyHostSurfaceThemePatch(context, theme)) {
            return true
        }

        await waitForMs(HOST_THEME_COMPLETION_POLL_INTERVAL_MS)
    }

    return verifyHostSurfaceThemePatch(context, theme)
}

const ensureHostSurfaceThemePatch = async (
    nextTheme: UiConfig['theme'],
    source: BiliThemeRequestSource
) => {
    const { surfaceContext: context } = resolveBiliThemeStrategy()
    if (!context) {
        return false
    }

    clearHostSurfaceThemeFallbackPatch()
    applyHostSurfaceNativeCssMapTheme(nextTheme)
    setHostSurfaceThemeState(context, nextTheme)

    if (!hasAnyHostSurfaceElement(context)) {
        clearHostSurfaceThemeState()
        return false
    }

    if (!(await waitForHostSurfaceThemePatchVerification(context, nextTheme))) {
        if (nextTheme !== 'dark') {
            clearHostSurfaceThemeState()
            return false
        }

        applyHostSurfaceThemeFallbackPatch(context, nextTheme)
        if (!(await waitForHostSurfaceThemePatchVerification(context, nextTheme))) {
            clearHostSurfaceThemeState()
            return false
        }
    }

    rememberHostThemeSnapshot(createFallbackHostThemeSnapshot(nextTheme, 'partial'))
    applyResolvedThemeToUi(nextTheme, {
        mode: 'surface-patch',
        source,
        requestedTheme: nextTheme
    })
    return true
}

const syncDarkReaderThemeSignalWithRuntimeSnapshot = () => {
    if (
        currentBiliThemeRuntimeSnapshot.effectiveMode === 'surface-patch' &&
        currentBiliThemeRuntimeSnapshot.effectiveTheme === 'dark'
    ) {
        setDarkReaderThemeSignalOverride({
            theme: 'dark',
            mode: 'surface-patch',
            verified: true
        })
        return
    }

    setDarkReaderThemeSignalOverride(null)
}

const updateBiliThemeRuntimeSnapshot = (patch: Partial<BiliThemeRuntimeSnapshot>) => {
    currentBiliThemeRuntimeSnapshot = {
        ...currentBiliThemeRuntimeSnapshot,
        strategy: resolveBiliThemeStrategy().id,
        ...patch
    }
    syncDarkReaderThemeSignalWithRuntimeSnapshot()
    return currentBiliThemeRuntimeSnapshot
}

const resolveThemeApplicationModeFromSnapshot = (
    snapshot: HostThemeSignalSnapshot | null
): HostThemeApplicationMode => {
    if (snapshot?.completeTheme) {
        return 'host-complete'
    }

    return 'ui-only'
}

export const getBiliThemeRuntimeSnapshot = (): BiliThemeRuntimeSnapshot => ({
    ...currentBiliThemeRuntimeSnapshot
})

export const bootstrapBiliThemeDocumentHints = () => {
    bootstrapBiliThemeDocumentHintsEarly()
    const strategy = resolveBiliThemeStrategy()
    const { surfaceContext: context } = strategy
    const browserTheme = resolveBrowserTheme()
    updateBiliThemeRuntimeSnapshot({
        strategy: strategy.id,
        browserPreferredTheme: browserTheme
    })

    if (!context || !isBootstrappedHostSurfaceTheme(context, 'dark')) {
        return
    }

    rememberHostThemeSnapshot(createFallbackHostThemeSnapshot('dark', 'partial'))
    applyResolvedThemeToUi('dark', {
        mode: 'surface-patch',
        source: 'startup',
        requestedTheme: 'dark'
    })
}

const notifyHostThemeSubscribers = (theme: UiConfig['theme']) => {
    currentHostTheme = theme
    HOST_THEME_SYNCED_UI_CONFIGS.forEach((uiConfig) => {
        if (uiConfig.followBiliTheme && uiConfig.theme !== theme) {
            uiConfig.theme = theme
        }
    })
}

const applyResolvedThemeToUi = (
    theme: UiConfig['theme'],
    { mode, source, requestedTheme }: ApplyResolvedThemeOptions = {}
) => {
    applyHostThemeUi(theme)
    notifyHostThemeSubscribers(theme)
    updateBiliThemeRuntimeSnapshot({
        browserPreferredTheme: resolveBrowserTheme(),
        requestedTheme:
            requestedTheme === undefined
                ? currentBiliThemeRuntimeSnapshot.requestedTheme
                : requestedTheme,
        effectiveTheme: theme,
        effectiveMode: mode ?? currentBiliThemeRuntimeSnapshot.effectiveMode,
        source: source ?? currentBiliThemeRuntimeSnapshot.source
    })
}

const isHostDarkModeLabVm = (value: unknown): value is HostDarkModeLabVm => {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as HostDarkModeLabVm
    return (
        typeof candidate.getStatus === 'function' &&
        typeof candidate.toggleSwitch === 'function'
    )
}

const isHostSidebarControllerVm = (value: unknown): value is HostSidebarControllerVm => {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as HostSidebarControllerVm
    return typeof candidate.openPopup === 'function' && typeof candidate.closePopup === 'function'
}

const resolveHostDarkModeLabVm = (): HostDarkModeLabController | null => {
    if (typeof document === 'undefined') {
        return null
    }

    const item = Array.from(document.querySelectorAll<HTMLElement>('.lab-item')).find(
        (candidate) =>
            candidate.querySelector<HTMLElement>('.lab-title')?.textContent?.trim() === HOST_DARK_MODE_LABEL
    )
    const switchNode = item?.querySelector<HTMLElement>('.bl-switch')
    const switchVm = (switchNode as ElementWithVue | null)?.__vue__
    const parentVm = switchVm?.$parent
    if (!switchNode || !isHostDarkModeLabVm(parentVm)) {
        return null
    }

    return {
        switchNode,
        vm: parentVm
    }
}

const isLiveHostDarkModeLabController = (
    controller: HostDarkModeLabController | null
): controller is HostDarkModeLabController => {
    if (!controller) {
        return false
    }

    return isHostDarkModeLabVm(controller.vm) && controller.vm._isDestroyed !== true
}

const rememberHostDarkModeLabController = (controller: HostDarkModeLabController | null) => {
    const runtimeState = getHostThemeSyncRuntimeState()
    if (!runtimeState) {
        return null
    }

    runtimeState.cachedDarkModeLabController = isLiveHostDarkModeLabController(controller)
        ? controller
        : null
    return runtimeState.cachedDarkModeLabController
}

const getCachedHostDarkModeLabController = () => {
    const runtimeState = getHostThemeSyncRuntimeState()
    if (!runtimeState) {
        return null
    }

    if (!isLiveHostDarkModeLabController(runtimeState.cachedDarkModeLabController)) {
        runtimeState.cachedDarkModeLabController = null
    }

    return runtimeState.cachedDarkModeLabController
}

const resolveHostSidebarControllerVm = (): HostSidebarControllerVm | null => {
    if (typeof document === 'undefined') {
        return null
    }

    const candidates = Array.from(
        document.querySelectorAll<HTMLElement>('.z-sidebar, .contain-optimize, .side-bar-popup-cntr')
    )
    for (const element of candidates) {
        let instance: unknown = (element as ElementWithVue).__vue__
        while (instance && typeof instance === 'object') {
            if (isHostSidebarControllerVm(instance)) {
                return instance
            }
            instance = (instance as VueInstanceWithParent).$parent
        }
    }

    return null
}

const waitForHostDarkModeLabVm = async (timeoutMs = HOST_DARK_MODE_LAB_VM_TIMEOUT_MS) => {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
        const hostDarkModeLab = resolveHostDarkModeLabVm()
        if (hostDarkModeLab) {
            return hostDarkModeLab
        }

        await new Promise((resolve) => window.setTimeout(resolve, 16))
    }

    return null
}

const ensureHostDarkModeLabPrewarmStyle = () => {
    if (typeof document === 'undefined') {
        return null
    }

    const existingStyle = document.getElementById(HOST_DARK_MODE_LAB_PREWARM_STYLE_ID)
    if (existingStyle) {
        return existingStyle
    }

    const styleElement = document.createElement('style')
    styleElement.id = HOST_DARK_MODE_LAB_PREWARM_STYLE_ID
    styleElement.textContent = `
html[${HOST_DARK_MODE_LAB_PREWARM_ATTR}="true"] .side-bar-popup-cntr,
html[${HOST_DARK_MODE_LAB_PREWARM_ATTR}="true"] .side-bar-popup-mask {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transition: none !important;
    animation: none !important;
}

html[${HOST_DARK_MODE_LAB_PREWARM_ATTR}="true"] .side-bar-popup-cntr *,
html[${HOST_DARK_MODE_LAB_PREWARM_ATTR}="true"] .side-bar-popup-mask * {
    transition: none !important;
    animation: none !important;
}
`

    if (document.head?.appendChild) {
        document.head.appendChild(styleElement)
    } else {
        document.documentElement?.appendChild?.(styleElement)
    }

    return styleElement
}

const enableHostDarkModeLabPrewarmGuard = () => {
    if (typeof document === 'undefined') {
        return () => undefined
    }

    ensureHostDarkModeLabPrewarmStyle()
    document.documentElement?.setAttribute(HOST_DARK_MODE_LAB_PREWARM_ATTR, 'true')

    return () => {
        document.documentElement?.removeAttribute(HOST_DARK_MODE_LAB_PREWARM_ATTR)
    }
}

const primeHostDarkModeLabController = async () => {
    const cachedController = getCachedHostDarkModeLabController()
    if (cachedController) {
        return cachedController
    }

    const resolvedController = resolveHostDarkModeLabVm()
    if (resolvedController) {
        return rememberHostDarkModeLabController(resolvedController)
    }

    const runtimeState = getHostThemeSyncRuntimeState()
    if (!runtimeState) {
        return null
    }

    if (runtimeState.darkModeLabWarmupPromise) {
        return runtimeState.darkModeLabWarmupPromise
    }

    const sidebarControllerVm = resolveHostSidebarControllerVm()
    if (!sidebarControllerVm) {
        return null
    }

    const currentPopupName = sidebarControllerVm.currentPopupName ?? null
    if (currentPopupName && currentPopupName !== HOST_LAB_POPUP_NAME) {
        return null
    }

    runtimeState.darkModeLabWarmupPromise = (async () => {
        let shouldClosePopup = false
        let restorePopupVisibility: (() => void) | null = null
        try {
            if (currentPopupName !== HOST_LAB_POPUP_NAME) {
                shouldClosePopup = true
                restorePopupVisibility = enableHostDarkModeLabPrewarmGuard()
                sidebarControllerVm.openPopup?.(HOST_LAB_POPUP_NAME)
            }

            const hostDarkModeLab = await waitForHostDarkModeLabVm()
            return rememberHostDarkModeLabController(hostDarkModeLab)
        } finally {
            if (shouldClosePopup) {
                sidebarControllerVm.closePopup?.()
            }
            restorePopupVisibility?.()
            runtimeState.darkModeLabWarmupPromise = null
        }
    })()

    return runtimeState.darkModeLabWarmupPromise
}

const getResolvedHostThemeSnapshot = (fallbackToBrowser = false): HostThemeSignalSnapshot | null => {
    const currentSnapshot = readCurrentHostThemeSignalSnapshot()
    const bridgedSnapshot = getLastKnownHostThemeSignalSnapshot()
    if (isReliableResolvedHostThemeSnapshot(currentSnapshot)) {
        return rememberHostThemeSnapshot(currentSnapshot)
    }
    if (isReliableResolvedHostThemeSnapshot(bridgedSnapshot)) {
        return rememberHostThemeSnapshot(bridgedSnapshot)
    }

    if (!isUiOnlyHostThemeContext()) {
        const hostTheme = unsafeWindow.bililiveThemeV2?.getTheme?.()
        if (isSupportedTheme(hostTheme)) {
            return rememberHostThemeSnapshot(createFallbackHostThemeSnapshot(hostTheme, 'partial'))
        }
    }

    if (fallbackToBrowser) {
        return rememberHostThemeSnapshot(createFallbackHostThemeSnapshot(resolveBrowserTheme()))
    }

    if (currentHostThemeSnapshot) {
        return currentHostThemeSnapshot
    }

    return rememberHostThemeSnapshot(createFallbackHostThemeSnapshot(currentHostTheme))
}

const getResolvedHostTheme = (fallbackToBrowser = false): UiConfig['theme'] | null =>
    getResolvedHostThemeSnapshot(fallbackToBrowser)?.theme ?? null

export const resolveHostTheme = (): UiConfig['theme'] | null => getResolvedHostTheme()

const waitForMs = (delayMs: number) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayMs)
    })

const waitForResolvedHostThemeSnapshot = async (
    predicate: (snapshot: HostThemeSignalSnapshot) => boolean,
    timeoutMs = HOST_THEME_COMPLETION_TIMEOUT_MS
) => {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
        const snapshot = getResolvedHostThemeSnapshot()
        if (snapshot && predicate(snapshot)) {
            return snapshot
        }

        await new Promise((resolve) =>
            window.setTimeout(resolve, HOST_THEME_COMPLETION_POLL_INTERVAL_MS)
        )
    }

    return null
}

const waitForHostThemeSyncReadiness = async () => {
    const startTime = Date.now()
    while (Date.now() - startTime < HOST_THEME_SYNC_READINESS_TIMEOUT_MS) {
        const snapshot = getResolvedHostThemeSnapshot()
        if (snapshot?.completeness !== 'unknown') {
            return snapshot
        }

        await new Promise((resolve) =>
            window.setTimeout(resolve, HOST_THEME_SYNC_READINESS_POLL_INTERVAL_MS)
        )
    }

    return getResolvedHostThemeSnapshot(true)
}

const ensureHostThemeCompleteViaLab = async (
    nextTheme: UiConfig['theme'],
    source: BiliThemeRequestSource
) => {
    const currentSnapshot = getResolvedHostThemeSnapshot()
    if (currentSnapshot?.completeTheme === nextTheme) {
        applyResolvedThemeToUi(currentSnapshot.theme, {
            mode: 'host-complete',
            source,
            requestedTheme: nextTheme
        })
        return true
    }

    let hostDarkModeLab =
        getCachedHostDarkModeLabController() ?? (await primeHostDarkModeLabController())
    if (!hostDarkModeLab) {
        return false
    }

    const nextStatus = nextTheme === 'dark' ? 'on' : 'off'
    const getRequiredHostDarkModeLab = () => {
        if (!hostDarkModeLab) {
            throw new Error('host-dark-mode-lab-controller-unavailable')
        }

        return hostDarkModeLab
    }

    const tryToggleHostTheme = async () => {
        const activeHostDarkModeLab = getRequiredHostDarkModeLab()
        if (activeHostDarkModeLab.vm.getStatus?.(HOST_DARK_MODE_KEY) !== nextStatus) {
            await runWithProgrammaticThemeChangeAsync(() =>
                Promise.resolve(
                    activeHostDarkModeLab.vm.toggleSwitch?.(
                        { target: activeHostDarkModeLab.switchNode },
                        HOST_DARK_MODE_KEY
                    )
                )
            )
            return
        }

        if (currentSnapshot?.theme === nextTheme) {
            const resolvedSnapshot = await waitForResolvedHostThemeSnapshot(
                (snapshot) => snapshot.completeTheme === nextTheme
            )
            if (resolvedSnapshot) {
                applyResolvedThemeToUi(resolvedSnapshot.theme, {
                    mode: 'host-complete',
                    source,
                    requestedTheme: nextTheme
                })
                return
            }
        }
    }

    try {
        await tryToggleHostTheme()
    } catch {
        rememberHostDarkModeLabController(null)
        hostDarkModeLab = await primeHostDarkModeLabController()
        if (!hostDarkModeLab) {
            return false
        }

        await tryToggleHostTheme()
    }

    const resolvedSnapshot = await waitForResolvedHostThemeSnapshot(
        (snapshot) => snapshot.completeTheme === nextTheme
    )
    if (!resolvedSnapshot) {
        return false
    }

    applyResolvedThemeToUi(resolvedSnapshot.theme, {
        mode: 'host-complete',
        source,
        requestedTheme: nextTheme
    })
    return true
}

const patchHostThemeApi = () => {
    const hostThemeApi = unsafeWindow.bililiveThemeV2 as PatchedHostThemeApi | undefined
    if (!hostThemeApi) {
        return null
    }

    if (hostThemeApi.__hazelspamPatched) {
        return hostThemeApi
    }

    const originalChangeTheme =
        typeof hostThemeApi.changeTheme === 'function' ? hostThemeApi.changeTheme.bind(hostThemeApi) : null
    const originalInitThemeWithCSR =
        typeof hostThemeApi.initThemeWithCSR === 'function'
            ? hostThemeApi.initThemeWithCSR.bind(hostThemeApi)
            : null
    const originalGetTheme =
        typeof hostThemeApi.getTheme === 'function' ? hostThemeApi.getTheme.bind(hostThemeApi) : null

    hostThemeApi.__hazelspamPatched = true
    hostThemeApi.__hazelspamOriginalChangeTheme = originalChangeTheme
    hostThemeApi.__hazelspamOriginalInitThemeWithCSR = originalInitThemeWithCSR
    hostThemeApi.__hazelspamOriginalGetTheme = originalGetTheme

    hostThemeApi.changeTheme = (theme: UiConfig['theme']) => {
        const nextTheme = normalizeTheme(theme, currentHostTheme)
        const browserTheme = resolveBrowserTheme()
        const previousTheme = getResolvedHostThemeSnapshot()?.theme ?? currentHostTheme
        if (
            hostThemeBrowserSyncEnabled &&
            !isUiOnlyHostThemeContext() &&
            !isHostThemeSyncInGracePeriod &&
            programmaticThemeChangeDepth === 0 &&
            nextTheme !== previousTheme &&
            nextTheme !== browserTheme
        ) {
            disableHostThemeBrowserSync('host-changeTheme-outside-programmatic-guard')
        }

        originalChangeTheme?.(nextTheme)

        if (hostThemeBrowserSyncEnabled && isUiOnlyHostThemeContext()) {
            rememberHostThemeSnapshot(createFallbackHostThemeSnapshot(browserTheme))
            applyResolvedThemeToUi(browserTheme, {
                mode: 'ui-only',
                source: 'browser-sync',
                requestedTheme: browserTheme
            })
            return
        }

        const resolvedSnapshot = getResolvedHostThemeSnapshot()
        applyResolvedThemeToUi(resolvedSnapshot?.theme ?? nextTheme, {
            mode: resolveThemeApplicationModeFromSnapshot(resolvedSnapshot),
            source: 'host-api'
        })
    }

    hostThemeApi.initThemeWithCSR = (theme: UiConfig['theme']) => {
        const nextTheme = normalizeTheme(theme, currentHostTheme)
        originalInitThemeWithCSR?.(nextTheme)
        const resolvedSnapshot = getResolvedHostThemeSnapshot()
        applyResolvedThemeToUi(resolvedSnapshot?.theme ?? nextTheme, {
            mode: resolveThemeApplicationModeFromSnapshot(resolvedSnapshot),
            source: 'host-api'
        })
    }

    hostThemeApi.getTheme = () => normalizeTheme(originalGetTheme?.(), currentHostTheme)

    const initialTheme = originalGetTheme?.()
    if (isSupportedTheme(initialTheme) && !hostThemeBrowserSyncEnabled) {
        const resolvedSnapshot = getResolvedHostThemeSnapshot()
        applyResolvedThemeToUi(resolvedSnapshot?.theme ?? initialTheme, {
            mode: resolveThemeApplicationModeFromSnapshot(resolvedSnapshot),
            source: 'startup'
        })
    }
    if (hostThemeBrowserSyncEnabled) {
        void scheduleBrowserThemeSyncAfterGracePeriod()
    }

    return hostThemeApi
}

const scheduleHostThemeApiPatch = () => {
    if (hostThemePatchPollTimer !== null) {
        return
    }

    let attempts = 0
    hostThemePatchPollTimer = window.setInterval(() => {
        attempts += 1
        if (patchHostThemeApi() || attempts >= 60) {
            if (hostThemePatchPollTimer !== null) {
                window.clearInterval(hostThemePatchPollTimer)
                hostThemePatchPollTimer = null
            }
        }
    }, 1000)
}

const isCompleteHostTheme = (theme: UiConfig['theme']) =>
    getResolvedHostThemeSnapshot()?.completeTheme === theme

const canRetryThemeApplicationDuringStartup = () => {
    const strategy = resolveBiliThemeStrategy()
    return strategy.supportsHostComplete || strategy.surfaceContext !== null
}

const resolveUnavailableThemeApplicationMode = (): HostThemeApplicationMode =>
    resolveBiliThemeStrategy().unavailableMode

export const ensureBiliTheme = async (
    nextTheme: UiConfig['theme'],
    {
        allowUiOnlyFallback = true,
        source = 'manual'
    }: {
        allowUiOnlyFallback?: boolean
        source?: BiliThemeRequestSource
    } = {}
): Promise<HostThemeApplicationResult> => {
    const strategy = resolveBiliThemeStrategy()
    ensureHostThemeBridge()
    updateBiliThemeRuntimeSnapshot({
        strategy: strategy.id,
        browserPreferredTheme: resolveBrowserTheme(),
        requestedTheme: nextTheme,
        source
    })

    if (isCompleteHostTheme(nextTheme)) {
        applyResolvedThemeToUi(nextTheme, {
            mode: 'host-complete',
            source,
            requestedTheme: nextTheme
        })
        return {
            ok: true,
            mode: 'host-complete',
            targetTheme: nextTheme,
            effectiveTheme: nextTheme,
            source,
            reason: 'already-applied'
        }
    }

    if (strategy.supportsHostComplete && (await ensureHostThemeCompleteViaLab(nextTheme, source))) {
        return {
            ok: true,
            mode: 'host-complete',
            targetTheme: nextTheme,
            effectiveTheme: nextTheme,
            source,
            reason: 'host-complete'
        }
    }

    if (strategy.supportsSurfacePatch && (await ensureHostSurfaceThemePatch(nextTheme, source))) {
        return {
            ok: true,
            mode: 'surface-patch',
            targetTheme: nextTheme,
            effectiveTheme: nextTheme,
            source,
            reason: 'surface-patch'
        }
    }

    if (allowUiOnlyFallback) {
        clearHostSurfaceThemeState()
        rememberHostThemeSnapshot(createFallbackHostThemeSnapshot(nextTheme))
        applyResolvedThemeToUi(nextTheme, {
            mode: 'ui-only',
            source,
            requestedTheme: nextTheme
        })
        return {
            ok: true,
            mode: 'ui-only',
            targetTheme: nextTheme,
            effectiveTheme: nextTheme,
            source,
            reason: 'ui-only-fallback'
        }
    }

    return {
        ok: false,
        mode: resolveUnavailableThemeApplicationMode(),
        targetTheme: nextTheme,
        effectiveTheme: currentBiliThemeRuntimeSnapshot.effectiveTheme,
        source,
        reason: 'host-unavailable'
    }
}

const applyBrowserThemeToHost = async ({
    allowUiOnlyFallback = true
}: {
    allowUiOnlyFallback?: boolean
} = {}) => {
    const nextTheme = resolveBrowserTheme()
    const result = await ensureBiliTheme(nextTheme, {
        allowUiOnlyFallback,
        source: 'browser-sync'
    })
    return result.ok && (result.mode === 'ui-only' || isCompleteHostTheme(nextTheme))
}

const reconcileBrowserThemeToHostDuringStartup = async () => {
    await waitForHostThemeSyncReadiness()

    if (!canRetryThemeApplicationDuringStartup()) {
        await ensureBiliTheme(resolveBrowserTheme(), { source: 'startup' })
        return
    }

    const deadline = Date.now() + HOST_THEME_STARTUP_RECONCILE_TIMEOUT_MS
    while (hostThemeBrowserSyncEnabled && Date.now() < deadline) {
        if (await applyBrowserThemeToHost({ allowUiOnlyFallback: false })) {
            return
        }

        await waitForMs(HOST_THEME_STARTUP_RECONCILE_RETRY_INTERVAL_MS)
    }

    if (hostThemeBrowserSyncEnabled) {
        await applyBrowserThemeToHost()
    }
}

const scheduleBrowserThemeSyncAfterGracePeriod = async () => {
    if (!hostThemeBrowserSyncEnabled) {
        return
    }

    if (isHostThemeSyncInGracePeriod) {
        return
    }

    isHostThemeSyncInGracePeriod = true
    cancelHostThemeSyncGracePeriod()

    void primeHostDarkModeLabController()

    await new Promise<void>((resolve) => {
        hostThemeSyncGraceTimer = window.setTimeout(() => {
            hostThemeSyncGraceTimer = null
            resolve()
        }, 0)
    })

    try {
        await reconcileBrowserThemeToHostDuringStartup()
    } finally {
        isHostThemeSyncInGracePeriod = false
    }
}

const handleBrowserThemeChange = () => {
    if (!hostThemeBrowserSyncEnabled || isHostThemeSyncInGracePeriod) {
        return
    }

    void applyBrowserThemeToHost()
}

const ensureBrowserThemeListener = () => {
    if (
        browserThemeMediaQueryList ||
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return
    }

    browserThemeMediaQueryList = window.matchMedia(HOST_THEME_MEDIA_QUERY)
    browserThemeChangeListener = () => handleBrowserThemeChange()

    if (typeof browserThemeMediaQueryList.addEventListener === 'function') {
        browserThemeMediaQueryList.addEventListener('change', browserThemeChangeListener)
        return
    }

    browserThemeMediaQueryList.addListener(browserThemeChangeListener)
}

const shouldPreserveBootstrappedSurfacePatchDark = (browserTheme: UiConfig['theme']) =>
    browserTheme === 'dark' &&
    isBootstrappedHostSurfaceTheme(resolveHostSurfaceThemeContext(), 'dark')

const ensureHostThemeBridge = () => {
    ensureHostThemeSignalBridge()
    const strategy = resolveBiliThemeStrategy()
    const initialSnapshot = getResolvedHostThemeSnapshot(true)
    const browserTheme = resolveBrowserTheme()
    const preserveBootstrappedSurfacePatchDark =
        shouldPreserveBootstrappedSurfacePatchDark(browserTheme)
    currentHostTheme = preserveBootstrappedSurfacePatchDark
        ? 'dark'
        : (initialSnapshot?.theme ?? 'light')
    updateBiliThemeRuntimeSnapshot({
        strategy: strategy.id,
        browserPreferredTheme: browserTheme,
        hostTheme: initialSnapshot?.theme ?? null,
        hostSnapshot: initialSnapshot,
        effectiveTheme: currentHostTheme,
        effectiveMode: preserveBootstrappedSurfacePatchDark
            ? 'surface-patch'
            : resolveThemeApplicationModeFromSnapshot(initialSnapshot),
        source: 'startup'
    })
    ensureBrowserThemeListener()
    if (!patchHostThemeApi()) {
        scheduleHostThemeApiPatch()
    }
}

const disableHostThemeBrowserSync = (reason = 'unknown') => {
    if (!hostThemeBrowserSyncEnabled) {
        return
    }

    void reason
    hostThemeBrowserSyncEnabled = false
    isHostThemeSyncInGracePeriod = false
    cancelHostThemeSyncGracePeriod()
    HOST_THEME_SYNCED_UI_CONFIGS.forEach((uiConfig) => {
        if (uiConfig.syncHostThemeWithBrowser) {
            uiConfig.syncHostThemeWithBrowser = false
        }
    })
}

const setHostThemeBrowserSyncEnabled = (enabled: boolean) => {
    hostThemeBrowserSyncEnabled = enabled

    if (!enabled) {
        isHostThemeSyncInGracePeriod = false
        cancelHostThemeSyncGracePeriod()
        return
    }

    void primeHostDarkModeLabController()
    void scheduleBrowserThemeSyncAfterGracePeriod()
}

export const useHostThemeSync = (uiConfig: UiConfig, options: UseHostThemeSyncOptions = {}) => {
    ensureHostThemeBridge()

    HOST_THEME_SYNCED_UI_CONFIGS.add(uiConfig)

    if (options.syncColorTokens) {
        watch(
            () => uiConfig.theme,
            (theme) => applyAppColorTokens(theme),
            { immediate: true }
        )
    }

    if (!OBSERVED_UI_CONFIGS.has(uiConfig)) {
        OBSERVED_UI_CONFIGS.add(uiConfig)

        watch(
            () => uiConfig.followBiliTheme,
            (followBiliTheme) => {
                if (followBiliTheme) {
                    const resolvedTheme = getResolvedHostTheme()
                    if (resolvedTheme) {
                        uiConfig.theme = resolvedTheme
                    }
                }
            },
            { immediate: true }
        )

        watch(
            () => uiConfig.syncHostThemeWithBrowser,
            (syncWithBrowser) => setHostThemeBrowserSyncEnabled(syncWithBrowser),
            { immediate: true }
        )
    }

    const syncThemeFromHost = (): UiConfig['theme'] | null => {
        if (!uiConfig.followBiliTheme) {
            return null
        }

        const resolvedTheme = getResolvedHostTheme()
        if (!resolvedTheme) {
            return null
        }

        applyResolvedThemeToUi(resolvedTheme, {
            mode: resolveThemeApplicationModeFromSnapshot(getResolvedHostThemeSnapshot()),
            source: 'host-follow'
        })
        return resolvedTheme
    }

    return {
        syncThemeFromHost
    }
}
