import _ from 'lodash'
import { BILIAPI } from '@/utils/bili'
import { useDiscreteAPI } from '@/utils/ui'
import { useBiliStore } from '@/stores/useBiliStore'
import BaseModule from '../BaseModule'

interface SpamConfig {
    enable: boolean
    timeInterval: number
}

interface TextRunOptions extends SpamConfig {
    textInterval: number
    splitMode: 'byLine' | 'continuous'
    sequentialMode: boolean
}

class TextSpamModule extends BaseModule {
    private textConfig = this.moduleStore.moduleConfig.textSpam
    private intervalId: NodeJS.Timeout | null = null
    private timeLimitId: NodeJS.Timeout | null = null
    private isSending = false

    private get roomId(): number | undefined {
        return useBiliStore().BilibiliLive?.ROOMID
    }

    private sliceMsg(msg: string, maxLength: number): string[] {
        if (msg.length <= maxLength) return [msg]
        return msg.match(new RegExp(`.{1,${maxLength}}`, 'g')) || []
    }

    private clampTextInterval(textInterval: number): number {
        const raw = Number.isFinite(textInterval) ? Math.floor(textInterval) : 1
        const minLimited = Math.max(raw, 1)
        const danmuLengthLimit = useBiliStore().danmuLengthLimit

        if (!danmuLengthLimit || danmuLengthLimit < 1) {
            return minLimited
        }

        return Math.min(minLimited, danmuLengthLimit)
    }

