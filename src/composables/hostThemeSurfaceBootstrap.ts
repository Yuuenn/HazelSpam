import type { UiConfig } from '@/types'

export type HostSurfaceThemeContext = 'blackboard' | 'lite-live'

type HostSurfaceThemeBootstrapState = {
    observer: MutationObserver | null
    timeoutId: number | null
    loadListener: (() => void) | null
    context: HostSurfaceThemeContext | null
    theme: UiConfig['theme'] | null
}

type HostThemeSignalBridgeBootstrapState = {
    initialized?: boolean
    listenerInstalled?: boolean
    latestTheme?: UiConfig['theme'] | null
    latestSnapshot?: unknown
    explicitDarkReaderThemeSignal?: {
        theme: UiConfig['theme']
        mode: 'surface-patch'
        verified: boolean
    } | null
}

const APP_CSS_NAMESPACE = 'hazelspam'
export const HOST_SURFACE_THEME_ATTR = `data-${APP_CSS_NAMESPACE}-host-surface-theme`
export const HOST_SURFACE_THEME_CONTEXT_ATTR = `data-${APP_CSS_NAMESPACE}-host-surface-context`

const HOST_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'
const HOST_SURFACE_THEME_BOOTSTRAP_STATE_KEY =
    '__hazelspamUserscriptHostSurfaceThemeBootstrapState'
const HOST_SURFACE_THEME_BOOTSTRAP_TIMEOUT_MS = 4000
const HOST_THEME_DARK_READER_META_ID = `${APP_CSS_NAMESPACE}-host-color-scheme`
const HOST_THEME_DARK_READER_STATE_ATTR = `data-${APP_CSS_NAMESPACE}-host-theme-complete`
const HOST_THEME_SIGNAL_STATE_KEY = '__hazelspamUserscriptHostThemeSignalState'

const getHostSurfaceThemeBootstrapState = (): HostSurfaceThemeBootstrapState | null => {
    if (typeof window === 'undefined') {
        return null
    }

    const runtimeWindow = window as Window & {
        __hazelspamUserscriptHostSurfaceThemeBootstrapState?: HostSurfaceThemeBootstrapState
    }

    if (!runtimeWindow[HOST_SURFACE_THEME_BOOTSTRAP_STATE_KEY]) {
        runtimeWindow[HOST_SURFACE_THEME_BOOTSTRAP_STATE_KEY] = {
            observer: null,
            timeoutId: null,
            loadListener: null,
            context: null,
            theme: null
        }
    }

    return runtimeWindow[HOST_SURFACE_THEME_BOOTSTRAP_STATE_KEY] ?? null
}

const isSupportedTheme = (value: unknown): value is UiConfig['theme'] =>
    value === 'dark' || value === 'light'

const readStoredHostThemeBrowserSyncEnabled = () => {
    const gmGetValue = (
        globalThis as typeof globalThis & {
            GM_getValue?: <T>(key: string, fallback: T) => T
        }
    ).GM_getValue
    if (typeof gmGetValue !== 'function') {
        return true
    }

    try {
        const storedUiConfig = gmGetValue('ui', null) as
            | { syncHostThemeWithBrowser?: unknown }
            | null
        if (typeof storedUiConfig?.syncHostThemeWithBrowser === 'boolean') {
            return storedUiConfig.syncHostThemeWithBrowser
        }
    } catch {
        // Fall through to the default.
    }

    return true
}

