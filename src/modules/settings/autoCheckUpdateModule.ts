import BaseModule from '../BaseModule'
import { checkUpdate } from '@/utils/checkUpdate'
import { showUpdateDialog } from '@/utils/ui/updateDialog'

class AutoCheckUpdateModule extends BaseModule {
    config = this.moduleStore.moduleConfig.settings.autoCheckUpdate

    public async checkUpdate() {
        try {
            const result = await checkUpdate()

            if (result.status === 'latest') {
                this.logger.log('当前已是最新的版本')
                return
            }

            this.logger.log(`发现新版本：${result.latestVersion}`)
            showUpdateDialog({
                version: result.latestVersion,
                changelogUrl: result.changelogUrl,
                downloadUrl: result.downloadUrl
            })
        } catch (error) {
            this.logger.warn(
                error instanceof Error
                    ? `自动检查更新失败：${error.message}`
                    : '自动检查更新失败'
            )
        }
    }

    public async run() {
        if (this.config.enable) {
            await this.checkUpdate()
        }
    }
}

export default AutoCheckUpdateModule