    private formatMsgsByLine(msg: string, textInterval: number): string[] {
        return msg
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => line.slice(0, textInterval))
            .filter((line) => line.length > 0)
    }

    private formatMsgsContinuously(msg: string, textInterval: number): string[] {
        const flattened = msg.replace(/\r?\n/g, '')
        return this.sliceMsg(flattened, textInterval).filter((line) => line.length > 0)
    }

    private formatTabsContinuously(textInterval: number): string[] {
        const merged = this.textConfig.tabPanels
            .map((item) => (item.msg || '').replace(/\r?\n/g, '').trim())
            .filter((msg) => msg.length > 0)
            .join(' ')

        return this.sliceMsg(merged, textInterval).filter((line) => line.length > 0)
    }

    private formatTabs(textInterval: number, splitMode: 'byLine' | 'continuous'): string[] {
        if (splitMode === 'continuous') {
            return this.formatTabsContinuously(textInterval)
        }

        return _.flatMap(this.textConfig.tabPanels, (item) => {
            if (!item.msg) return []
            return this.formatMsgsByLine(item.msg, textInterval)
        })
    }

    private formatTime(seconds: number): number {
        return seconds * 1000
    }

    private createShuffledIndexes(length: number): number[] {
        const indexes = Array.from({ length }, (_, index) => index)
        for (let i = indexes.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[indexes[i], indexes[j]] = [indexes[j], indexes[i]]
        }
        return indexes
    }

    private pickByShuffleQueue(
        msgs: string[],
        queue: number[],
        lastSentMsg: string | null
    ): string {
        if (queue.length === 0) {
            queue.push(...this.createShuffledIndexes(msgs.length))
        }

        let pickPos = 0
        if (lastSentMsg !== null && msgs[queue[0]] === lastSentMsg) {
            const altPos = queue.findIndex((messageIndex) => msgs[messageIndex] !== lastSentMsg)
            if (altPos > 0) {
                pickPos = altPos
            }
        }

        const [messageIndex] = queue.splice(pickPos, 1)
        return msgs[messageIndex] ?? msgs[0]
    }

    private cleanUp(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
        if (this.timeLimitId) {
            clearTimeout(this.timeLimitId)
            this.timeLimitId = null
        }
        this.isSending = false
    }

    private async sendMsg(message: string, roomid: number): Promise<boolean> {
        try {
            const response = await BILIAPI.sendMsg(message, roomid)
            const { notification } = useDiscreteAPI(['notification'])

            if (response.code === 0) {
                this.logger.log(`弹幕 ${message} 发送成功`, response)
                return true
            }

            this.logger.error(`弹幕 ${message} 发送失败`, response)
            notification.error({
                title: String(response.message ?? '发送失败'),
                content: `内容：${message}`,
                closable: false,
                duration: 3000
            })
            return false
        } catch (error) {
            this.logger.error(`弹幕 ${message} 发送失败`, error)
            return false
        }
    }

    private createCycleSender(
        msgs: string[],
        roomid: number,
        timeInterval: number,
        config: SpamConfig
    ): void {
        let currentIndex = 0

        const sendNext = async () => {
            if (!config.enable) {
                this.cleanUp()
                return
            }
            if (this.isSending) return
            this.isSending = true
            try {
                await this.sendMsg(msgs[currentIndex], roomid)
                currentIndex = (currentIndex + 1) % msgs.length
            } finally {
                this.isSending = false
            }
        }

        sendNext()
        this.intervalId = setInterval(sendNext, timeInterval)
    }

    private createRandomSender(
        msgs: string[],
        roomid: number,
        timeInterval: number,
        config: SpamConfig
    ): void {
        const shuffleQueue: number[] = []
        let lastSentMsg: string | null = null

        const sendNext = async () => {
            if (!config.enable) {
                this.cleanUp()
                return
            }
            if (this.isSending) return
            this.isSending = true

            try {
                const nextMsg = this.pickByShuffleQueue(msgs, shuffleQueue, lastSentMsg)
                await this.sendMsg(nextMsg, roomid)
                lastSentMsg = nextMsg
            } finally {
                this.isSending = false
            }
        }

        sendNext()
        this.intervalId = setInterval(sendNext, timeInterval)
    }

    private resolveSourceMode(): 'single' | 'tabs' {
        return this.textConfig.sourceMode === 'tabs' ? 'tabs' : 'single'
    }

    private getRunOptions(): {
        msgs: string[]
        timeInterval: number
        sequentialMode: boolean
    } {
        const textInterval = this.clampTextInterval(this.textConfig.textInterval)
        this.textConfig.textInterval = textInterval

        const sourceMode = this.resolveSourceMode()

        if (sourceMode === 'tabs') {
            const msgs = this.formatTabs(textInterval, this.textConfig.tabSplitMode)
            return {
                msgs,
                timeInterval: this.textConfig.tabTimeInterval,
                sequentialMode: this.textConfig.sequentialMode
            }
        }

        const runOptions: TextRunOptions = {
            enable: this.textConfig.enable,
            timeInterval: this.textConfig.timeInterval,
            textInterval,
            splitMode: this.textConfig.splitMode,
            sequentialMode: this.textConfig.sequentialMode
        }

        const msgs =
            runOptions.splitMode === 'continuous'
                ? this.formatMsgsContinuously(this.textConfig.msg, runOptions.textInterval)
                : this.formatMsgsByLine(this.textConfig.msg, runOptions.textInterval)

        return {
            msgs,
            timeInterval: runOptions.timeInterval,
            sequentialMode: runOptions.sequentialMode
        }
    }

    private async startTextSpam(): Promise<void> {
        this.cleanUp()
        if (!this.roomId) {
            this.textConfig.enable = false
            return
        }

        const runOptions = this.getRunOptions()
        const msgs = runOptions.msgs
        if (msgs.length === 0) {
            this.textConfig.enable = false
            return
        }

        const timeInterval = this.formatTime(runOptions.timeInterval)
        const timeLimit = this.formatTime(this.textConfig.timeLimit)

        if (runOptions.sequentialMode) {
            this.createCycleSender(msgs, this.roomId, timeInterval, this.textConfig)
        } else {
            this.createRandomSender(msgs, this.roomId, timeInterval, this.textConfig)
        }

        if (timeLimit > 0) {
            this.timeLimitId = setTimeout(() => {
                this.stop()
            }, timeLimit)
        }
    }

    public stop(): void {
        this.textConfig.enable = false
        this.cleanUp()
        this.logger.log('文字独轮车已停止')
    }

    public async run(): Promise<void> {
        this.moduleStore.emitter.off('textSpam')
        this.cleanUp()

        this.moduleStore.emitter.on('textSpam', () => this.startTextSpam())
    }
}

export default TextSpamModule
