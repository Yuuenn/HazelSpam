import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeExternalUrl, openExternalUrl } from '@/utils/ui/openExternalUrl'

const { unsafeWindowMock } = vi.hoisted(() => ({
    unsafeWindowMock: {
        open: vi.fn(),
        location: {
            href: 'https://live.bilibili.com/123'
        }
    }
}))

vi.mock('$', () => ({
    unsafeWindow: unsafeWindowMock
}))

describe('openExternalUrl', () => {
    beforeEach(() => {
        unsafeWindowMock.open.mockReset()
        Reflect.deleteProperty(globalThis, 'document')
    })

    it('会规范化 http 和 https 链接', () => {
        expect(normalizeExternalUrl('https://example.com/releases')).toBe(
            'https://example.com/releases'
        )
        expect(normalizeExternalUrl('/jump')).toBe('https://live.bilibili.com/jump')
    })

    it('会拒绝空链接和非 http 协议', () => {
        expect(normalizeExternalUrl('')).toBeNull()
        expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull()
        expect(normalizeExternalUrl('data:text/plain,hello')).toBeNull()
    })

    it('优先通过锚点在新窗口打开站外链接', () => {
        const click = vi.fn()
        const anchor = {
            href: '',
            target: '',
            rel: '',
            referrerPolicy: '',
            click
        }

        globalThis.document = {
            createElement: vi.fn().mockReturnValue(anchor)
        } as unknown as Document

        expect(openExternalUrl('https://example.com/changelog')).toBe(true)
        expect(globalThis.document.createElement).toHaveBeenCalledWith('a')
        expect(anchor.href).toBe('https://example.com/changelog')
        expect(anchor.target).toBe('_blank')
        expect(anchor.rel).toBe('noopener noreferrer')
        expect(anchor.referrerPolicy).toBe('no-referrer')
        expect(click).toHaveBeenCalledTimes(1)
        expect(unsafeWindowMock.open).not.toHaveBeenCalled()
    })

    it('在没有 DOM 时回退到 window.open', () => {
        expect(openExternalUrl('https://example.com/install')).toBe(true)
        expect(unsafeWindowMock.open).toHaveBeenCalledWith(
            'https://example.com/install',
            '_blank',
            'noopener,noreferrer'
        )
    })

    it('遇到非法链接时不会触发打开动作', () => {
        expect(openExternalUrl('javascript:alert(1)')).toBe(false)
        expect(unsafeWindowMock.open).not.toHaveBeenCalled()
    })
})
