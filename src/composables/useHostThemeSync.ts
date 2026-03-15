import { watch } from 'vue'
import { unsafeWindow } from '$'
import type { UiConfig } from '@/types'
import { applyAppColorTokens } from '@/theme/colorTokens'

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
    configs?: Record<string, HostDarkModeLabConfig>
    plugs?: Record<string, HostDarkModeLabConfig>
    getStatus?: (key: string) => 'on' | 'off'
    toggleSwitch?: (event: { target: EventTarget | null }, key: string) => Promise<unknown>
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

const HOST_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'
const HOST_DARK_MODE_LABEL = '深色模式'
const HOST_DARK_MODE_KEY = 'dark'
const HOST_LAB_POPUP_NAME = 'Laboratory'
const HOST_THEME_SYNCED_UI_CONFIGS = new Set<UiConfig>()
const OBSERVED_UI_CONFIGS = new WeakSet<UiConfig>()

let currentHostTheme: UiConfig['theme'] = 'light'
let hostThemeBrowserSyncEnabled = false
let browserThemeMediaQueryList: MediaQueryList | null = null
let browserThemeChangeListener: ((event: MediaQueryListEvent) => void) | null = null
let hostThemePatchPollTimer: number | null = null
let programmaticThemeChangeDepth = 0

const isSupportedTheme = (value: unknown): value is UiConfig['theme'] =>
    value === 'dark' || value === 'light'

const normalizeTheme = (value: unknown, fallback: UiConfig['theme']): UiConfig['theme'] =>
    isSupportedTheme(value) ? value : fallback

const applyHostThemeUi = (theme: UiConfig['theme']) => {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement.style.colorScheme = theme
}

const notifyHostThemeSubscribers = (theme: UiConfig['theme']) => {
    currentHostTheme = theme
    HOST_THEME_SYNCED_UI_CONFIGS.forEach((uiConfig) => {
        if (uiConfig.followBiliTheme && uiConfig.theme !== theme) {
            uiConfig.theme = theme
        }
    })
}

const applyResolvedThemeToUi = (theme: UiConfig['theme']) => {
    applyHostThemeUi(theme)
    notifyHostThemeSubscribers(theme)
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

const resolveHostDarkModeLabVm = (): { switchNode: HTMLElement; vm: HostDarkModeLabVm } | null => {
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

const waitForHostDarkModeLabVm = async (timeoutMs = 1500) => {
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

const applyBrowserThemeToHostViaLab = async (nextTheme: UiConfig['theme']) => {
    let hostDarkModeLab = resolveHostDarkModeLabVm()
    let shouldClosePopup = false
    const sidebarControllerVm = resolveHostSidebarControllerVm()
    if (!hostDarkModeLab && sidebarControllerVm) {
        shouldClosePopup = sidebarControllerVm.currentPopupName !== HOST_LAB_POPUP_NAME
        if (shouldClosePopup) {
            sidebarControllerVm.openPopup?.(HOST_LAB_POPUP_NAME)
        }

        hostDarkModeLab = await waitForHostDarkModeLabVm()
    }

    if (!hostDarkModeLab) {
        if (shouldClosePopup) {
            sidebarControllerVm?.closePopup?.()
        }
        return false
    }

    try {
        const nextStatus = nextTheme === 'dark' ? 'on' : 'off'
        if (hostDarkModeLab.vm.getStatus?.(HOST_DARK_MODE_KEY) === nextStatus) {
            applyResolvedThemeToUi(nextTheme)
            return true
        }

        await hostDarkModeLab.vm.toggleSwitch?.(
            { target: hostDarkModeLab.switchNode },
            HOST_DARK_MODE_KEY
        )
        const resolvedHostTheme = unsafeWindow.bililiveThemeV2?.getTheme?.()
        applyResolvedThemeToUi(normalizeTheme(resolvedHostTheme, nextTheme))
        return true
    } finally {
        if (shouldClosePopup) {
            sidebarControllerVm?.closePopup?.()
        }
    }
}

export const resolveBrowserTheme = (): UiConfig['theme'] => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'light'
    }

    return window.matchMedia(HOST_THEME_MEDIA_QUERY).matches ? 'dark' : 'light'
}

const getResolvedHostTheme = (fallbackToBrowser = false): UiConfig['theme'] | null => {
    const hostTheme = unsafeWindow.bililiveThemeV2?.getTheme?.()
    if (isSupportedTheme(hostTheme)) {
        currentHostTheme = hostTheme
        return hostTheme
    }

    if (fallbackToBrowser) {
        return resolveBrowserTheme()
    }

    return currentHostTheme
}

export const resolveHostTheme = (): UiConfig['theme'] | null => getResolvedHostTheme()

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
        if (hostThemeBrowserSyncEnabled && programmaticThemeChangeDepth === 0) {
            disableHostThemeBrowserSync()
        }

        originalChangeTheme?.(nextTheme)
        applyResolvedThemeToUi(nextTheme)
    }

    hostThemeApi.initThemeWithCSR = (theme: UiConfig['theme']) => {
        const nextTheme = normalizeTheme(theme, currentHostTheme)
        originalInitThemeWithCSR?.(nextTheme)
        applyResolvedThemeToUi(nextTheme)
    }

    hostThemeApi.getTheme = () => normalizeTheme(originalGetTheme?.(), currentHostTheme)

    const initialTheme = originalGetTheme?.()
    if (isSupportedTheme(initialTheme) && !hostThemeBrowserSyncEnabled) {
        applyResolvedThemeToUi(initialTheme)
    }
    if (hostThemeBrowserSyncEnabled) {
        void applyBrowserThemeToHost()
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

const applyBrowserThemeToHost = async () => {
    const nextTheme = resolveBrowserTheme()
    if (await applyBrowserThemeToHostViaLab(nextTheme)) {
        return
    }

    const hostThemeApi = patchHostThemeApi()
    if (hostThemeApi?.changeTheme) {
        programmaticThemeChangeDepth += 1
        try {
            hostThemeApi.changeTheme(nextTheme)
        } finally {
            programmaticThemeChangeDepth -= 1
        }
        return
    }

    applyResolvedThemeToUi(nextTheme)
}

const handleBrowserThemeChange = () => {
    if (!hostThemeBrowserSyncEnabled) {
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

const ensureHostThemeBridge = () => {
    currentHostTheme = getResolvedHostTheme(true) ?? 'light'
    ensureBrowserThemeListener()
    if (!patchHostThemeApi()) {
        scheduleHostThemeApiPatch()
    }
}

const disableHostThemeBrowserSync = () => {
    if (!hostThemeBrowserSyncEnabled) {
        return
    }

    hostThemeBrowserSyncEnabled = false
    HOST_THEME_SYNCED_UI_CONFIGS.forEach((uiConfig) => {
        if (uiConfig.syncHostThemeWithBrowser) {
            uiConfig.syncHostThemeWithBrowser = false
        }
    })
}

const setHostThemeBrowserSyncEnabled = (enabled: boolean) => {
    hostThemeBrowserSyncEnabled = enabled

    if (!enabled) {
        return
    }

    void applyBrowserThemeToHost()
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

        uiConfig.theme = resolvedTheme
        return resolvedTheme
    }

    return {
        syncThemeFromHost
    }
}
