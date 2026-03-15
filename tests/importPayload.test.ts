import { describe, expect, it } from 'vitest'
import {
    appendImportedTextTabsSnapshot,
    parseImportedStoragePayload,
    stringifyImportedStoragePayload
} from '@/utils/storage/importPayload'
import { getTextFallbackPool } from '@/utils/textFallback'

describe('storage import payload', () => {
    it('parses toml text tabs into normalized tab snapshots', () => {
        const payload = parseImportedStoragePayload(`
            [[tabs]]
            title = "当前标签"
            text = """第一行
第二行"""
        `)

        expect(payload?.kind).toBe('textTabs')
        if (!payload || payload.kind !== 'textTabs') {
            return
        }

        expect(payload.textTabs).toEqual({
            activeTabId: 1,
            tabPanels: [
                {
                    key: 1,
                    id: 1,
                    tab: '当前标签',
                    msg: '第一行\n第二行'
                }
            ]
        })
    })

    it('ignores unrelated toml fields and keeps tab order from top to bottom', () => {
        const payload = parseImportedStoragePayload(`
            modules = "ignored"

            [[tabs]]
            title = "第一个"
            text = """A"""
            extra = "ignored"

            [[tabs]]
            title = "第二个"
            text = """B"""
        `)

        expect(payload?.kind).toBe('textTabs')
        if (!payload || payload.kind !== 'textTabs') {
            return
        }

        expect(payload.textTabs.activeTabId).toBe(1)
        expect(payload.textTabs.tabPanels.map((panel) => panel.tab)).toEqual(['第一个', '第二个'])
        expect(payload.textTabs.tabPanels.map((panel) => panel.msg)).toEqual(['A', 'B'])
    })

    it('falls back to the default copy pool when the imported content has no tabs', () => {
        const payload = parseImportedStoragePayload(`
            modules = "ignored"
        `)

        expect(payload?.kind).toBe('textTabs')
        if (!payload || payload.kind !== 'textTabs') {
            return
        }

        expect(payload.textTabs.activeTabId).toBe(1)
        expect(payload.textTabs.tabPanels.map((panel) => panel.msg)).toEqual(getTextFallbackPool())
    })

    it('falls back to the default copy pool when the imported file is empty', () => {
        const payload = parseImportedStoragePayload('')

        expect(payload?.kind).toBe('textTabs')
        if (!payload || payload.kind !== 'textTabs') {
            return
        }

        expect(payload.textTabs.activeTabId).toBe(1)
        expect(payload.textTabs.tabPanels.map((panel) => panel.msg)).toEqual(getTextFallbackPool())
    })

    it('falls back to the default copy pool when the toml has no tab table', () => {
        const payload = parseImportedStoragePayload('text = "missing table"')

        expect(payload?.kind).toBe('textTabs')
        if (!payload || payload.kind !== 'textTabs') {
            return
        }

        expect(payload.textTabs.activeTabId).toBe(1)
        expect(payload.textTabs.tabPanels.map((panel) => panel.msg)).toEqual(getTextFallbackPool())
    })

    it('appends imported tabs without overwriting the existing focus', () => {
        const mergedSnapshot = appendImportedTextTabsSnapshot(
            {
                activeTabId: 9,
                tabPanels: [
                    {
                        key: 4,
                        id: 9,
                        tab: '现有标签',
                        msg: '已有文本'
                    }
                ]
            },
            {
                activeTabId: 1,
                tabPanels: [
                    {
                        key: 1,
                        id: 1,
                        tab: '导入标签 1',
                        msg: '导入文本 1'
                    },
                    {
                        key: 2,
                        id: 2,
                        tab: '导入标签 2',
                        msg: '导入文本 2'
                    }
                ]
            }
        )

        expect(mergedSnapshot.activeTabId).toBe(9)
        expect(mergedSnapshot.tabPanels).toEqual([
            {
                key: 4,
                id: 9,
                tab: '现有标签',
                msg: '已有文本'
            },
            {
                key: 5,
                id: 10,
                tab: '导入标签 1',
                msg: '导入文本 1'
            },
            {
                key: 6,
                id: 11,
                tab: '导入标签 2',
                msg: '导入文本 2'
            }
        ])
    })

    it('falls back to the first tab when there is no active focus after append', () => {
        const mergedSnapshot = appendImportedTextTabsSnapshot(
            {
                activeTabId: 404,
                tabPanels: [
                    {
                        key: 1,
                        id: 8,
                        tab: '现有标签',
                        msg: '已有文本'
                    }
                ]
            },
            {
                activeTabId: 1,
                tabPanels: [
                    {
                        key: 1,
                        id: 1,
                        tab: '导入标签',
                        msg: '导入文本'
                    }
                ]
            }
        )

        expect(mergedSnapshot.activeTabId).toBe(8)
    })

    it('exports every text field as triple-quoted toml and can round-trip it', () => {
        const toml = stringifyImportedStoragePayload({
            kind: 'textTabs',
            textTabs: {
                activeTabId: 2,
                tabPanels: [
                    {
                        key: 1,
                        id: 1,
                        tab: '默认 "标题"',
                        msg: '第一行\n第二行'
                    },
                    {
                        key: 2,
                        id: 2,
                        tab: '路径',
                        msg: 'C:\\HazelSpam\\text'
                    }
                ]
            }
        })

        expect(toml).toContain('text = """第一行\n第二行"""')
        expect(toml).toContain('text = """C:\\\\HazelSpam\\\\text"""')

        const parsedPayload = parseImportedStoragePayload(toml)
        expect(parsedPayload?.kind).toBe('textTabs')
        if (!parsedPayload || parsedPayload.kind !== 'textTabs') {
            return
        }

        expect(parsedPayload.textTabs.tabPanels).toEqual([
            {
                key: 1,
                id: 1,
                tab: '默认 "标题"',
                msg: '第一行\n第二行'
            },
            {
                key: 2,
                id: 2,
                tab: '路径',
                msg: 'C:\\HazelSpam\\text'
            }
        ])
    })

    it('returns null for malformed toml', () => {
        expect(
            parseImportedStoragePayload(`
                [[tabs]]
                title = "broken"
                text = """未闭合
            `)
        ).toBeNull()
    })
})
