import mitt from 'mitt'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeModuleConfig } from '@/utils/storage/schema'

const {
    sendMsgMock,
    notificationSuccessMock,
    notificationErrorMock,
    messageErrorMock,
    clipboardWriteTextMock,
    moduleStoreState,
    biliStoreState
} = vi.hoisted(() => ({
    sendMsgMock: vi.fn(),
    notificationSuccessMock: vi.fn(),
    notificationErrorMock: vi.fn(),
    messageErrorMock: vi.fn(),
    clipboardWriteTextMock: vi.fn(),
    moduleStoreState: {
        current: null as {
            moduleConfig: ReturnType<typeof sanitizeModuleConfig>
            emitter: ReturnType<typeof mitt>
        } | null
    },
    biliStoreState: {
        current: null as {
            BilibiliLive: { ROOMID: number } | null
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

vi.mock('@/utils/dom', () => ({
    dq: vi.fn(() => null)
}))

vi.mock('@/utils/ui', () => ({
    useDiscreteAPI: () => ({
        notification: {
            success: notificationSuccessMock,
            error: notificationErrorMock
        },
        message: {
            error: messageErrorMock
        }
    })
}))

import DanmakuActionsModule from '@/modules/settings/danmaku/danmakuActionsModule'

interface DanmakuActionPayload {
    displayContent: string
    sendContent: string
    replyMid: number
    replyAttr: number
    replyUname: string
    replayDmid: string
}

interface DanmakuActionsModuleTestAccess {
    createDanmakuActionPayload(node: DanmakuNodeMock): DanmakuActionPayload | null
    dmCopy(msg: string): Promise<void>
    dmRepeat(sourceNode: HTMLElement | null, payload: DanmakuActionPayload): Promise<void>
}

interface DanmakuMentionElementMock {
    dataset: {
        uid: string
        uname: string
        mystery?: string
    }
    textContent: string
}

interface DanmakuMessageElementMock {
    textContent: string
    dataset?: {
        danmaku?: string
        replymid?: string
        replyMid?: string
        id_str?: string
        idStr?: string
    }
    querySelector: (selector: string) => DanmakuMentionElementMock | null
}

interface DanmakuNodeMock {
    dataset: {
        danmaku?: string
        replymid?: string
        replyMid?: string
        uname?: string
        mystery?: string
        id_str?: string
        idStr?: string
    }
    querySelector: (selector: string) => DanmakuMessageElementMock | null
}

const flushMicrotasks = async () => {
    await Promise.resolve()
    await Promise.resolve()
}

const createAtDanmakuItem = (): DanmakuNodeMock => {
    const mentionElement: DanmakuMentionElementMock = {
        dataset: {
            uid: '12806130',
            uname: '大有人在',
            mystery: 'false'
        },
        textContent: '@大有人在'
    }

    const messageElement: DanmakuMessageElementMock = {
        textContent: '@大有人在  测试',
        querySelector: vi.fn(() => mentionElement)
    }

    return {
        dataset: {
            danmaku: ' 测试',
            replymid: '12806130',
            uname: '遊园',
            mystery: 'false',
            id_str: '10b70e1bebfa62af5d49eb500a69c6232288'
        },
        querySelector: vi.fn((selector: string) =>
            selector === '.danmaku-item-right' ? messageElement : null
        )
    }
}

const createAtDanmakuItemWithMessageDataset = (): DanmakuNodeMock => {
    const mentionElement: DanmakuMentionElementMock = {
        dataset: {
            uid: '12806130',
            uname: '大有人在',
            mystery: 'false'
        },
        textContent: '@大有人在'
    }

    const messageElement: DanmakuMessageElementMock = {
        textContent: '@大有人在  测试',
        dataset: {
            danmaku: ' 测试',
            replymid: '12806130',
            id_str: '10b70e1bebfa62af5d49eb500a69c6232288'
        },
        querySelector: vi.fn(() => mentionElement)
    }

    return {
        dataset: {
            danmaku: '',
            replymid: '0',
            uname: '遊园',
            mystery: 'false'
        },
        querySelector: vi.fn((selector: string) =>
            selector === '.danmaku-item-right' ? messageElement : null
        )
    }
}

const createAtOnlyDanmakuItem = (): DanmakuNodeMock => {
    const mentionElement: DanmakuMentionElementMock = {
        dataset: {
            uid: '12806130',
            uname: '大有人在',
            mystery: 'false'
        },
        textContent: '@大有人在'
    }

    const messageElement: DanmakuMessageElementMock = {
        textContent: '@大有人在',
        querySelector: vi.fn(() => mentionElement)
    }

    return {
        dataset: {
            danmaku: ' ',
            replymid: '12806130',
            uname: '遊园',
            mystery: 'false',
            id_str: '10b70e1bebfa62af5d49eb500a69c6232288'
        },
        querySelector: vi.fn((selector: string) =>
            selector === '.danmaku-item-right' ? messageElement : null
        )
    }
}

describe('DanmakuActionsModule', () => {
    beforeEach(() => {
        sendMsgMock.mockResolvedValue({ code: 0 })
        notificationSuccessMock.mockReset()
        notificationErrorMock.mockReset()
        messageErrorMock.mockReset()
        clipboardWriteTextMock.mockReset()
        clipboardWriteTextMock.mockResolvedValue(undefined)

        moduleStoreState.current = {
            moduleConfig: sanitizeModuleConfig({}),
            emitter: mitt()
        }
        biliStoreState.current = {
            BilibiliLive: { ROOMID: 1001 }
        }

        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: clipboardWriteTextMock
            }
        })
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0)
            return 1
        })
        vi.stubGlobal('cancelAnimationFrame', vi.fn())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('copies visible @ text instead of truncated dataset.danmaku', async () => {
        const node = createAtDanmakuItem()
        const module = new DanmakuActionsModule('DanmakuActionsTest')
        const access = module as unknown as DanmakuActionsModuleTestAccess

        const payload = access.createDanmakuActionPayload(node)
        expect(payload).toMatchObject({
            displayContent: '@大有人在  测试',
            sendContent: ' 测试',
            replyMid: 12806130,
            replyAttr: 0,
            replyUname: '大有人在',
            replayDmid: '10b70e1bebfa62af5d49eb500a69c6232288'
        })

        await access.dmCopy(payload!.displayContent)
        await flushMicrotasks()

        expect(clipboardWriteTextMock).toHaveBeenCalledWith('@大有人在  测试')
    })

    it('sends +1 as structured @ payload instead of plain @ string', async () => {
        const node = createAtDanmakuItem()
        const module = new DanmakuActionsModule('DanmakuActionsTest')
        const access = module as unknown as DanmakuActionsModuleTestAccess

        const payload = access.createDanmakuActionPayload(node)
        expect(payload).not.toBeNull()

        await access.dmRepeat(null, payload!)
        await flushMicrotasks()

        expect(sendMsgMock).toHaveBeenCalledWith(
            ' 测试',
            1001,
            0,
            16777215,
            1,
            0,
            0,
            12806130,
            0,
            '10b70e1bebfa62af5d49eb500a69c6232288',
            { appId: 100, platform: 5 },
            0,
            ''
        )
    })

    it('does not send structured @ when the message has no extra body text', async () => {
        const node = createAtOnlyDanmakuItem()

        const module = new DanmakuActionsModule('DanmakuActionsTest')
        const access = module as unknown as DanmakuActionsModuleTestAccess
        const payload = access.createDanmakuActionPayload(node)

        expect(payload).toMatchObject({
            displayContent: '@大有人在',
            sendContent: '',
            replyMid: 12806130
        })

        await access.dmRepeat(null, payload!)
        await flushMicrotasks()

        expect(sendMsgMock).not.toHaveBeenCalled()
    })

    it('supports reply metadata living on .danmaku-item-right dataset', () => {
        const node = createAtDanmakuItemWithMessageDataset()
        const module = new DanmakuActionsModule('DanmakuActionsTest')
        const access = module as unknown as DanmakuActionsModuleTestAccess

        const payload = access.createDanmakuActionPayload(node)
        expect(payload).toMatchObject({
            displayContent: '@大有人在  测试',
            sendContent: ' 测试',
            replyMid: 12806130,
            replyAttr: 0,
            replyUname: '大有人在',
            replayDmid: '10b70e1bebfa62af5d49eb500a69c6232288'
        })
    })

    it('uses the native composer flow for structured @ when the host input is available', async () => {
        class MockTextarea {
            private internalValue = ''
            dispatchEvent = vi.fn((event: { type?: string }) => {
                if (event.type === 'input' || event.type === 'change') {
                    panelVm.chatInput = this.internalValue
                }
                return true
            })

            get value() {
                return this.internalValue
            }

            set value(next: string) {
                this.internalValue = next
            }
        }

        const textarea = new MockTextarea()
        const panelVm = {
            atUserName: '',
            tempAtUserName: '',
            atUid: 0,
            atReplyDmId: '',
            atIsMystery: false,
            chatInput: '',
            clearAtInfo: vi.fn(() => {
                panelVm.atUserName = ''
                panelVm.tempAtUserName = ''
                panelVm.atUid = 0
                panelVm.atReplyDmId = ''
                panelVm.atIsMystery = false
            })
        }
        const sendButton = {
            disabled: false,
            textContent: '发送',
            click: vi.fn()
        }
        let submittedValue = ''
        sendButton.click.mockImplementation(() => {
            submittedValue = textarea.value
            textarea.value = ''
        })

        vi.stubGlobal(
            'Event',
            class EventMock {
                type: string

                constructor(type: string) {
                    this.type = type
                }
            }
        )
        vi.stubGlobal('HTMLTextAreaElement', MockTextarea)
        vi.stubGlobal('document', {
            querySelector: vi.fn((selector: string) => {
                if (selector === '.chat-input-ctnr textarea.chat-input') {
                    return textarea
                }
                if (selector === '.chat-control-panel') {
                    return { __vue__: panelVm }
                }
                return null
            }),
            querySelectorAll: vi.fn((selector: string) => {
                if (selector === '.control-panel-ctnr button') {
                    return [sendButton]
                }
                return []
            })
        })
        vi.stubGlobal('window', globalThis)

        textarea.value = '原草稿'
        panelVm.chatInput = '原草稿'

        const module = new DanmakuActionsModule('DanmakuActionsTest')
        const access = module as unknown as DanmakuActionsModuleTestAccess

        await access.dmRepeat(null, {
            displayContent: '@大有人在 测试',
            sendContent: '测试',
            replyMid: 12806130,
            replyAttr: 0,
            replyUname: '大有人在',
            replayDmid: '10b70e1bebfa62af5d49eb500a69c6232288'
        })

        await new Promise((resolve) => setTimeout(resolve, 200))
        await flushMicrotasks()

        expect(submittedValue).toBe('@大有人在 测试')
        expect(textarea.value).toBe('原草稿')
        expect(panelVm.atUid).toBe(0)
        expect(panelVm.atReplyDmId).toBe('')
        expect(sendMsgMock).not.toHaveBeenCalled()
    })
})
