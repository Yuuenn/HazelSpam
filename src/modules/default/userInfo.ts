import { BILIAPI } from '@/utils/bili'
import { storageDefaultValues } from '@/utils/storage/schema'
import { useBiliStore } from '../../stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { unsafeWindow } from '$'
import BaseModule from '../BaseModule'
import { BiliAPIResponse } from '@/types'

const WINDOW_BILIBILI_LIVE_POLL_INTERVAL_MS = 200
const WINDOW_BILIBILI_LIVE_TIMEOUT_MS = 5000

class UserInfoModule extends BaseModule {
    private hasValidRoomId(windowBiliLive: Window['BilibiliLive'] | null | undefined): boolean {
        return Boolean(
            windowBiliLive && typeof windowBiliLive.ROOMID === 'number' && windowBiliLive.ROOMID > 0
        )
    }

    private async getLoginInfo(): Promise<BiliAPIResponse.Nav.Data | null> {
        try {
            const response = await BILIAPI.nav()
            if (response.code === 0) {
                this.logger.log('LoginInfo', response)
                return response.data
            } else {
                this.logger.warn('获取登陆信息失败', response.message)
                return null
            }
        } catch (error) {
            this.logger.warn('获取登陆信息失败', error)
            return null
        }
    }

    private getWindowBiliLive(): Promise<Window['BilibiliLive'] | null> {
        return new Promise((resolve) => {
            const timer = globalThis.setInterval(() => {
                const windowBiliLive = unsafeWindow.BilibiliLive
                if (this.hasValidRoomId(windowBiliLive)) {
                    globalThis.clearInterval(timer)
                    globalThis.clearTimeout(timeoutTimer)
                    this.logger.log('windowBiliLive', windowBiliLive)
                    resolve(windowBiliLive)
                }
            }, WINDOW_BILIBILI_LIVE_POLL_INTERVAL_MS)

            const timeoutTimer = globalThis.setTimeout(() => {
                globalThis.clearInterval(timer)
                this.logger.warn(
                    '获取房间上下文失败',
                    '在限定时间内未发现带有效 ROOMID 的 window.BilibiliLive'
                )
                resolve(null)
            }, WINDOW_BILIBILI_LIVE_TIMEOUT_MS)
        })
    }

    private async getEmotionData(): Promise<BiliAPIResponse.GetEmoticons.EmoticonPackage[]> {
        const roomID = useBiliStore().bilibiliLive?.ROOMID
        if (!roomID) {
            this.logger.warn('获取表情包失败', 'roomID 不存在')
            return []
        }

        try {
            const response = await BILIAPI.getEmoticons('pc', roomID)
            if (response.code === 0) {
                this.logger.log('EmotionData', response)
                return [...response.data.data]
            } else {
                this.logger.warn('获取表情包失败', response.message)
                return []
            }
        } catch (error) {
            this.logger.warn('获取表情包失败', error)
            return []
        }
    }

    private async getInfoByUser(): Promise<BiliAPIResponse.GetInfoByUser.Data | null> {
        const roomID = useBiliStore().bilibiliLive?.ROOMID
        if (!roomID) {
            this.logger.warn('获取用户信息失败', 'roomID 不存在')
            return null
        }

        try {
            const response = await BILIAPI.getInfoByUser(roomID)
            if (response.code === 0) {
                this.logger.log('infoByUser', response)
                return response.data
            } else {
                this.logger.warn('获取用户信息失败', response.message)
                return null
            }
        } catch (error) {
            this.logger.warn('获取用户信息失败', error)
            return null
        }
    }

    private async getRoomAnchorName(): Promise<string> {
        const roomID = useBiliStore().bilibiliLive?.ROOMID
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

    private syncTextIntervalWithDanmakuLimit(limit: number | null): void {
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

        biliStore.bilibiliLive = await this.getWindowBiliLive()
        if (biliStore.bilibiliLive) {
            biliStore.emotionData = await this.getEmotionData()
        }
        biliStore.loginInfo = await this.getLoginInfo()
        biliStore.roomAnchorName = await this.getRoomAnchorName()
        biliStore.infoByUser = await this.getInfoByUser()

        const danmakuLengthLimit = biliStore.infoByUser?.property.danmu.length ?? null
        biliStore.danmakuLengthLimit = danmakuLengthLimit
        this.syncTextIntervalWithDanmakuLimit(danmakuLengthLimit)
    }
}

export default UserInfoModule
