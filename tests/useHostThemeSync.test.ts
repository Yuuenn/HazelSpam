import { nextTick, reactive } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UiConfig } from '@/types'
import type { HostThemeSignalSnapshot } from '@/composables/hostThemeSignalBridge'

const gmGetValueMock = vi.fn((_key: string, fallback: unknown) => fallback)

vi.mock('$', () => ({
    unsafeWindow: globalThis,
    GM_getValue: gmGetValueMock
}))

class MutationObserverMock {
    constructor(callback: MutationCallback) {
        void callback
    }

    disconnect() {}

    observe() {}

    takeRecords(): MutationRecord[] {
        return []
    }
}

class HTMLMetaElementMock {
    tagName = 'META'
    id = ''
    textContent = ''
    isConnected = false
    private readonly attributes = new Map<string, string>()
    private onRemove?: () => void

    setAttribute(name: string, value: string) {
        this.attributes.set(name, value)
        if (name === 'id') {
            this.id = value
        }
    }

    getAttribute(name: string) {
        if (name === 'id') {
            return this.id
        }

        return this.attributes.get(name) ?? null
    }

    removeAttribute(name: string) {
        this.attributes.delete(name)
        if (name === 'id') {
            this.id = ''
        }
    }

    remove() {
        this.isConnected = false
        this.onRemove?.()
    }

    __setRemoveHandler(handler: () => void) {
        this.onRemove = handler
    }
}

class MockElement {
    tagName: string
    id = ''
    textContent = ''
    isConnected = false
    private readonly attributes = new Map<string, string>()
    private onRemove?: () => void

    constructor(tagName: string) {
        this.tagName = tagName.toUpperCase()
    }

    setAttribute(name: string, value: string) {
        this.attributes.set(name, value)
        if (name === 'id') {
            this.id = value
        }
    }

    getAttribute(name: string) {
        if (name === 'id') {
            return this.id
        }

        return this.attributes.get(name) ?? null
    }

    removeAttribute(name: string) {
        this.attributes.delete(name)
        if (name === 'id') {
            this.id = ''
        }
    }

    remove() {
        this.isConnected = false
        this.onRemove?.()
    }

    __setRemoveHandler(handler: () => void) {
        this.onRemove = handler
    }
}

const createUiConfig = (): UiConfig => ({
    activeMenuIndex: 'TextView',
    isShowPanel: false,
    isCollapsed: true,
    theme: 'light',
    followBiliTheme: true,
    syncHostThemeWithBrowser: true,
    hideDanmakuHistoryScrollbar: true
})

const installWindowEventTargetMock = () => {
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

    const addEventListener = vi.fn(
        (type: string, listener: EventListenerOrEventListenerObject | null) => {
            if (!listener) {
                return
            }

            const bucket = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
            bucket.add(listener)
            listeners.set(type, bucket)
        }
    )
    const removeEventListener = vi.fn(
        (type: string, listener: EventListenerOrEventListenerObject | null) => {
            if (!listener) {
                return
            }

            listeners.get(type)?.delete(listener)
        }
    )
    const dispatchEvent = vi.fn((event: Event) => {
        listeners.get(event.type)?.forEach((listener) => {
            if (typeof listener === 'function') {
                listener.call(globalThis, event)
                return
            }

            listener.handleEvent(event)
        })

        return true
    })

    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('addEventListener', addEventListener)
    vi.stubGlobal('removeEventListener', removeEventListener)
    vi.stubGlobal('dispatchEvent', dispatchEvent)
}

