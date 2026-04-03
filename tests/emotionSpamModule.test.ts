import mitt from 'mitt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeModuleConfig } from '@/utils/storage/schema'

const { sendEmotionMock, sendMsgMock, notificationErrorMock, moduleStoreState, biliStoreState } =
    vi.hoisted(() => ({
        sendEmotionMock: vi.fn(),
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
                bilibiliLive: { ROOMID: number } | null
                emotionData: Array<{
                    pkg_id: number
                    emoticons: Array<{
                        emoticon_unique: string
                        emoji: string
                    }>
                }>
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
        sendEmotion: sendEmotionMock,
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

import EmotionSpamModule from '@/modules/spam/emotionSpamModule'

describe('EmotionSpamModule', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        sendEmotionMock.mockResolvedValue({ code: 0 })
        sendMsgMock.mockResolvedValue({ code: 0 })
        notificationErrorMock.mockReset()

        moduleStoreState.current = {
            moduleConfig: sanitizeModuleConfig({}),
            emitter: mitt()
        }
        biliStoreState.current = {
            bilibiliLive: { ROOMID: 1002 },
            emotionData: []
        }
    })

    it('starts from the emitter and sends the first emotion immediately', async () => {
        const moduleStoreMock = moduleStoreState.current!

        moduleStoreMock.moduleConfig.emotionSpam.enable = true
        moduleStoreMock.moduleConfig.emotionSpam.msg = ['doge']
        moduleStoreMock.moduleConfig.emotionSpam.timeInterval = 2
        moduleStoreMock.moduleConfig.emotionSpam.sequentialMode = true

        const module = new EmotionSpamModule('EmotionSpamTest')
        await module.run()

        moduleStoreMock.emitter.emit('emotionSpam', { module: 'emotionSpam' })
        await Promise.resolve()

        expect(sendEmotionMock).toHaveBeenCalledTimes(1)
        expect(sendEmotionMock).toHaveBeenCalledWith('doge', 1002)
        expect(sendMsgMock).not.toHaveBeenCalled()

        module.stop()
    })

    it('does not overlap emotion sends while the previous request is still pending', async () => {
        const moduleStoreMock = moduleStoreState.current!
        let resolveSendEmotion: ((value: { code: number }) => void) | null = null

        sendEmotionMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveSendEmotion = resolve
                })
        )

        moduleStoreMock.moduleConfig.emotionSpam.enable = true
        moduleStoreMock.moduleConfig.emotionSpam.msg = ['doge', '2233']
        moduleStoreMock.moduleConfig.emotionSpam.timeInterval = 1
        moduleStoreMock.moduleConfig.emotionSpam.sequentialMode = true

        const module = new EmotionSpamModule('EmotionSpamTest')
        await module.run()

        moduleStoreMock.emitter.emit('emotionSpam', { module: 'emotionSpam' })
        await Promise.resolve()

        expect(sendEmotionMock).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(1000)
        expect(sendEmotionMock).toHaveBeenCalledTimes(1)

        resolveSendEmotion?.({ code: 0 })
        await Promise.resolve()

        module.stop()
    })
})
