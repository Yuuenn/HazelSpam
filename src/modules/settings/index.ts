import DanmakuActionsModule from './danmaku/danmakuActionsModule'
import AutoCheckUpdateModule from './autoCheckUpdateModule'
import SaveSpamStatusModule from './saveSpamStatusModule'

export const settingsModuleConstructors = [
    DanmakuActionsModule,
    AutoCheckUpdateModule,
    SaveSpamStatusModule
] as const
