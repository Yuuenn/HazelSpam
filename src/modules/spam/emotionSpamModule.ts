import { BILIAPI } from '@/utils/bili'
import { useDiscreteAPI } from '@/utils/ui'
import { useBiliStore } from '@/stores/useBiliStore'
import BaseModule from '../BaseModule'

const GENERAL_EMOJI_PACKAGE_ID = 100

class EmotionSpamModule extends BaseModule {
    config = this.moduleStore.moduleConfig.emotionSpam
    private intervalId: NodeJS.Timeout | null = null
    private timeLimitId: NodeJS.Timeout | null = null
    private generalEmojiTextMap: Map<string, string> = new Map()

    private formatTime(time: number): number {
        return time * 1000
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
    }

    private buildGeneralEmojiTextMap(): Map<string, string> {
        const map = new Map<string, string>()
        const generalEmojiPackage = useBiliStore().emotionData.find(
            (pkg) => pkg.pkg_id === GENERAL_EMOJI_PACKAGE_ID
        )

        if (!generalEmojiPackage) {
            return map
        }

        generalEmojiPackage.emoticons.forEach((item) => {
            const unique = String(item.emoticon_unique || '').trim()
            const emojiText = String(item.emoji || '').trim()
            if (!unique || !emojiText) {
                return
            }
            map.set(unique, emojiText)
        })

        return map
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
        emotions: string[],
        queue: number[],
        lastSentEmotion: string | null
    ): string {
        if (queue.length === 0) {
            queue.push(...this.createShuffledIndexes(emotions.length))
        }

        let pickPos = 0
        if (lastSentEmotion !== null && emotions[queue[0]] === lastSentEmotion) {
            const altPos = queue.findIndex((index) => emotions[index] !== lastSentEmotion)
            if (altPos > 0) {
                pickPos = altPos
            }
        }

        const [emotionIndex] = queue.splice(pickPos, 1)
        return emotions[emotionIndex] ?? emotions[0]
    }

    private async sendEmotion(emotion: string, roomid: number): Promise<void> {
        const textPayload = this.generalEmojiTextMap.get(emotion)
        const sendAsText = Boolean(textPayload)
        const payload = textPayload ?? emotion
        const payloadType = sendAsText ? '文字' : '表情'

        try {
            const response = sendAsText
                ? await BILIAPI.sendMsg(payload, roomid)
                : await BILIAPI.sendEmotion(payload, roomid)
            const { notification } = useDiscreteAPI(['notification'])

            if (response.code === 0) {
                this.logger.log(`${payloadType} ${payload} 发送成功`, response)
            } else {
                this.logger.error(`${payloadType} ${payload} 发送失败`, response)
                notification.error({
                    closable: false,
                    content: `${payloadType}"${payload}"发送失败: ${response.message}`,
                    duration: 3000
                })
            }
        } catch (error) {
            this.logger.error(`${payloadType} ${payload} 发送失败`, error)
        }
    }

    private createSequentialSender(emotions: string[], roomid: number, timeInterval: number): void {
        let currentIndex = 0

        const sendNextEmotion = async () => {
            if (!this.config.enable) {
                this.cleanUp()
                return
            }

            await this.sendEmotion(emotions[currentIndex], roomid)
            currentIndex = (currentIndex + 1) % emotions.length
        }

        sendNextEmotion()
        this.intervalId = setInterval(sendNextEmotion, timeInterval)
    }

    private createRandomSender(emotions: string[], roomid: number, timeInterval: number): void {
        const shuffleQueue: number[] = []
        let lastSentEmotion: string | null = null

        const sendNextEmotion = async () => {
            if (!this.config.enable) {
                this.cleanUp()
                return
            }

            const emotion = this.pickByShuffleQueue(emotions, shuffleQueue, lastSentEmotion)
            await this.sendEmotion(emotion, roomid)
            lastSentEmotion = emotion
        }

        sendNextEmotion()
        this.intervalId = setInterval(sendNextEmotion, timeInterval)
    }

    private startAutoStop(timeLimit: number): void {
        if (timeLimit <= 0) {
            return
        }

        this.timeLimitId = setTimeout(() => {
            this.stop()
        }, timeLimit)
    }

    private async startEmotionSpam(): Promise<void> {
        this.cleanUp()

        const emotions = this.config.msg
        if (emotions.length === 0) {
            this.config.enable = false
            return
        }

        const roomid = useBiliStore().BilibiliLive?.ROOMID
        if (!roomid) {
            this.config.enable = false
            return
        }
        this.generalEmojiTextMap = this.buildGeneralEmojiTextMap()

        const formattedInterval = this.formatTime(this.config.timeInterval)
        const formattedTimeLimit = this.formatTime(this.config.timeLimit)

        if (this.config.sequentialMode) {
            this.createSequentialSender(emotions, roomid, formattedInterval)
        } else {
            this.createRandomSender(emotions, roomid, formattedInterval)
        }

        this.startAutoStop(formattedTimeLimit)
    }

    public stop(): void {
        this.config.enable = false
        this.cleanUp()
        this.logger.log('表情独轮车已停止')
    }

    public async run(): Promise<void> {
        this.moduleStore.emitter.off('emotionSpam')
        this.cleanUp()
        this.moduleStore.emitter.on('emotionSpam', () => this.startEmotionSpam())
    }
}

export default EmotionSpamModule
