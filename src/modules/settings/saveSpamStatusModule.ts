import type { SpamTaskKey } from '@/types'
import { useDiscreteAPI } from '@/utils/ui'
import BaseModule from '../BaseModule'

const spamTaskKeys = ['textSpam', 'emotionSpam'] as const

class SaveSpamStatusModule extends BaseModule {
    config = this.moduleStore.moduleConfig.settings.saveSpamStatus

    private resolveLastTask(): SpamTaskKey | null {
        if (this.config.lastTask && spamTaskKeys.includes(this.config.lastTask)) {
            return this.config.lastTask
        }

        for (const moduleName of spamTaskKeys) {
            if (this.moduleStore.moduleConfig[moduleName].enable) {
                this.config.lastTask = moduleName
                return moduleName
            }
        }

        return null
    }

    public async run() {
        if (this.config.enable) {
            this.logger.log('将自动执行上次独轮车任务')
            setTimeout(() => {
                const moduleName = this.resolveLastTask()
                if (!moduleName) return

                spamTaskKeys.forEach((name) => {
                    this.moduleStore.moduleConfig[name].enable = name === moduleName
                })

                this.moduleStore.emitter.emit(moduleName, { module: moduleName })

                const { notification } = useDiscreteAPI(['notification'])
                notification.info({
                    title: '已自动发车',
                    content: '功能开关位于 全局设置 - 打开直播间后自动发车',
                    closable: false,
                    duration: 6e3
                })
            }, 200)
        } else {
            this.moduleStore.moduleConfig.textSpam.enable = false
            this.moduleStore.moduleConfig.emotionSpam.enable = false
        }
    }
}

export default SaveSpamStatusModule