const createDocumentMock = () => {
    const attributes = new Map<string, string>()
    const nodeRegistry = new Map<string, MockElement | HTMLMetaElementMock>()
    const state = {
        cssMapTheme: 'light' as UiConfig['theme'],
        navbarTheme: 'light' as UiConfig['theme'],
        roomTheme: 'light' as UiConfig['theme']
    }
    const navbarNode = { __hazelRole: 'navbar' } as unknown as Element
    const roomNode = { __hazelRole: 'room' } as unknown as Element
    const cssMapNode = new MockElement('link')
    cssMapNode.id = '__css-map__'
    cssMapNode.setAttribute('href', '//s1.hdslb.com/bfs/static/jinkela/long/laputa-css/light.css')
    nodeRegistry.set(cssMapNode.id, cssMapNode)

    const syncCssMapHref = () => {
        cssMapNode.setAttribute(
            'href',
            `//s1.hdslb.com/bfs/static/jinkela/long/laputa-css/${state.cssMapTheme}.css`
        )
    }

    const unregisterNode = (node: MockElement | HTMLMetaElementMock) => {
        if (node.id) {
            nodeRegistry.delete(node.id)
        }
    }

    const registerNode = (node: MockElement | HTMLMetaElementMock) => {
        if (node.id) {
            nodeRegistry.set(node.id, node)
        }
        node.isConnected = true
        node.__setRemoveHandler(() => unregisterNode(node))
        return node
    }

    const head = {
        appendChild: vi.fn((node: MockElement | HTMLMetaElementMock) => registerNode(node))
    }
    const documentElement = {
        style: {
            colorScheme: ''
        },
        getAttribute: (name: string) => attributes.get(name) ?? '',
        setAttribute: (name: string, value: string) => {
            attributes.set(name, value)
        },
        removeAttribute: (name: string) => {
            attributes.delete(name)
        },
        appendChild: vi.fn((node: MockElement | HTMLMetaElementMock) => registerNode(node))
    }

    const documentMock = {
        body: {},
        head,
        documentElement,
        createElement: vi.fn((tagName: string) =>
            tagName.toLowerCase() === 'meta'
                ? new HTMLMetaElementMock()
                : new MockElement(tagName)
        ),
        getElementById: vi.fn((id: string) => nodeRegistry.get(id) ?? null),
        querySelector: vi.fn((selector: string) => {
            if (selector === '.link-navbar-more') {
                return navbarNode
            }
            if (selector === '.room-bg') {
                return roomNode
            }
            if (selector === '#__css-map__') {
                return cssMapNode
            }
            return null
        }),
        querySelectorAll: vi.fn(() => [] as HTMLElement[]),
        __setThemeSignals: ({
            labStyle,
            cssMapTheme,
            navbarTheme,
            roomTheme
        }: {
            labStyle?: string
            cssMapTheme?: UiConfig['theme']
            navbarTheme?: UiConfig['theme']
            roomTheme?: UiConfig['theme']
        }) => {
            if (labStyle !== undefined) {
                if (labStyle === '') {
                    attributes.delete('lab-style')
                } else {
                    attributes.set('lab-style', labStyle)
                }
            }
            if (cssMapTheme) {
                state.cssMapTheme = cssMapTheme
                syncCssMapHref()
            }
            if (navbarTheme) {
                state.navbarTheme = navbarTheme
            }
            if (roomTheme) {
                state.roomTheme = roomTheme
            }
        },
        __state: state,
        __nodes: {
            cssMapNode,
            navbarNode,
            roomNode
        }
    }

    return documentMock
}

const installComputedStyleMock = (
    documentMock: ReturnType<typeof createDocumentMock>
) => {
    vi.stubGlobal(
        'getComputedStyle',
        vi.fn((element: unknown, pseudoElement?: string | null) => {
            if (element === documentMock.__nodes.navbarNode) {
                return {
                    backgroundColor:
                        documentMock.__state.navbarTheme === 'dark'
                            ? 'rgb(23, 24, 26)'
                            : 'rgb(255, 255, 255)',
                    backgroundImage: 'none',
                    color: 'rgb(0, 0, 0)'
                }
            }

            if (element === documentMock.__nodes.roomNode && pseudoElement === '::after') {
                return {
                    backgroundColor:
                        documentMock.__state.roomTheme === 'dark'
                            ? 'rgba(28, 32, 34, 0.85)'
                            : 'rgba(0, 0, 0, 0)',
                    backgroundImage:
                        documentMock.__state.roomTheme === 'dark'
                            ? 'none'
                            : 'linear-gradient(to top, rgb(242, 243, 245), rgba(0, 0, 0, 0) 20%)',
                    color: 'rgb(0, 0, 0)'
                }
            }

            return {
                backgroundColor: 'rgba(0, 0, 0, 0)',
                backgroundImage: 'none',
                color: 'rgb(0, 0, 0)'
            }
        })
    )
}

const installCommonDomMocks = (documentMock: ReturnType<typeof createDocumentMock>) => {
    installWindowEventTargetMock()
    vi.stubGlobal('document', documentMock)
    vi.stubGlobal('GM_getValue', gmGetValueMock)
    vi.stubGlobal('MutationObserver', MutationObserverMock)
    vi.stubGlobal('HTMLMetaElement', HTMLMetaElementMock)
    installComputedStyleMock(documentMock)
}

