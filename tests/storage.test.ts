import { beforeEach, describe, expect, it, vi } from 'vitest'

const { gmDeleteValueMock, gmGetValueMock, gmSetValueMock } = vi.hoisted(() => ({
    gmDeleteValueMock: vi.fn(),
    gmGetValueMock: vi.fn(),
    gmSetValueMock: vi.fn()
}))

vi.mock('$', () => ({
    GM_deleteValue: gmDeleteValueMock,
    GM_getValue: gmGetValueMock,
    GM_setValue: gmSetValueMock
}))

describe('Storage', () => {
    beforeEach(() => {
        gmDeleteValueMock.mockReset()
        gmGetValueMock.mockReset()
        gmSetValueMock.mockReset()
    })

    it('clears all HazelSpam GM storage keys', async () => {
        const { default: Storage } = await import('@/utils/storage')

        Storage.clearAll()

        expect(gmDeleteValueMock).toHaveBeenNthCalledWith(1, 'ui')
        expect(gmDeleteValueMock).toHaveBeenNthCalledWith(2, 'modules')
        expect(gmDeleteValueMock).toHaveBeenCalledTimes(2)
    })
})
