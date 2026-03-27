import { unsafeWindow } from '$'
import type { UiConfig } from '@/types'
import { APP_CSS_NAMESPACE } from '@/constants/brand'

type HostThemeSignalSource =
    | 'bootstrap'
    | 'changeTheme'
    | 'initThemeWithCSR'
    | 'poll'
    | 'readystatechange'
    | 'mutation'

type HostThemeSignalCompleteness = 'complete' | 'partial' | 'unknown'

type HostThemeSignalSnapshot = {
    theme: UiConfig['theme']
    completeness: HostThemeSignalCompleteness
    completeTheme: UiConfig['theme'] | null
    isCompleteDark: boolean
    isCompleteLight: boolean
    signals: {
        apiTheme: UiConfig['theme'] | null
        labTheme: UiConfig['theme'] | null
        cssMapTheme: UiConfig['theme'] | null
        navbarTheme: UiConfig['theme'] | null
        roomTheme: UiConfig['theme'] | null
    }
}

type HostThemeSignalMessage = {
    source: string
    type: string
    theme: UiConfig['theme']
    themeSource: HostThemeSignalSource
    ts: number
    snapshot: HostThemeSignalSnapshot
}

type DarkReaderThemeSignalMode = 'host-complete' | 'surface-patch' | 'ui-only'

type DarkReaderThemeSignal = {
    theme: UiConfig['theme']
    mode: DarkReaderThemeSignalMode
    verified: boolean
}

type HostThemeSignalState = {
    initialized: boolean
    listenerInstalled: boolean
    latestTheme: UiConfig['theme'] | null
    latestSnapshot: HostThemeSignalSnapshot | null
    explicitDarkReaderThemeSignal: DarkReaderThemeSignal | null
}

type HostThemeApi = {
    getTheme?: () => unknown
}

const HOST_THEME_SIGNAL_MESSAGE_SOURCE = `${APP_CSS_NAMESPACE}:host-theme-bridge`
const HOST_THEME_SIGNAL_MESSAGE_TYPE = `${APP_CSS_NAMESPACE}:host-theme-signal`
const HOST_THEME_SIGNAL_SCRIPT_ID = `${APP_CSS_NAMESPACE}-host-theme-signal-bridge`
const HOST_THEME_SIGNAL_STATE_KEY = '__hazelspamUserscriptHostThemeSignalState'
const HOST_THEME_SIGNAL_PAGE_STATE_KEY = '__hazelspamPageHostThemeSignalState'
const HOST_THEME_DARK_READER_META_ID = `${APP_CSS_NAMESPACE}-host-color-scheme`
const HOST_THEME_DARK_READER_STATE_ATTR = `data-${APP_CSS_NAMESPACE}-host-theme-complete`

const isSupportedTheme = (value: unknown): value is UiConfig['theme'] =>
    value === 'dark' || value === 'light'

const getHostThemeSignalState = (): HostThemeSignalState | null => {
    if (typeof window === 'undefined') {
        return null
    }

    const bridgeWindow = window as Window & {
        __hazelspamUserscriptHostThemeSignalState?: HostThemeSignalState
    }
    if (!bridgeWindow[HOST_THEME_SIGNAL_STATE_KEY]) {
        bridgeWindow[HOST_THEME_SIGNAL_STATE_KEY] = {
            initialized: false,
            listenerInstalled: false,
            latestTheme: null,
            latestSnapshot: null,
            explicitDarkReaderThemeSignal: null
        }
    }

    return bridgeWindow[HOST_THEME_SIGNAL_STATE_KEY] ?? null
}

const isHostThemeSignalSnapshot = (value: unknown): value is HostThemeSignalSnapshot => {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as Partial<HostThemeSignalSnapshot>
    return (
        isSupportedTheme(candidate.theme) &&
        (candidate.completeness === 'complete' ||
            candidate.completeness === 'partial' ||
            candidate.completeness === 'unknown') &&
        (!!candidate.signals && typeof candidate.signals === 'object')
    )
}