afterEach(() => {
    delete (globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2
    const bridgeStateHolder = globalThis as typeof globalThis & {
        __hazelspamUserscriptHostThemeSignalState?: {
            initialized?: boolean
            latestTheme?: UiConfig['theme'] | null
            latestSnapshot?: HostThemeSignalSnapshot | null
            explicitDarkReaderThemeSignal?: unknown
        }
        __hazelspamPageHostThemeSignalState?: unknown
        __hazelspamUserscriptHostThemeSyncState?: unknown
    }
    if (bridgeStateHolder.__hazelspamUserscriptHostThemeSignalState) {
        bridgeStateHolder.__hazelspamUserscriptHostThemeSignalState.initialized = false
        bridgeStateHolder.__hazelspamUserscriptHostThemeSignalState.latestTheme = null
        bridgeStateHolder.__hazelspamUserscriptHostThemeSignalState.latestSnapshot = null
        bridgeStateHolder.__hazelspamUserscriptHostThemeSignalState.explicitDarkReaderThemeSignal =
            null
    }
    delete bridgeStateHolder.__hazelspamPageHostThemeSignalState
    delete bridgeStateHolder.__hazelspamUserscriptHostThemeSyncState
    gmGetValueMock.mockReset()
    gmGetValueMock.mockImplementation((_key: string, fallback: unknown) => fallback)
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('useHostThemeSync', () => {
    it('uses the early host theme bridge as the initial host theme seed', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        documentMock.documentElement.getAttribute = vi.fn(() => undefined as unknown as string)
        documentMock.getElementById = vi.fn(() => null)
        documentMock.querySelector = vi.fn(() => null)
        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2 = {}

        const { ensureHostThemeSignalBridge } = await import('@/composables/hostThemeSignalBridge')
        ensureHostThemeSignalBridge()
        ;(
            globalThis as typeof globalThis & {
                __hazelspamUserscriptHostThemeSignalState?: {
                    latestTheme?: UiConfig['theme'] | null
                    latestSnapshot?: HostThemeSignalSnapshot | null
                }
            }
        ).__hazelspamUserscriptHostThemeSignalState = {
            initialized: true,
            listenerInstalled: true,
            latestTheme: 'dark',
            latestSnapshot: {
                theme: 'dark',
                completeness: 'partial',
                completeTheme: null,
                isCompleteDark: false,
                isCompleteLight: false,
                signals: {
                    apiTheme: 'dark',
                    labTheme: 'light',
                    cssMapTheme: 'dark',
                    navbarTheme: 'light',
                    roomTheme: 'light'
                }
            }
        }

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())
        uiConfig.syncHostThemeWithBrowser = false

        useHostThemeSync(uiConfig)
        await nextTick()

        expect(uiConfig.theme).toBe('dark')
    })

    it('bootstraps early surface-patch dark hints for blackboard pages when browser sync is enabled', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blackboard/era/p5YHwD9E0VXe7yp0.html',
            search: ''
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        gmGetValueMock.mockImplementation((key: string, fallback: unknown) => {
            if (key === 'ui') {
                return {
                    syncHostThemeWithBrowser: true
                }
            }

            return fallback
        })

        const { bootstrapBiliThemeDocumentHints } = await import(
            '@/composables/hostThemeSurfaceBootstrap'
        )

        bootstrapBiliThemeDocumentHints()

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-surface-theme')
        ).toBe('dark')
        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-surface-context')
        ).toBe('blackboard')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
        expect(documentMock.__nodes.cssMapNode.getAttribute('href')).toContain('/dark.css')
        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')
        ).toBe('dark')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).not.toBeNull()
    })

    it('does not bootstrap early surface-patch dark hints when browser sync is disabled', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blackboard/era/p5YHwD9E0VXe7yp0.html',
            search: ''
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        gmGetValueMock.mockImplementation((key: string, fallback: unknown) => {
            if (key === 'ui') {
                return {
                    syncHostThemeWithBrowser: false
                }
            }

            return fallback
        })

        const { bootstrapBiliThemeDocumentHints } = await import(
            '@/composables/hostThemeSurfaceBootstrap'
        )

        bootstrapBiliThemeDocumentHints()

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-surface-theme')
        ).toBe('')
        expect(documentMock.documentElement.style.colorScheme).toBe('')
        expect(documentMock.__nodes.cssMapNode.getAttribute('href')).toContain('/light.css')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).toBeNull()
    })

    it('keeps bootstrapped surface-patch dark hints stable after host theme sync initializes', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blackboard/era/p5YHwD9E0VXe7yp0.html',
            search: ''
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        gmGetValueMock.mockImplementation((key: string, fallback: unknown) => {
            if (key === 'ui') {
                return {
                    syncHostThemeWithBrowser: true
                }
            }

            return fallback
        })

        const { bootstrapBiliThemeDocumentHints } = await import(
            '@/composables/hostThemeSurfaceBootstrap'
        )
        const { getBiliThemeRuntimeSnapshot, useHostThemeSync } = await import(
            '@/composables/useHostThemeSync'
        )

        bootstrapBiliThemeDocumentHints()

        const uiConfig = reactive(createUiConfig())
        useHostThemeSync(uiConfig)
        await nextTick()

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')
        ).toBe('dark')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).not.toBeNull()
        expect(documentMock.__nodes.cssMapNode.getAttribute('href')).toContain('/dark.css')
        expect(getBiliThemeRuntimeSnapshot().effectiveMode).toBe('surface-patch')
        expect(getBiliThemeRuntimeSnapshot().effectiveTheme).toBe('dark')
        expect(getBiliThemeRuntimeSnapshot().strategy).toBe('blackboard')
    })

    it('falls back to ui-only browser sync on blackboard pages when surface patch targets are unavailable', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blackboard/era/p5YHwD9E0VXe7yp0.html',
            search: ''
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2 = undefined

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })

    it('falls back to ui-only browser sync on lite live pages when surface patch targets are unavailable', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blanc/26276187',
            search: '?liteVersion=true'
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        const originalChangeTheme = vi.fn((theme: UiConfig['theme']) => {
            hostThemeApi.theme = theme
            documentMock.__setThemeSignals({
                cssMapTheme: theme
            })
        })
        const originalInitThemeWithCSR = vi.fn((theme: UiConfig['theme']) => {
            hostThemeApi.theme = theme
            documentMock.__setThemeSignals({
                cssMapTheme: theme
            })
        })
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            getTheme: vi.fn(() => hostThemeApi.theme),
            changeTheme: originalChangeTheme,
            initThemeWithCSR: originalInitThemeWithCSR
        }
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
        expect(originalChangeTheme).not.toHaveBeenCalled()
        expect(originalInitThemeWithCSR).not.toHaveBeenCalled()
    })

    it('adds and removes the Dark Reader complete-dark signal from bridge snapshots', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))

        documentMock.__setThemeSignals({
            labStyle: 'dark',
            cssMapTheme: 'dark',
            navbarTheme: 'dark',
            roomTheme: 'dark'
        })

        const { ensureHostThemeSignalBridge } = await import('@/composables/hostThemeSignalBridge')
        ensureHostThemeSignalBridge()

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')
        ).toBe('dark')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).not.toBeNull()
        expect(
            documentMock.getElementById('hazelspam-host-color-scheme')?.getAttribute('content')
        ).toBe('dark')

        documentMock.__setThemeSignals({
            labStyle: '',
            cssMapTheme: 'dark',
            navbarTheme: 'light',
            roomTheme: 'light'
        })
        ensureHostThemeSignalBridge()

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')
        ).toBe('')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).toBeNull()
    })

    it('supports an explicit Dark Reader signal override for verified surface-patch dark states', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))

        const { ensureHostThemeSignalBridge, setDarkReaderThemeSignalOverride } = await import(
            '@/composables/hostThemeSignalBridge'
        )
        ensureHostThemeSignalBridge()
        setDarkReaderThemeSignalOverride({
            theme: 'dark',
            mode: 'surface-patch',
            verified: true
        })

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')
        ).toBe('dark')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).not.toBeNull()

        setDarkReaderThemeSignalOverride(null)

        expect(
            documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')
        ).toBe('light')
        expect(documentMock.getElementById('hazelspam-host-color-scheme')).toBeNull()
    })

    it('prefers the host laboratory dark toggle when it is available', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        const toggleSwitch = vi.fn(async () => {
            hostThemeApi.theme = 'dark'
            documentMock.__setThemeSignals({
                labStyle: 'dark',
                cssMapTheme: 'dark',
                navbarTheme: 'dark',
                roomTheme: 'dark'
            })
        })
        const labPanelVm = {
            configs: {
                dark: { status: 0, option: {} }
            },
            plugs: {
                dark: { status: 1, option: {} }
            },
            getStatus: vi.fn(() => 'off' as const),
            toggleSwitch
        }
        const switchNode = {
            classList: {
                toggle: vi.fn()
            },
            __vue__: {
                $parent: labPanelVm
            }
        } as unknown as HTMLElement
        const labItem = {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.lab-title') {
                    return { textContent: '深色模式' } as HTMLElement
                }
                if (selector === '.bl-switch') {
                    return switchNode
                }
                return null
            }),
            querySelectorAll: vi.fn((selector: string) =>
                selector === '.bl-switch' ? [switchNode] : []
            )
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) =>
            selector === '.lab-item' ? [labItem] : []
        )

        const originalChangeTheme = vi.fn(function (this: { theme: UiConfig['theme'] }, theme: UiConfig['theme']) {
            this.theme = theme
        })
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                originalChangeTheme.call(this, theme)
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())
        uiConfig.theme = 'dark'

        useHostThemeSync(uiConfig)
        await nextTick()
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(3000)

        expect(toggleSwitch).toHaveBeenCalledTimes(1)
        expect(toggleSwitch).toHaveBeenCalledWith({ target: switchNode }, 'dark')
        expect(originalChangeTheme).not.toHaveBeenCalledWith('dark')
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })

    it('keeps browser sync enabled when the laboratory toggle internally calls changeTheme', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
                documentMock.__setThemeSignals({
                    labStyle: 'dark',
                    cssMapTheme: theme,
                    navbarTheme: 'dark',
                    roomTheme: 'dark'
                })
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }
        const toggleSwitch = vi.fn(async () => {
            hostThemeApi.changeTheme('dark')
        })
        const labPanelVm = {
            configs: {
                dark: { status: 0, option: {} }
            },
            plugs: {
                dark: { status: 1, option: {} }
            },
            getStatus: vi.fn(() => 'off' as const),
            toggleSwitch
        }
        const switchNode = {
            __vue__: {
                $parent: labPanelVm
            }
        } as unknown as HTMLElement
        const labItem = {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.lab-title') {
                    return { textContent: '深色模式' } as HTMLElement
                }
                if (selector === '.bl-switch') {
                    return switchNode
                }
                return null
            })
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) =>
            selector === '.lab-item' ? [labItem] : []
        )

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())
        uiConfig.theme = 'dark'

        useHostThemeSync(uiConfig)
        await nextTick()
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(3000)

        expect(toggleSwitch).toHaveBeenCalledWith({ target: switchNode }, 'dark')
        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })

    it('opens and closes the laboratory popup to access the host dark toggle', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        let isLabOpen = false
        const sidebarControllerVm = {
            currentPopupName: null as string | null,
            openPopup: vi.fn((name: string) => {
                sidebarControllerVm.currentPopupName = name
                isLabOpen = true
            }),
            closePopup: vi.fn(() => {
                sidebarControllerVm.currentPopupName = null
                isLabOpen = false
            })
        }
        const toggleSwitch = vi.fn(async () => {
            hostThemeApi.theme = 'dark'
            documentMock.__setThemeSignals({
                labStyle: 'dark',
                cssMapTheme: 'dark',
                navbarTheme: 'dark',
                roomTheme: 'dark'
            })
        })
        const labPanelVm = {
            configs: {
                dark: { status: 0, option: {} }
            },
            plugs: {
                dark: { status: 1, option: {} }
            },
            getStatus: vi.fn(() => 'off' as const),
            toggleSwitch
        }
        const switchNode = {
            __vue__: {
                $parent: labPanelVm
            }
        } as unknown as HTMLElement
        const labItem = {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.lab-title') {
                    return { textContent: '深色模式' } as HTMLElement
                }
                if (selector === '.bl-switch') {
                    return switchNode
                }
                return null
            })
        } as unknown as HTMLElement
        const sidebarElement = {
            __vue__: sidebarControllerVm
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) => {
            if (selector === '.lab-item') {
                return isLabOpen ? [labItem] : []
            }
            if (selector === '.z-sidebar, .contain-optimize, .side-bar-popup-cntr') {
                return [sidebarElement]
            }
            return []
        })

        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())
        uiConfig.theme = 'dark'

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(3020)

        expect(sidebarControllerVm.openPopup).toHaveBeenCalledWith('Laboratory')
        expect(toggleSwitch).toHaveBeenCalledWith({ target: switchNode }, 'dark')
        expect(sidebarControllerVm.closePopup).toHaveBeenCalledTimes(1)
        expect(uiConfig.theme).toBe('dark')
    })

    it('reuses the warmed laboratory controller without reopening the popup', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        let isLabOpen = false
        const sidebarControllerVm = {
            currentPopupName: null as string | null,
            openPopup: vi.fn((name: string) => {
                sidebarControllerVm.currentPopupName = name
                isLabOpen = true
            }),
            closePopup: vi.fn(() => {
                sidebarControllerVm.currentPopupName = null
                isLabOpen = false
            })
        }
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }
        const toggleSwitch = vi.fn(async () => {
            const nextTheme = hostThemeApi.theme === 'dark' ? 'light' : 'dark'
            hostThemeApi.theme = nextTheme
            documentMock.__setThemeSignals({
                labStyle: nextTheme === 'dark' ? 'dark' : '',
                cssMapTheme: nextTheme,
                navbarTheme: nextTheme,
                roomTheme: nextTheme
            })
        })
        const labPanelVm = {
            _isDestroyed: false,
            configs: {
                dark: { status: 0, option: {} }
            },
            plugs: {
                dark: { status: 1, option: {} }
            },
            getStatus: vi.fn(() => (hostThemeApi.theme === 'dark' ? 'on' : 'off') as const),
            toggleSwitch
        }
        const switchNode = {
            isConnected: true,
            __vue__: {
                $parent: labPanelVm
            }
        } as unknown as HTMLElement
        const labItem = {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.lab-title') {
                    return { textContent: '深色模式' } as HTMLElement
                }
                if (selector === '.bl-switch') {
                    return switchNode
                }
                return null
            })
        } as unknown as HTMLElement
        const sidebarElement = {
            __vue__: sidebarControllerVm
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) => {
            if (selector === '.lab-item') {
                return isLabOpen ? [labItem] : []
            }
            if (selector === '.z-sidebar, .contain-optimize, .side-bar-popup-cntr') {
                return [sidebarElement]
            }
            return []
        })

        installCommonDomMocks(documentMock)
        const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>()
        const mediaQueryList = {
            matches: true,
            addEventListener: vi.fn((_: string, listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.add(listener)
            ),
            removeEventListener: vi.fn((_: string, listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.delete(listener)
            ),
            addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.add(listener)
            ),
            removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.delete(listener)
            )
        }
        vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(1300)

        expect(sidebarControllerVm.openPopup).toHaveBeenCalledTimes(1)
        expect(sidebarControllerVm.closePopup).toHaveBeenCalledTimes(1)
        expect(toggleSwitch).toHaveBeenCalledTimes(1)
        expect(uiConfig.theme).toBe('dark')

        mediaQueryList.matches = false
        mediaQueryListeners.forEach((listener) =>
            listener({ matches: false } as MediaQueryListEvent)
        )
        await nextTick()
        await vi.advanceTimersByTimeAsync(100)

        expect(toggleSwitch).toHaveBeenCalledTimes(2)
        expect(sidebarControllerVm.openPopup).toHaveBeenCalledTimes(1)
        expect(sidebarControllerVm.closePopup).toHaveBeenCalledTimes(1)
        expect(uiConfig.theme).toBe('light')
    })

    it('disables browser sync when the host theme is manually changed away from the browser theme', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        documentMock.__setThemeSignals({
            labStyle: 'dark',
            cssMapTheme: 'dark',
            navbarTheme: 'dark',
            roomTheme: 'dark'
        })
        const hostThemeApi = {
            theme: 'dark' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
                documentMock.__setThemeSignals({
                    labStyle: '',
                    cssMapTheme: theme,
                    navbarTheme: 'light',
                    roomTheme: 'light'
                })
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(3000)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')

        ;(
            globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }
        ).bililiveThemeV2?.changeTheme('light')
        await nextTick()

        expect(uiConfig.syncHostThemeWithBrowser).toBe(false)
        expect(uiConfig.theme).toBe('light')
        expect(documentMock.documentElement.style.colorScheme).toBe('light')
    })

    it('does not disable browser sync when the host restores its own theme during the grace period', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        documentMock.__setThemeSignals({
            labStyle: 'dark',
            cssMapTheme: 'dark',
            navbarTheme: 'dark',
            roomTheme: 'dark'
        })
        const hostThemeApi = {
            theme: 'dark' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
                documentMock.__setThemeSignals({
                    labStyle: 'dark',
                    cssMapTheme: theme,
                    navbarTheme: 'dark',
                    roomTheme: 'dark'
                })
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()

        hostThemeApi.changeTheme('dark')
        await nextTick()

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')

        await vi.advanceTimersByTimeAsync(3000)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('light')
        expect(documentMock.documentElement.style.colorScheme).toBe('light')
    })

    it('keeps browser sync enabled and reconciles to light when the host replays dark during startup', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        documentMock.__setThemeSignals({
            labStyle: 'dark',
            cssMapTheme: 'dark',
            navbarTheme: 'dark',
            roomTheme: 'dark'
        })

        let isLabOpen = false
        let isLabReady = false
        const sidebarControllerVm = {
            currentPopupName: null as string | null,
            openPopup: vi.fn((name: string) => {
                sidebarControllerVm.currentPopupName = name
                isLabOpen = true
            }),
            closePopup: vi.fn(() => {
                sidebarControllerVm.currentPopupName = null
                isLabOpen = false
            })
        }
        const hostThemeApi = {
            theme: 'dark' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
                documentMock.__setThemeSignals({
                    labStyle: theme === 'dark' ? 'dark' : '',
                    cssMapTheme: theme,
                    navbarTheme: theme,
                    roomTheme: theme
                })
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }
        const toggleSwitch = vi.fn(async () => {
            hostThemeApi.changeTheme('light')
        })
        const labPanelVm = {
            _isDestroyed: false,
            configs: {
                dark: { status: 1, option: {} }
            },
            plugs: {
                dark: { status: 1, option: {} }
            },
            getStatus: vi.fn(() => (hostThemeApi.theme === 'dark' ? 'on' : 'off') as const),
            toggleSwitch
        }
        const switchNode = {
            isConnected: true,
            __vue__: {
                $parent: labPanelVm
            }
        } as unknown as HTMLElement
        const labItem = {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.lab-title') {
                    return { textContent: '深色模式' } as HTMLElement
                }
                if (selector === '.bl-switch') {
                    return switchNode
                }
                return null
            })
        } as unknown as HTMLElement
        const sidebarElement = {
            __vue__: sidebarControllerVm
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) => {
            if (selector === '.lab-item') {
                return isLabOpen && isLabReady ? [labItem] : []
            }
            if (selector === '.z-sidebar, .contain-optimize, .side-bar-popup-cntr') {
                return [sidebarElement]
            }
            return []
        })

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()

        window.setTimeout(() => {
            hostThemeApi.changeTheme('dark')
        }, 1800)
        window.setTimeout(() => {
            isLabReady = true
        }, 2000)

        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('light')
        expect(documentMock.documentElement.style.colorScheme).toBe('light')
        expect(hostThemeApi.theme).toBe('light')
        expect(toggleSwitch).toHaveBeenCalledWith({ target: switchNode }, 'dark')
    })

    it('keeps retrying startup browser sync until host controls become available', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        documentMock.__setThemeSignals({
            labStyle: '',
            cssMapTheme: 'light',
            navbarTheme: 'light',
            roomTheme: 'light'
        })

        let isLabOpen = false
        let controlsReady = false
        const sidebarControllerVm = {
            currentPopupName: null as string | null,
            openPopup: vi.fn((name: string) => {
                sidebarControllerVm.currentPopupName = name
                isLabOpen = true
            }),
            closePopup: vi.fn(() => {
                sidebarControllerVm.currentPopupName = null
                isLabOpen = false
            })
        }
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }
        const toggleSwitch = vi.fn(async () => {
            hostThemeApi.theme = 'dark'
            documentMock.__setThemeSignals({
                labStyle: 'dark',
                cssMapTheme: 'dark',
                navbarTheme: 'dark',
                roomTheme: 'dark'
            })
        })
        const labPanelVm = {
            _isDestroyed: false,
            configs: {
                dark: { status: 0, option: {} }
            },
            plugs: {
                dark: { status: 1, option: {} }
            },
            getStatus: vi.fn(() => (hostThemeApi.theme === 'dark' ? 'on' : 'off') as const),
            toggleSwitch
        }
        const switchNode = {
            isConnected: true,
            __vue__: {
                $parent: labPanelVm
            }
        } as unknown as HTMLElement
        const labItem = {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.lab-title') {
                    return { textContent: '深色模式' } as HTMLElement
                }
                if (selector === '.bl-switch') {
                    return switchNode
                }
                return null
            })
        } as unknown as HTMLElement
        const sidebarElement = {
            __vue__: sidebarControllerVm
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) => {
            if (selector === '.lab-item') {
                return isLabOpen && controlsReady ? [labItem] : []
            }
            if (selector === '.z-sidebar, .contain-optimize, .side-bar-popup-cntr') {
                return controlsReady ? [sidebarElement] : []
            }
            return []
        })

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            undefined

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()

        window.setTimeout(() => {
            controlsReady = true
            ;(
                globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }
            ).bililiveThemeV2 = hostThemeApi
        }, 1600)

        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
        expect(hostThemeApi.theme).toBe('dark')
        expect(toggleSwitch).toHaveBeenCalledWith({ target: switchNode }, 'dark')
    })

    it('retries lite live surface patch during startup until host shell nodes mount', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        let surfaceReady = false
        const createPatchedNode = (role: string) =>
            ({
                __hazelRole: role,
                style: {
                    setProperty: vi.fn(),
                    removeProperty: vi.fn()
                }
            }) as unknown as Element
        const headInfoNode = createPatchedNode('head-info')
        const giftPanelNode = createPatchedNode('gift-panel')
        const chatHistoryNode = createPatchedNode('chat-history')
        const chatInputNode = createPatchedNode('chat-input')

        documentMock.querySelector = vi.fn((selector: string) => {
            if (selector === '#__css-map__') {
                return documentMock.__nodes.cssMapNode
            }
            if (!surfaceReady) {
                return null
            }
            if (selector === '.head-info-section') {
                return headInfoNode
            }
            if (selector === '.gift-control-panel') {
                return giftPanelNode
            }
            if (selector === '.chat-history-panel') {
                return chatHistoryNode
            }
            if (selector === '.chat-input-ctnr') {
                return chatInputNode
            }
            return null
        })
        documentMock.querySelectorAll = vi.fn(() => [] as HTMLElement[])

        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blanc/26276187',
            search: '?liteVersion=true'
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        vi.stubGlobal(
            'getComputedStyle',
            vi.fn((element: unknown) => {
                const isSurfaceDark =
                    surfaceReady &&
                    documentMock.documentElement.getAttribute('data-hazelspam-host-surface-theme') ===
                        'dark' &&
                    documentMock.documentElement.getAttribute('data-hazelspam-host-surface-context') ===
                        'lite-live'
                if (element === headInfoNode || element === giftPanelNode || element === chatHistoryNode || element === chatInputNode) {
                    return {
                        backgroundColor: isSurfaceDark ? 'rgba(15, 17, 19, 0.94)' : 'rgb(255, 255, 255)',
                        backgroundImage: 'none',
                        color: 'rgb(235, 239, 244)'
                    }
                }

                return {
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    backgroundImage: 'none',
                    color: 'rgb(0, 0, 0)'
                }
            })
        )
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2 = undefined

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()

        window.setTimeout(() => {
            surfaceReady = true
        }, 1600)

        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
        expect(documentMock.documentElement.getAttribute('data-hazelspam-host-surface-theme')).toBe(
            'dark'
        )
        expect(documentMock.documentElement.getAttribute('data-hazelspam-host-surface-context')).toBe(
            'lite-live'
        )
        expect(documentMock.documentElement.getAttribute('data-hazelspam-host-theme-complete')).toBe(
            'dark'
        )
        expect(documentMock.getElementById('hazelspam-host-color-scheme')?.getAttribute('content')).toBe(
            'dark'
        )
    })

    it('keeps browser sync enabled on blackboard pages and falls back to ui-only when surface patch targets are unavailable', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blackboard/era/p5YHwD9E0VXe7yp0.html',
            search: ''
        })
        const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>()
        const mediaQueryList = {
            matches: true,
            addEventListener: vi.fn((_: string, listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.add(listener)
            ),
            removeEventListener: vi.fn((_: string, listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.delete(listener)
            ),
            addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.add(listener)
            ),
            removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) =>
                mediaQueryListeners.delete(listener)
            )
        }
        vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2 = undefined

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')

        mediaQueryList.matches = false
        mediaQueryListeners.forEach((listener) =>
            listener({ matches: false } as MediaQueryListEvent)
        )
        await nextTick()
        await vi.advanceTimersByTimeAsync(50)

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('light')
        expect(documentMock.documentElement.style.colorScheme).toBe('light')
    })

    it('does not disable browser sync when lite live pages replay host theme changes before ui-only fallback', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blanc/26276187',
            search: '?liteVersion=true'
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        const originalChangeTheme = vi.fn((theme: UiConfig['theme']) => {
            hostThemeApi.theme = theme
            documentMock.__setThemeSignals({
                cssMapTheme: theme
            })
        })
        const originalInitThemeWithCSR = vi.fn((theme: UiConfig['theme']) => {
            hostThemeApi.theme = theme
            documentMock.__setThemeSignals({
                cssMapTheme: theme
            })
        })
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            getTheme: vi.fn(() => hostThemeApi.theme),
            changeTheme: originalChangeTheme,
            initThemeWithCSR: originalInitThemeWithCSR
        }
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(4200)

        expect(uiConfig.theme).toBe('dark')

        hostThemeApi.changeTheme('light')
        await nextTick()

        expect(uiConfig.syncHostThemeWithBrowser).toBe(true)
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
        expect(originalChangeTheme).toHaveBeenCalledWith('light')
        expect(originalInitThemeWithCSR).not.toHaveBeenCalled()
    })

    it('does not interrupt other host popups when the laboratory toggle is unavailable', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        const sidebarControllerVm = {
            currentPopupName: 'Gift' as string | null,
            openPopup: vi.fn(),
            closePopup: vi.fn()
        }
        const sidebarElement = {
            __vue__: sidebarControllerVm
        } as unknown as HTMLElement
        documentMock.querySelectorAll = vi.fn((selector: string) => {
            if (selector === '.z-sidebar, .contain-optimize, .side-bar-popup-cntr') {
                return [sidebarElement]
            }
            return []
        })
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                this.theme = theme
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(4200)

        expect(sidebarControllerVm.openPopup).not.toHaveBeenCalled()
        expect(sidebarControllerVm.closePopup).not.toHaveBeenCalled()
        expect(hostThemeApi.theme).toBe('light')
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })

    it('falls back to HazelSpam theme only when the host lab toggle is unavailable', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        const originalChangeTheme = vi.fn(function (this: { theme: UiConfig['theme'] }, theme: UiConfig['theme']) {
            this.theme = theme
        })
        const hostThemeApi = {
            theme: 'light' as UiConfig['theme'],
            changeTheme(theme: UiConfig['theme']) {
                originalChangeTheme.call(this, theme)
            },
            initThemeWithCSR(theme: UiConfig['theme']) {
                this.theme = theme
            },
            getTheme() {
                return this.theme
            }
        }

        installCommonDomMocks(documentMock)
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: typeof hostThemeApi }).bililiveThemeV2 =
            hostThemeApi

        const { useHostThemeSync } = await import('@/composables/useHostThemeSync')
        const uiConfig = reactive(createUiConfig())

        useHostThemeSync(uiConfig)
        await nextTick()
        await vi.advanceTimersByTimeAsync(3000)

        expect(originalChangeTheme).not.toHaveBeenCalledWith('dark')
        expect(uiConfig.theme).toBe('dark')
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })

    it('exports a reusable ensureBiliTheme runtime snapshot for ui-only contexts', async () => {
        vi.resetModules()

        const documentMock = createDocumentMock()
        installCommonDomMocks(documentMock)
        vi.stubGlobal('location', {
            pathname: '/blackboard/era/p5YHwD9E0VXe7yp0.html',
            search: ''
        })
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            addListener: vi.fn()
        })))
        ;(globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2 = undefined

        const { ensureBiliTheme, getBiliThemeRuntimeSnapshot } = await import(
            '@/composables/useHostThemeSync'
        )
        const result = await ensureBiliTheme('dark', {
            source: 'browser-sync'
        })

        expect(result).toMatchObject({
            ok: true,
            mode: 'ui-only',
            targetTheme: 'dark',
            effectiveTheme: 'dark',
            source: 'browser-sync',
            reason: 'ui-only-fallback'
        })
        expect(getBiliThemeRuntimeSnapshot()).toMatchObject({
            strategy: 'blackboard',
            browserPreferredTheme: 'dark',
            requestedTheme: 'dark',
            hostTheme: 'dark',
            effectiveTheme: 'dark',
            effectiveMode: 'ui-only',
            source: 'browser-sync'
        })
        expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })
})
