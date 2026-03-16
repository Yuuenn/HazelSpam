import { nextTick, reactive } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UiConfig } from '@/types'

vi.mock('$', () => ({
    unsafeWindow: globalThis
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

const createUiConfig = (): UiConfig => ({
    activeMenuIndex: 'TextView',
    isShowPanel: false,
    isCollapsed: true,
    theme: 'light',
    followBiliTheme: true,
    syncHostThemeWithBrowser: true,
    hideDanmakuHistoryScrollbar: true
})

const createDocumentMock = () => {
    const attributes = new Map<string, string>()

    return {
        body: {},
        documentElement: {
            style: {
                colorScheme: ''
            },
            getAttribute: (name: string) => attributes.get(name) ?? '',
            setAttribute: (name: string, value: string) => {
                attributes.set(name, value)
            }
        },
        querySelectorAll: () => [] as HTMLElement[]
    }
}

afterEach(() => {
    delete (globalThis as typeof globalThis & { bililiveThemeV2?: unknown }).bililiveThemeV2
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('useHostThemeSync', () => {
    it('prefers the host laboratory dark toggle when it is available', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        const toggleSwitch = vi.fn(async () => {
            hostThemeApi.theme = 'dark'
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

        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('document', documentMock)
        vi.stubGlobal('MutationObserver', MutationObserverMock)
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0)
            return 1
        })
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

        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('document', documentMock)
        vi.stubGlobal('MutationObserver', MutationObserverMock)
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0)
            return 1
        })
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

        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('document', documentMock)
        vi.stubGlobal('MutationObserver', MutationObserverMock)
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0)
            return 1
        })
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

    it('disables browser sync when the host theme is manually changed away from the browser theme', async () => {
        vi.resetModules()
        vi.useFakeTimers()

        const documentMock = createDocumentMock()
        const hostThemeApi = {
            theme: 'dark' as UiConfig['theme'],
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

        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('document', documentMock)
        vi.stubGlobal('MutationObserver', MutationObserverMock)
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0)
            return 1
        })
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
        const hostThemeApi = {
            theme: 'dark' as UiConfig['theme'],
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

        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('document', documentMock)
        vi.stubGlobal('MutationObserver', MutationObserverMock)
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0)
            return 1
        })
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
})
