import mitt from 'mitt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeModuleConfig } from '@/utils/storage/schema'

const {
    navMock,
    getEmoticonsMock,
    getInfoByUserMock,
    getInfoByRoomMock,
    biliStoreState,
    moduleStoreState,
    unsafeWindowState
} = vi.hoisted(() => ({
    navMock: vi.fn(),
    getEmoticonsMock: vi.fn(),
    getInfoByUserMock: vi.fn(),
    getInfoByRoomMock: vi.fn(),
    biliStoreState: {
        current: null as {
            cookies: { bili_jct: string } | null
            loginInfo: { isLogin: boolean } | null
            emotionData: Array<unknown>
            BilibiliLive: { ROOMID: number } | null
            infoByuser: { property: { danmu: { length: number } } } | null
            roomAnchorName: string
            danmuLengthLimit: number | null
        } | null
    },
    moduleStoreState: {
        current: null as {
            moduleConfig: ReturnType<typeof sanitizeModuleConfig>
            emitter: ReturnType<typeof mitt>
        } | null
    },
    unsafeWindowState: {
        current: {} as Partial<Window>
    }
}))

vi.mock('$', () => ({
    unsafeWindow: unsafeWindowState.current
}))

vi.mock('@/stores/useBiliStore', () => ({
    useBiliStore: () => biliStoreState.current
}))

vi.mock('@/stores/useModuleStore', () => ({
    useModuleStore: () => moduleStoreState.current
}))

vi.mock('@/utils/bili', () => ({
    BILIAPI: {
        nav: navMock,
        getEmoticons: getEmoticonsMock,
        getInfoByUser: getInfoByUserMock,
        getInfoByRoom: getInfoByRoomMock
    }
}))

import UserInfoModule from '@/modules/default/userInfo'

describe('UserInfoModule', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        navMock.mockReset()
        getEmoticonsMock.mockReset()
        getInfoByUserMock.mockReset()
        getInfoByRoomMock.mockReset()

        navMock.mockResolvedValue({
            code: 0,
            data: {
                isLogin: true
            }
        })

        Object.keys(unsafeWindowState.current).forEach((key) => {
            delete unsafeWindowState.current[key as keyof Window]
        })
        moduleStoreState.current = {
            moduleConfig: sanitizeModuleConfig({}),
            emitter: mitt()
        }
        biliStoreState.current = {
            cookies: null,
            loginInfo: null,
            emotionData: [],
            BilibiliLive: null,
            infoByuser: null,
            roomAnchorName: '',
            danmuLengthLimit: null
        }
    })

    it('waits for a valid room id before reading emotion and room data', async () => {
        getEmoticonsMock.mockResolvedValue({
            code: 0,
            data: {
                data: [{ pkg_id: 100, emoticons: [] }]
            }
        })
        getInfoByRoomMock.mockResolvedValue({
            code: 0,
            data: {
                anchor_info: {
                    base_info: {
                        uname: '测试主播'
                    }
                },
                room_info: {
                    uname: ''
                }
            }
        })
        getInfoByUserMock.mockResolvedValue({
            code: 0,
            data: {
                property: {
                    danmu: {
                        length: 40
                    }
                }
            }
        })

        unsafeWindowState.current.BilibiliLive = {} as Window['BilibiliLive']

        const module = new UserInfoModule('UserInfoTest')
        const runPromise = module.run()

        await vi.advanceTimersByTimeAsync(400)
        expect(getEmoticonsMock).not.toHaveBeenCalled()

        unsafeWindowState.current.BilibiliLive = { ROOMID: 25274497 } as Window['BilibiliLive']

        await vi.advanceTimersByTimeAsync(400)
        await expect(runPromise).resolves.toBeUndefined()

        expect(biliStoreState.current?.BilibiliLive).toEqual({ ROOMID: 25274497 })
        expect(getEmoticonsMock).toHaveBeenCalledWith('pc', 25274497)
        expect(getInfoByRoomMock).toHaveBeenCalledWith(25274497)
        expect(getInfoByUserMock).toHaveBeenCalledWith(25274497)
        expect(biliStoreState.current?.emotionData).toEqual([{ pkg_id: 100, emoticons: [] }])
        expect(biliStoreState.current?.roomAnchorName).toBe('测试主播')
        expect(biliStoreState.current?.danmuLengthLimit).toBe(40)
    })

    it('degrades gracefully when host room context does not appear in time', async () => {
        const module = new UserInfoModule('UserInfoTest')
        const runPromise = module.run()

        await vi.advanceTimersByTimeAsync(5000)
        await expect(runPromise).resolves.toBeUndefined()

        expect(biliStoreState.current?.BilibiliLive).toBeNull()
        expect(biliStoreState.current?.loginInfo).toEqual({ isLogin: true })
        expect(biliStoreState.current?.emotionData).toEqual([])
        expect(biliStoreState.current?.infoByuser).toBeNull()
        expect(biliStoreState.current?.roomAnchorName).toBe('')
        expect(biliStoreState.current?.danmuLengthLimit).toBeNull()
        expect(getEmoticonsMock).not.toHaveBeenCalled()
        expect(getInfoByUserMock).not.toHaveBeenCalled()
        expect(getInfoByRoomMock).not.toHaveBeenCalled()
    })
})