const isHostThemeSignalMessage = (value: unknown): value is HostThemeSignalMessage => {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as Partial<HostThemeSignalMessage>
    return (
        candidate.source === HOST_THEME_SIGNAL_MESSAGE_SOURCE &&
        candidate.type === HOST_THEME_SIGNAL_MESSAGE_TYPE &&
        isSupportedTheme(candidate.theme) &&
        isHostThemeSignalSnapshot(candidate.snapshot)
    )
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

const resolveThemeFromLabStyle = (): UiConfig['theme'] | null => {
    if (typeof document === 'undefined') {
        return null
    }

    const labStyle = document.documentElement?.getAttribute('lab-style')
    if (typeof labStyle !== 'string') {
        return null
    }

    return labStyle.includes('dark') ? 'dark' : 'light'
}

const resolveThemeFromCssMap = (): UiConfig['theme'] | null => {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
        return null
    }

    const cssMapHref = document.getElementById('__css-map__')?.getAttribute('href') ?? ''
    if (cssMapHref.includes('dark.css')) {
        return 'dark'
    }
    if (cssMapHref.includes('light.css')) {
        return 'light'
    }

    return null
}

const resolveThemeFromNavbar = (): UiConfig['theme'] | null => {
    if (
        typeof document === 'undefined' ||
        typeof document.querySelector !== 'function' ||
        typeof getComputedStyle !== 'function'
    ) {
        return null
    }

    const navbar = document.querySelector('.link-navbar-more')
    if (!navbar) {
        return null
    }

    const backgroundColor = getComputedStyle(navbar).backgroundColor
    const luminance = getColorLuminance(backgroundColor)
    if (luminance === null) {
        return null
    }

    return luminance < 0.5 ? 'dark' : 'light'
}

const resolveThemeFromRoomOverlay = (): UiConfig['theme'] | null => {
    if (
        typeof document === 'undefined' ||
        typeof document.querySelector !== 'function' ||
        typeof getComputedStyle !== 'function'
    ) {
        return null
    }

    const roomBackground = document.querySelector('.room-bg')
    if (!roomBackground) {
        return null
    }

    const overlayStyle = getComputedStyle(roomBackground, '::after')
    const backgroundColor = overlayStyle.backgroundColor
    const backgroundImage = overlayStyle.backgroundImage
    const parsedColor = parseRgbColor(backgroundColor)
    const luminance = getColorLuminance(backgroundColor)

    if (backgroundImage.includes('linear-gradient')) {
        return 'light'
    }

    if (parsedColor && parsedColor.alpha >= 0.3 && luminance !== null) {
        return luminance < 0.5 ? 'dark' : 'light'
    }

    return null
}

const getHostThemeApi = (): HostThemeApi | null => {
    const hostWindow = unsafeWindow as typeof unsafeWindow & {
        bililiveThemeV2?: HostThemeApi
    }
    return hostWindow.bililiveThemeV2 ?? null
}

const buildHostThemeSignalSnapshot = (signals: HostThemeSignalSnapshot['signals']) => {
    const darkSignals = [signals.labTheme, signals.cssMapTheme, signals.navbarTheme, signals.roomTheme]
    const isCompleteDark = darkSignals.every((signal) => signal === 'dark')
    const isCompleteLight = darkSignals.every((signal) => signal === 'light')
    const completeTheme = isCompleteDark ? 'dark' : isCompleteLight ? 'light' : null

    const theme =
        completeTheme ??
        signals.apiTheme ??
        signals.cssMapTheme ??
        signals.labTheme ??
        signals.navbarTheme ??
        signals.roomTheme
    if (!theme) {
        return null
    }

    const hasResolvedSignals = Object.values(signals).some((signal) => signal !== null)
    const completeness: HostThemeSignalCompleteness = completeTheme
        ? 'complete'
        : hasResolvedSignals
          ? 'partial'
          : 'unknown'

    return {
        theme,
        completeness,
        completeTheme,
        isCompleteDark,
        isCompleteLight,
        signals
    } satisfies HostThemeSignalSnapshot
}

const readCurrentHostThemeSignalSnapshot = (): HostThemeSignalSnapshot | null => {
    const apiTheme = isSupportedTheme(getHostThemeApi()?.getTheme?.())
        ? (getHostThemeApi()?.getTheme?.() as UiConfig['theme'])
        : null

    return buildHostThemeSignalSnapshot({
        apiTheme,
        labTheme: resolveThemeFromLabStyle(),
        cssMapTheme: resolveThemeFromCssMap(),
        navbarTheme: resolveThemeFromNavbar(),
        roomTheme: resolveThemeFromRoomOverlay()
    })
}

const getDarkReaderSignalParent = () => {
    if (typeof document === 'undefined') {
        return null
    }

    return document.head ?? document.documentElement ?? document.body ?? null
}

