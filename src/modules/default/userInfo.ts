import { BILIAPI } from '@/utils/bili'
import { storageDefaultValues } from '@/utils/storage/schema'
import { useBiliStore } from '../../stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { unsafeWindow } from '$'
import BaseModule from '../BaseModule'
import { BiliAPIResponse } from '@/types'

class UserInfoModule extends BaseModule {
    private async getLoginInfo() {
        try {
            const response = await BILIAPI.nav()
            if (response.code === 0) {
                this.logger.log('LoginInfo', response)
                return Promise.resolve(response.data)
            } else {
                this.logger.error('获取登陆信息出错', response.message)
                return Promise.reject(response.message)
            }
        } catch (error) {
            this.logger.error('获取登陆信息出错', error)
            return Promise.reject(error)
        }
    }

    private getWindowBiliLive(): Promise<Window['BilibiliLive']> {
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                const windowBiliLive = unsafeWindow.BilibiliLive
                if (windowBiliLive) {
                    clearInterval(timer)
                    this.logger.log('windowBiliLive', windowBiliLive)
                    resolve(windowBiliLive)
                }
            }, 200)
        })
    }

    private async getEmotionData() {
        const roomID = useBiliStore().BilibiliLive?.ROOMID
        if (!roomID) {
            this.logger.error('获取用户信息出错', 'roomID 不存在')
            return Promise.reject('roomID 不存在')
        }
        const EmotionData: BiliAPIResponse.GetEmoticons.EmoticonPackage[] = []
        try {
            const response = await BILIAPI.getEmoticons('pc', roomID)
            if (response.code === 0) {
                this.logger.log('EmotionData', response)
                EmotionData.push(...response.data.data)
                return Promise.resolve(EmotionData)
            } else {
                this.logger.error('获取表情包出错', response.message)
                return Promise.reject(response.message)
            }
        } catch (error) {
            this.logger.error('获取表情包出错', error)
            return Promise.reject(error)
        }
    }

    private async getInfoByUser() {
        const roomID = useBiliStore().BilibiliLive?.ROOMID
        if (!roomID) {
            this.logger.error('获取用户信息出错', 'roomID 不存在')
            return Promise.reject('roomID 不存在')
        }
        try {
            const response = await BILIAPI.getInfoByUser(roomID)
            if (response.code === 0) {
                this.logger.log('infoByuser', response)
                return Promise.resolve(response.data)
            } else {
                this.logger.error('获取用户信息出错', response.message)
                return Promise.reject(response.message)
            }
        } catch (error) {
            this.logger.error('获取用户信息出错', error)
            return Promise.reject(error)
        }
    }

    private async getRoomAnchorName(): Promise<string> {
        const roomID = useBiliStore().BilibiliLive?.ROOMID
        if (!roomID) {
            this.logger.warn('获取主播昵称失败', 'roomID 不存在')
            return ''
        }

        try {
            const response = await BILIAPI.getInfoByRoom(roomID)
            if (response.code !== 0) {
                this.logger.warn('获取主播昵称失败', response.message)
                return ''
            }

            const anchorName =
                response.data.anchor_info?.base_info?.uname?.trim() ||
                response.data.room_info?.uname?.trim() ||
                ''

            if (anchorName) {
                this.logger.log('roomAnchorName', anchorName)
            } else {
                this.logger.warn('获取主播昵称失败', '接口返回中未包含有效主播昵称')
            }

            return anchorName
        } catch (error) {
            this.logger.warn('获取主播昵称失败', error)
            return ''
        }
    }

    private syncTextIntervalWithDanmuLimit(limit: number | null): void {
        if (!limit || limit < 1) {
            return
        }

        const moduleStore = useModuleStore()
        const currentInterval = moduleStore.moduleConfig.textSpam.textInterval
        const defaultInterval = storageDefaultValues.modules.textSpam.textInterval

        if (currentInterval === defaultInterval || currentInterval < 1 || currentInterval > limit) {
            moduleStore.moduleConfig.textSpam.textInterval = limit
        }
    }

    public async run(): Promise<void> {
        const biliStore = useBiliStore()

        biliStore.BilibiliLive = await this.getWindowBiliLive()
        if (biliStore.BilibiliLive) {
            biliStore.emotionData = await this.getEmotionData()
        }
        biliStore.roomAnchorName = await this.getRoomAnchorName()

        biliStore.loginInfo = await this.getLoginInfo()
        biliStore.infoByuser = await this.getInfoByUser()

        const danmuLengthLimit = biliStore.infoByuser?.property.danmu.length ?? null
        biliStore.danmuLengthLimit = danmuLengthLimit
        this.syncTextIntervalWithDanmuLimit(danmuLengthLimit)
    }
}

export default UserInfoModule