export const resolveBrowserTheme = (): UiConfig['theme'] => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'light'
    }

    return window.matchMedia(HOST_THEME_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export const isBlackboardPageContext = () =>
    typeof location !== 'undefined' && location.pathname.includes('/blackboard/')

export const isLiteLivePageContext = () => {
    if (typeof location === 'undefined') {
        return false
    }

    if (location.pathname.startsWith('/blanc/')) {
        return true
    }

    return new URLSearchParams(location.search).get('liteVersion') === 'true'
}

export const resolveHostSurfaceThemeContext = (): HostSurfaceThemeContext | null => {
    if (isBlackboardPageContext()) {
        return 'blackboard'
    }

    if (isLiteLivePageContext()) {
        return 'lite-live'
    }

    return null
}

export const resolveHostSurfaceCssMapHref = (
    currentHref: string | null | undefined,
    theme: UiConfig['theme']
) => {
    if (!currentHref) {
        return null
    }

    if (currentHref.includes(`${theme}.css`)) {
        return currentHref
    }

    if (currentHref.includes('light.css')) {
        return currentHref.replace('light.css', `${theme}.css`)
    }

    if (currentHref.includes('dark.css')) {
        return currentHref.replace('dark.css', `${theme}.css`)
    }

    return null
}

export const applyHostSurfaceNativeCssMapTheme = (theme: UiConfig['theme']) => {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
        return false
    }

    const cssMapNode = document.getElementById('__css-map__')
    if (!cssMapNode || typeof cssMapNode.getAttribute !== 'function') {
        return false
    }

    const currentHref = cssMapNode.getAttribute('href')
    const nextHref = resolveHostSurfaceCssMapHref(currentHref, theme)
    if (!nextHref || typeof cssMapNode.setAttribute !== 'function') {
        return false
    }

    if (nextHref !== currentHref) {
        cssMapNode.setAttribute('href', nextHref)
    }

    return true
}

export const setHostSurfaceThemeState = (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme']
) => {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement?.setAttribute(HOST_SURFACE_THEME_CONTEXT_ATTR, context)
    document.documentElement?.setAttribute(HOST_SURFACE_THEME_ATTR, theme)
}

export const isBootstrappedHostSurfaceTheme = (
    context: HostSurfaceThemeContext | null,
    theme: UiConfig['theme']
) => {
    if (typeof document === 'undefined' || !context) {
        return false
    }

    return (
        document.documentElement?.getAttribute(HOST_SURFACE_THEME_CONTEXT_ATTR) === context &&
        document.documentElement?.getAttribute(HOST_SURFACE_THEME_ATTR) === theme &&
        document.documentElement?.style.colorScheme === theme &&
        document.documentElement?.getAttribute(HOST_THEME_DARK_READER_STATE_ATTR) === theme
    )
}

const getDarkReaderSignalParent = () => {
    if (typeof document === 'undefined') {
        return null
    }

    return document.head ?? document.documentElement ?? document.body ?? null
}

const getHostThemeSignalBridgeBootstrapState =
    (): HostThemeSignalBridgeBootstrapState | null => {
        if (typeof window === 'undefined') {
            return null
        }

        const runtimeWindow = window as Window & {
            __hazelspamUserscriptHostThemeSignalState?: HostThemeSignalBridgeBootstrapState
        }

        if (!runtimeWindow[HOST_THEME_SIGNAL_STATE_KEY]) {
            runtimeWindow[HOST_THEME_SIGNAL_STATE_KEY] = {
                initialized: false,
                listenerInstalled: false,
                latestTheme: null,
                latestSnapshot: null,
                explicitDarkReaderThemeSignal: null
            }
        }

        return runtimeWindow[HOST_THEME_SIGNAL_STATE_KEY] ?? null
    }

