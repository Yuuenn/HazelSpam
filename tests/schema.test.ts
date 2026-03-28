import { describe, expect, it } from 'vitest'
import { sanitizeModuleConfig, sanitizeUiConfig } from '@/utils/storage/schema'

describe('storage schema', () => {
    it('uses the current product defaults', () => {
        const config = sanitizeModuleConfig({})
        const ui = sanitizeUiConfig({})

        expect(config.textSpam.sourceMode).toBe('single')
        expect(config.textSpam.textInterval).toBe(20)
        expect(config.textSpam.splitMode).toBe('byLine')
        expect(config.textSpam.tabSplitMode).toBe('byLine')
        expect(config.settings.danmakuActions.enable).toBe(true)
        expect(config.settings.danmakuActions.crybabyEnabled).toBe(false)
        expect(ui.activeMenuIndex).toBe('TextView')
        expect(ui.isShowPanel).toBe(false)
        expect(ui.syncHostThemeWithBrowser).toBe(true)
        expect(ui.hideDanmakuHistoryScrollbar).toBe(true)
    })

    it('normalizes current text tab fields and invalid values back to defaults', () => {
        const config = sanitizeModuleConfig({
            textSpam: {
                sourceMode: 'tabs',
                splitMode: 'continuous',
                tabSplitMode: 'byLine',
                timeInterval: -1,
                tabTimeInterval: 0,
                textInterval: 0,
                timeLimit: -9,
                activeTabId: 404,
                tabPanels: [
                    {
                        key: 2,
                        id: 8,
                        tab: '当前标签',
                        msg: 'hello'
                    }
                ]
            }
        })

        expect(config.textSpam.timeInterval).toBe(1)
        expect(config.textSpam.tabTimeInterval).toBe(1)
        expect(config.textSpam.textInterval).toBe(1)
        expect(config.textSpam.timeLimit).toBe(0)
        expect(config.textSpam.activeTabId).toBe(8)
        expect(config.textSpam.msg).toBe('hello')
    })

    it('ignores legacy-only module fields instead of migrating them', () => {
        const config = sanitizeModuleConfig({
            TextSpam: {
                enable: true,
                sourceMode: 'collection',
                textinterval: 12
            },
            Favorites: {
                favoritesTabPanels: [
                    {
                        key: 7,
                        name: 3,
                        tab: '旧标签',
                        msg: '第一行\n第二行'
                    }
                ]
            },
            setting: {
                saveSpamerStatus: {
                    enable: true,
                    lastTask: 'TextSpam'
                }
            }
        })

        expect(config).toEqual(sanitizeModuleConfig({}))
    })

    it('only accepts supported ui menu values', () => {
        const ui = sanitizeUiConfig({
            activeMenuIndex: 'FavoritesView',
            isShowPanel: 'invalid',
            isCollapsed: false,
            theme: 'invalid',
            followBiliTheme: 'invalid',
            syncHostThemeWithBrowser: 'invalid',
            hideDanmakuHistoryScrollbar: 'invalid'
        })

        expect(ui).toEqual({
            activeMenuIndex: 'TextView',
            isShowPanel: false,
            isCollapsed: false,
            theme: 'light',
            followBiliTheme: true,
            syncHostThemeWithBrowser: true,
            hideDanmakuHistoryScrollbar: true
        })
    })
})
