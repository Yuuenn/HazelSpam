type SpamTaskKey = 'textSpam' | 'emotionSpam'

type TextSplitMode = 'byLine' | 'continuous'

type TextTabPanel = {
    key: number
    id: number
    tab: string
    msg: string
}

type MenuIndex = 'TextView' | 'EmotionView' | 'SettingView'

interface TextSpamConfig {
    enable: boolean
    sourceMode: 'single' | 'tabs'
    msg: string
    timeInterval: number
    textInterval: number
    timeLimit: number
    splitMode: TextSplitMode
    sequentialMode: boolean
    tabTimeInterval: number
    tabSplitMode: TextSplitMode
    activeTabId: number
    tabPanels: TextTabPanel[]
}

interface EmotionSpamConfig {
    enable: boolean
    timeInterval: number
    sequentialMode: boolean
    selectedPackageId: number
    msg: string[]
    timeLimit: number
}

interface SaveSpamStatusConfig {
    enable: boolean
    lastTask: SpamTaskKey | null
}

interface AutoCheckUpdateConfig {
    enable: boolean
}

interface DanmakuActionsConfig {
    enable: boolean
}

interface SettingsConfig {
    saveSpamStatus: SaveSpamStatusConfig
    autoCheckUpdate: AutoCheckUpdateConfig
    danmakuActions: DanmakuActionsConfig
}

interface ModuleConfig {
    textSpam: TextSpamConfig
    emotionSpam: EmotionSpamConfig
    settings: SettingsConfig
}

interface UiConfig {
    activeMenuIndex: MenuIndex
    isShowPanel: boolean
    isCollapsed: boolean
    theme: 'dark' | 'light'
    followBiliTheme: boolean
    syncHostThemeWithBrowser: boolean
    hideDanmakuHistoryScrollbar: boolean
}

type ModuleEventMap = {
    textSpam: {
        module: SpamTaskKey
    }
    emotionSpam: {
        module: SpamTaskKey
    }
}

export {
    AutoCheckUpdateConfig,
    DanmakuActionsConfig,
    EmotionSpamConfig,
    MenuIndex,
    ModuleConfig,
    ModuleEventMap,
    SaveSpamStatusConfig,
    SettingsConfig,
    SpamTaskKey,
    TextSplitMode,
    TextTabPanel,
    TextSpamConfig,
    UiConfig
}