const applyBootstrappedDarkReaderThemeSignal = (theme: UiConfig['theme']) => {
    if (
        typeof document === 'undefined' ||
        typeof document.createElement !== 'function' ||
        typeof document.getElementById !== 'function'
    ) {
        return
    }

    const documentElement = document.documentElement
    const existingMeta = document.getElementById(HOST_THEME_DARK_READER_META_ID)

    if (theme !== 'dark') {
        documentElement?.removeAttribute(HOST_THEME_DARK_READER_STATE_ATTR)
        existingMeta?.remove()
        const state = getHostThemeSignalBridgeBootstrapState()
        if (state) {
            state.explicitDarkReaderThemeSignal = null
        }
        return
    }

    documentElement?.setAttribute(HOST_THEME_DARK_READER_STATE_ATTR, 'dark')
    const state = getHostThemeSignalBridgeBootstrapState()
    if (state) {
        state.explicitDarkReaderThemeSignal = {
            theme: 'dark',
            mode: 'surface-patch',
            verified: true
        }
    }

    const meta =
        existingMeta instanceof HTMLMetaElement
            ? existingMeta
            : (() => {
                  const created = document.createElement('meta')
                  created.id = HOST_THEME_DARK_READER_META_ID
                  created.setAttribute('name', 'color-scheme')
                  return created
              })()

    meta.setAttribute('content', 'dark')
    if (!meta.isConnected) {
        getDarkReaderSignalParent()?.appendChild(meta)
    }
}

const clearBootstrappedHostSurfaceThemeObserver = () => {
    const state = getHostSurfaceThemeBootstrapState()
    if (!state) {
        return
    }

    state.observer?.disconnect()
    state.observer = null

    if (state.timeoutId !== null) {
        window.clearTimeout(state.timeoutId)
        state.timeoutId = null
    }

    if (state.loadListener) {
        window.removeEventListener('load', state.loadListener)
        state.loadListener = null
    }
}

const applyBootstrappedHostSurfaceTheme = (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme']
) => {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement.style.colorScheme = theme
    setHostSurfaceThemeState(context, theme)
    applyBootstrappedDarkReaderThemeSignal(theme)
    applyHostSurfaceNativeCssMapTheme(theme)
}

const maybeFinishBootstrappedHostSurfaceThemeObserver = () => {
    const state = getHostSurfaceThemeBootstrapState()
    if (!state?.context || !state.theme) {
        clearBootstrappedHostSurfaceThemeObserver()
        return
    }

    if (
        document.readyState === 'complete' &&
        isBootstrappedHostSurfaceTheme(state.context, state.theme) &&
        applyHostSurfaceNativeCssMapTheme(state.theme)
    ) {
        clearBootstrappedHostSurfaceThemeObserver()
    }
}

const ensureBootstrappedHostSurfaceThemeObserver = (
    context: HostSurfaceThemeContext,
    theme: UiConfig['theme']
) => {
    const state = getHostSurfaceThemeBootstrapState()
    if (!state) {
        return
    }

    state.context = context
    state.theme = theme
    applyBootstrappedHostSurfaceTheme(context, theme)

    if (!state.loadListener) {
        state.loadListener = () => {
            applyBootstrappedHostSurfaceTheme(context, theme)
            maybeFinishBootstrappedHostSurfaceThemeObserver()
        }
        window.addEventListener('load', state.loadListener, { once: true })
    }

    if (!state.observer && typeof MutationObserver === 'function' && document.documentElement) {
        state.observer = new MutationObserver(() => {
            const latestState = getHostSurfaceThemeBootstrapState()
            if (!latestState?.context || !isSupportedTheme(latestState.theme)) {
                clearBootstrappedHostSurfaceThemeObserver()
                return
            }

            applyBootstrappedHostSurfaceTheme(latestState.context, latestState.theme)
            maybeFinishBootstrappedHostSurfaceThemeObserver()
        })
        state.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        })
    }

    if (state.timeoutId !== null) {
        window.clearTimeout(state.timeoutId)
    }

    state.timeoutId = window.setTimeout(() => {
        clearBootstrappedHostSurfaceThemeObserver()
    }, HOST_SURFACE_THEME_BOOTSTRAP_TIMEOUT_MS)
}

export const bootstrapBiliThemeDocumentHints = () => {
    const context = resolveHostSurfaceThemeContext()
    if (!context) {
        return
    }

    if (!readStoredHostThemeBrowserSyncEnabled() || resolveBrowserTheme() !== 'dark') {
        return
    }

    ensureBootstrappedHostSurfaceThemeObserver(context, 'dark')
}
