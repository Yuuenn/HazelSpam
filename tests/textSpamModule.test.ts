import mitt from 'mitt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeModuleConfig } from '@/utils/storage/schema'

const { sendMsgMock, notificationErrorMock, moduleStoreState, biliStoreState } = vi.hoisted(() => ({
    sendMsgMock: vi.fn(),
    notificationErrorMock: vi.fn(),
    moduleStoreState: {
        current: null as {
            moduleConfig: ReturnType<typeof sanitizeModuleConfig>
            emitter: ReturnType<typeof mitt>
        } | null
    },
    biliStoreState: {
        current: null as {
            BilibiliLive: { ROOMID: number } | null
            emotionData: unknown[]
            danmuLengthLimit: number | null
        } | null
    }
}))

vi.mock('@/stores/useModuleStore', () => ({
    useModuleStore: () => moduleStoreState.current
}))

vi.mock('@/stores/useBiliStore', () => ({
    useBiliStore: () => biliStoreState.current
}))

vi.mock('@/utils/bili', () => ({
    BILIAPI: {
        sendMsg: sendMsgMock
    }
}))

vi.mock('@/utils/ui', () => ({
    useDiscreteAPI: () => ({
        notification: {
            error: notificationErrorMock
        }
    })
}))

import TextSpamModule from '@/modules/spam/textSpamModule'

describe('TextSpamModule', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        sendMsgMock.mockResolvedValue({ code: 0 })
        notificationErrorMock.mockReset()

        moduleStoreState.current = {
            moduleConfig: sanitizeModuleConfig({}),
            emitter: mitt()
        }
        biliStoreState.current = {
            BilibiliLive: { ROOMID: 1001 },
            emotionData: [],
            danmuLengthLimit: 40
        }
    })

    it('starts from the tabs source mode and sends the first normalized message immediately', async () => {
        const moduleStoreMock = moduleStoreState.current!

        moduleStoreMock.moduleConfig.textSpam.enable = true
        moduleStoreMock.moduleConfig.textSpam.sourceMode = 'tabs'
        moduleStoreMock.moduleConfig.textSpam.textInterval = 20
        moduleStoreMock.moduleConfig.textSpam.tabTimeInterval = 3
        moduleStoreMock.moduleConfig.textSpam.tabSplitMode = 'byLine'
        moduleStoreMock.moduleConfig.textSpam.tabPanels = [
            {
                key: 1,
                id: 11,
                tab: '测试标签',
                msg: '第一条\n第二条'
            }
        ]
        moduleStoreMock.moduleConfig.textSpam.activeTabId = 11

        const module = new TextSpamModule('TextSpamTest')
        await module.run()

        moduleStoreMock.emitter.emit('textSpam', { module: 'textSpam' })
        await Promise.resolve()

        expect(sendMsgMock).toHaveBeenCalledTimes(1)
        expect(sendMsgMock).toHaveBeenCalledWith('第一条', 1001)

        module.stop()
    })
})