const deriveDarkReaderThemeSignalFromSnapshot = (
    snapshot: HostThemeSignalSnapshot | null
): DarkReaderThemeSignal | null => {
    if (!snapshot?.completeTheme) {
        return null
    }

    return {
        theme: snapshot.completeTheme,
        mode: 'host-complete',
        verified: true
    }
}

const applyDarkReaderThemeSignal = (signal: DarkReaderThemeSignal | null) => {
    if (
        typeof document === 'undefined' ||
        typeof document.createElement !== 'function' ||
        typeof document.getElementById !== 'function'
    ) {
        return
    }

    const documentElement = document.documentElement
    if (documentElement) {
        if (signal?.verified && signal.mode !== 'ui-only') {
            documentElement.setAttribute(HOST_THEME_DARK_READER_STATE_ATTR, signal.theme)
        } else {
            documentElement.removeAttribute(HOST_THEME_DARK_READER_STATE_ATTR)
        }
    }

    const existingMeta = document.getElementById(HOST_THEME_DARK_READER_META_ID)
    if (!(signal?.verified && signal.theme === 'dark' && signal.mode !== 'ui-only')) {
        existingMeta?.remove()
        return
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

const refreshDarkReaderThemeSignal = (state: HostThemeSignalState | null) => {
    if (!state) {
        return
    }

    applyDarkReaderThemeSignal(
        state.explicitDarkReaderThemeSignal ?? deriveDarkReaderThemeSignalFromSnapshot(state.latestSnapshot)
    )
}

const handleHostThemeSignalMessage = (event: MessageEvent) => {
    if (!isHostThemeSignalMessage(event.data)) {
        return
    }

    const state = getHostThemeSignalState()
    if (!state) {
        return
    }

    state.latestTheme = event.data.theme
    state.latestSnapshot = event.data.snapshot
    refreshDarkReaderThemeSignal(state)
}

const hostThemeSignalBridgePageScript = (
    signalSource: string,
    signalType: string,
    pageStateKey: string
) => {
    const globalWindow = window as unknown as Window & {
        bililiveThemeV2?: {
            getTheme?: () => unknown
            changeTheme?: (...args: unknown[]) => unknown
            initThemeWithCSR?: (...args: unknown[]) => unknown
        }
        [key: string]: unknown
    }

    const existingState = globalWindow[pageStateKey] as
        | {
              installed?: boolean
              pollTimer?: number | null
              observer?: MutationObserver | null
              dispatchTimer?: number | null
              lastSignature?: string | null
          }
        | undefined

    if (existingState?.installed) {
        return
    }

    const state = existingState && typeof existingState === 'object' ? existingState : {}
    state.installed = true
    state.pollTimer = typeof state.pollTimer === 'number' ? state.pollTimer : null
    state.observer = state.observer instanceof MutationObserver ? state.observer : null
    state.dispatchTimer = typeof state.dispatchTimer === 'number' ? state.dispatchTimer : null
    state.lastSignature = typeof state.lastSignature === 'string' ? state.lastSignature : null
    globalWindow[pageStateKey] = state

    const isTheme = (value: unknown): value is 'dark' | 'light' =>
        value === 'dark' || value === 'light'

    const parseRgbColorInPage = (value: string | null | undefined) => {
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

    const getColorLuminanceInPage = (value: string | null | undefined) => {
        const parsedColor = parseRgbColorInPage(value)
        if (!parsedColor) {
            return null
        }

        return (
            (0.2126 * parsedColor.r + 0.7152 * parsedColor.g + 0.0722 * parsedColor.b) / 255
        )
    }

    const resolveThemeFromLabStyleInPage = (): 'dark' | 'light' | null => {
        const labStyle = document.documentElement?.getAttribute('lab-style')
        if (typeof labStyle !== 'string') {
            return null
        }

        return labStyle.includes('dark') ? 'dark' : 'light'
    }

    const resolveThemeFromCssMapInPage = (): 'dark' | 'light' | null => {
        const cssMapHref = document.getElementById('__css-map__')?.getAttribute('href') ?? ''
        if (cssMapHref.includes('dark.css')) {
            return 'dark'
        }
        if (cssMapHref.includes('light.css')) {
            return 'light'
        }

        return null
    }

    const resolveThemeFromNavbarInPage = (): 'dark' | 'light' | null => {
        const navbar = document.querySelector('.link-navbar-more')
        if (!navbar) {
            return null
        }

        const backgroundColor = getComputedStyle(navbar).backgroundColor
        const luminance = getColorLuminanceInPage(backgroundColor)
        if (luminance === null) {
            return null
        }

        return luminance < 0.5 ? 'dark' : 'light'
    }

    const resolveThemeFromRoomOverlayInPage = (): 'dark' | 'light' | null => {
        const roomBackground = document.querySelector('.room-bg')
        if (!roomBackground) {
            return null
        }

        const overlayStyle = getComputedStyle(roomBackground, '::after')
        const backgroundColor = overlayStyle.backgroundColor
        const backgroundImage = overlayStyle.backgroundImage
        const parsedColor = parseRgbColorInPage(backgroundColor)
        const luminance = getColorLuminanceInPage(backgroundColor)

        if (backgroundImage.includes('linear-gradient')) {
            return 'light'
        }

        if (parsedColor && parsedColor.alpha >= 0.3 && luminance !== null) {
            return luminance < 0.5 ? 'dark' : 'light'
        }

        return null
    }

    const buildSnapshotInPage = (
        signals: HostThemeSignalSnapshot['signals']
    ): HostThemeSignalSnapshot | null => {
        const completionSignals = [
            signals.labTheme,
            signals.cssMapTheme,
            signals.navbarTheme,
            signals.roomTheme
        ]
        const isCompleteDark = completionSignals.every((signal) => signal === 'dark')
        const isCompleteLight = completionSignals.every((signal) => signal === 'light')
        const completeTheme = isCompleteDark ? 'dark' : isCompleteLight ? 'light' : null
        const theme =
            completeTheme ??
            signals.apiTheme ??
            signals.cssMapTheme ??
            signals.labTheme ??
            signals.navbarTheme ??
            signals.roomTheme
        if (!theme) {
            return null
        }

        const hasResolvedSignals = Object.values(signals).some((signal) => signal !== null)
        return {
            theme,
            completeness: completeTheme ? 'complete' : hasResolvedSignals ? 'partial' : 'unknown',
            completeTheme,
            isCompleteDark,
            isCompleteLight,
            signals
        }
    }

    const resolveSnapshotInPage = (): HostThemeSignalSnapshot | null => {
        let apiTheme: 'dark' | 'light' | null = null
        try {
            const resolvedTheme = globalWindow.bililiveThemeV2?.getTheme?.()
            apiTheme = isTheme(resolvedTheme) ? resolvedTheme : null
        } catch {
            apiTheme = null
        }

        return buildSnapshotInPage({
            apiTheme,
            labTheme: resolveThemeFromLabStyleInPage(),
            cssMapTheme: resolveThemeFromCssMapInPage(),
            navbarTheme: resolveThemeFromNavbarInPage(),
            roomTheme: resolveThemeFromRoomOverlayInPage()
        })
    }

    const dispatchSnapshot = (themeSource: HostThemeSignalSource) => {
        const snapshot = resolveSnapshotInPage()
        if (!snapshot) {
            return
        }

        const signature = JSON.stringify(snapshot)
        if (state.lastSignature === signature) {
            return
        }

        state.lastSignature = signature
        globalWindow.postMessage(
            {
                source: signalSource,
                type: signalType,
                theme: snapshot.theme,
                themeSource,
                ts: Date.now(),
                snapshot
            },
            '*'
        )
    }

    const scheduleDispatch = (themeSource: HostThemeSignalSource) => {
        if (state.dispatchTimer !== null) {
            return
        }

        state.dispatchTimer = globalWindow.setTimeout(() => {
            state.dispatchTimer = null
            dispatchSnapshot(themeSource)
        }, 16)
    }

    const patchThemeMethod = (
        api: NonNullable<typeof globalWindow.bililiveThemeV2>,
        key: 'changeTheme' | 'initThemeWithCSR',
        themeSource: HostThemeSignalSource
    ) => {
        const originalKey = `__hazelspamOriginal${key}` as const
        const bridgeKey = `__hazelspamBridgeWrapped${key}` as const
        const originalMethod = api[key]

        if (
            typeof originalMethod !== 'function' ||
            (api as typeof api & Record<string, unknown>)[bridgeKey]
        ) {
            return
        }

        ;(api as typeof api & Record<string, unknown>)[originalKey] = originalMethod
        ;(api as typeof api & Record<string, unknown>)[bridgeKey] = true
        api[key] = function (...args: unknown[]) {
            const result = originalMethod.apply(this, args)
            scheduleDispatch(themeSource)
            return result
        }
    }

    const tryPatchHostThemeApi = (themeSource: HostThemeSignalSource) => {
        const hostThemeApi = globalWindow.bililiveThemeV2
        if (!hostThemeApi || typeof hostThemeApi !== 'object') {
            return false
        }

        patchThemeMethod(hostThemeApi, 'changeTheme', 'changeTheme')
        patchThemeMethod(hostThemeApi, 'initThemeWithCSR', 'initThemeWithCSR')
        scheduleDispatch(themeSource)
        return true
    }

    const stopPolling = () => {
        if (state.pollTimer === null) {
            return
        }

        globalWindow.clearInterval(state.pollTimer)
        state.pollTimer = null
    }

    const startPolling = () => {
        if (state.pollTimer !== null) {
            return
        }

        let settledTicks = 0
        state.pollTimer = globalWindow.setInterval(() => {
            const patched = tryPatchHostThemeApi('poll')
            scheduleDispatch('poll')
            if (document.readyState === 'complete') {
                settledTicks += 1
                if ((patched && settledTicks >= 20) || settledTicks >= 40) {
                    stopPolling()
                }
                return
            }

            settledTicks = 0
        }, 50)
    }

    const startObserving = () => {
        if (state.observer || typeof MutationObserver !== 'function' || !document.documentElement) {
            return
        }

        state.observer = new MutationObserver(() => {
            scheduleDispatch('mutation')
        })
        state.observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['lab-style', 'href', 'class', 'style']
        })
    }

    tryPatchHostThemeApi('bootstrap')
    scheduleDispatch('bootstrap')

    if (document.readyState === 'loading') {
        document.addEventListener('readystatechange', () => {
            tryPatchHostThemeApi('readystatechange')
            scheduleDispatch('readystatechange')
        })
    }

    startObserving()
    startPolling()
}

const createHostThemeSignalBridgeScript = () =>
    `;(${hostThemeSignalBridgePageScript.toString()})(${JSON.stringify(
        HOST_THEME_SIGNAL_MESSAGE_SOURCE
    )}, ${JSON.stringify(HOST_THEME_SIGNAL_MESSAGE_TYPE)}, ${JSON.stringify(
        HOST_THEME_SIGNAL_PAGE_STATE_KEY
    )});`

export const ensureHostThemeSignalBridge = () => {
    const state = getHostThemeSignalState()
    if (!state) {
        return
    }

    if (!state.listenerInstalled) {
        window.addEventListener('message', handleHostThemeSignalMessage)
        state.listenerInstalled = true
    }

    const snapshot = readCurrentHostThemeSignalSnapshot()
    if (snapshot) {
        state.latestTheme = snapshot.theme
        state.latestSnapshot = snapshot
        refreshDarkReaderThemeSignal(state)
    }

    if (state.initialized) {
        return
    }

    if (
        typeof document === 'undefined' ||
        typeof document.createElement !== 'function' ||
        typeof document.getElementById !== 'function'
    ) {
        return
    }

    if (document.getElementById(HOST_THEME_SIGNAL_SCRIPT_ID)) {
        state.initialized = true
        return
    }

    const appendTarget = document.documentElement ?? document.head ?? document.body
    if (!appendTarget || typeof appendTarget.appendChild !== 'function') {
        return
    }

    const script = document.createElement('script')
    script.id = HOST_THEME_SIGNAL_SCRIPT_ID
    script.textContent = createHostThemeSignalBridgeScript()
    appendTarget.appendChild(script)
    script.remove()
    state.initialized = true
}

export const getLastKnownHostThemeSignal = (): UiConfig['theme'] | null =>
    getHostThemeSignalState()?.latestTheme ?? null

export const getLastKnownHostThemeSignalSnapshot = (): HostThemeSignalSnapshot | null =>
    getHostThemeSignalState()?.latestSnapshot ?? null

export const setDarkReaderThemeSignalOverride = (signal: DarkReaderThemeSignal | null) => {
    const state = getHostThemeSignalState()
    if (!state) {
        return
    }

    state.explicitDarkReaderThemeSignal = signal
    refreshDarkReaderThemeSignal(state)
}

export { HOST_THEME_SIGNAL_MESSAGE_SOURCE, HOST_THEME_SIGNAL_MESSAGE_TYPE, readCurrentHostThemeSignalSnapshot }
export type {
    HostThemeSignalSnapshot,
    HostThemeSignalCompleteness,
    HostThemeSignalSource,
    DarkReaderThemeSignal,
    DarkReaderThemeSignalMode
}
