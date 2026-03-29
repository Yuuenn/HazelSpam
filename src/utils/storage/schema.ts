import _ from 'lodash'
import type {
    MenuIndex,
    ModuleConfig,
    SpamTaskKey,
    TextSplitMode,
    TextTabPanel,
    TextSpamConfig,
    UiConfig
} from '@/types'
import { normalizeSubmittedText, pickRandomTextFallback } from '@/utils/textFallback'

export type TextTabsSnapshot = {
    activeTabId: number
    tabPanels: TextTabPanel[]
}

type StorageDefaultValues = {
    ui: UiConfig
    modules: ModuleConfig
}

const MENU_INDEXES: readonly MenuIndex[] = ['TextView', 'EmotionView', 'CrybabyView', 'SettingView']
const UI_THEMES: readonly UiConfig['theme'][] = ['dark', 'light']
const TEXT_SPLIT_MODES: readonly TextSplitMode[] = ['byLine', 'continuous']
const defaultTextMessage = pickRandomTextFallback()

export const storageDefaultValues: StorageDefaultValues = {
    ui: {
        activeMenuIndex: 'TextView',
        isShowPanel: false,
        isCollapsed: true,
        theme: 'light',
        followBiliTheme: true,
        syncHostThemeWithBrowser: true,
        hideDanmakuHistoryScrollbar: true
    },
    modules: {
        textSpam: {
            // Keep single/tabs default text consistent for first-time users.
            msg: defaultTextMessage,
            enable: false,
            sourceMode: 'single',
            timeInterval: 5,
            textInterval: 20,
            timeLimit: 0,
            splitMode: 'byLine',
            sequentialMode: true,
            tabTimeInterval: 5,
            tabSplitMode: 'byLine',
            activeTabId: 1,
            tabPanels: [
                {
                    key: 1,
                    id: 1,
                    tab: '独轮车文本',
                    msg: defaultTextMessage
                }
            ]
        },
        emotionSpam: {
            enable: false,
            timeInterval: 5,
            sequentialMode: true,
            selectedPackageId: 1,
            msg: [],
            timeLimit: 0
        },
        settings: {
            saveSpamStatus: {
                enable: false,
                lastTask: null
            },
            autoCheckUpdate: {
                enable: true
            },
            danmakuActions: {
                enable: false,
                crybabyEnabled: false
            }
        }
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const cloneTextTabPanel = (panel: TextTabPanel): TextTabPanel => ({
    ...panel
})

export const cloneTextTabPanels = (panels: readonly TextTabPanel[]): TextTabPanel[] =>
    panels.map(cloneTextTabPanel)

export const cloneUiConfig = (uiConfig: UiConfig): UiConfig => ({
    ...uiConfig
})

export const cloneModuleConfig = (moduleConfig: ModuleConfig): ModuleConfig => ({
    textSpam: {
        ...moduleConfig.textSpam,
        tabPanels: cloneTextTabPanels(moduleConfig.textSpam.tabPanels)
    },
    emotionSpam: {
        ...moduleConfig.emotionSpam,
        msg: [...moduleConfig.emotionSpam.msg]
    },
    settings: {
        saveSpamStatus: { ...moduleConfig.settings.saveSpamStatus },
        autoCheckUpdate: { ...moduleConfig.settings.autoCheckUpdate },
        danmakuActions: { ...moduleConfig.settings.danmakuActions }
    }
})

export const isUiConfigLike = (value: unknown) => {
    if (!isRecord(value)) return false
    return (
        'activeMenuIndex' in value &&
        'isShowPanel' in value &&
        'isCollapsed' in value &&
        'theme' in value &&
        'followBiliTheme' in value
    )
}

export const isModuleConfigLike = (value: unknown) => {
    if (!isRecord(value)) return false
    return 'textSpam' in value && 'emotionSpam' in value && 'settings' in value
}

const mergeConfigs = <T>(currentConfigItem: unknown, defaultConfigItem: T): T => {
    if (!_.isPlainObject(defaultConfigItem)) {
        return _.cloneDeep(
            currentConfigItem !== undefined ? currentConfigItem : defaultConfigItem
        ) as T
    }

    const source = _.isPlainObject(currentConfigItem) ? currentConfigItem : {}
    const defaultRecord = defaultConfigItem as Record<string, unknown>
    const cleanConfig = _.pick(source, Object.keys(defaultRecord))
    const result: Record<string, unknown> = {}

    Object.keys(defaultRecord).forEach((key) => {
        const defaultValue = defaultRecord[key]
        const currentValue = (cleanConfig as Record<string, unknown>)[key]

        if (_.isPlainObject(defaultValue)) {
            result[key] = mergeConfigs(currentValue, defaultValue)
            return
        }

        result[key] = _.cloneDeep(currentValue !== undefined ? currentValue : defaultValue)
    })

    return _.omitBy(result, _.isUndefined) as T
}

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback

const normalizeMenuIndex = (value: unknown, fallback: MenuIndex): MenuIndex =>
    MENU_INDEXES.includes(value as MenuIndex) ? (value as MenuIndex) : fallback

const normalizeTheme = (value: unknown, fallback: UiConfig['theme']): UiConfig['theme'] =>
    UI_THEMES.includes(value as UiConfig['theme']) ? (value as UiConfig['theme']) : fallback

const normalizeTextSourceMode = (
    value: unknown,
    fallback: TextSpamConfig['sourceMode']
): TextSpamConfig['sourceMode'] => {
    return value === 'single' || value === 'tabs' ? value : fallback
}

const normalizeTextSplitMode = (value: unknown, fallback: TextSplitMode): TextSplitMode => {
    return TEXT_SPLIT_MODES.includes(value as TextSplitMode) ? (value as TextSplitMode) : fallback
}

export const normalizeSpamTaskKey = (value: unknown): SpamTaskKey | null => {
    return value === 'textSpam' || value === 'emotionSpam' ? value : null
}

const normalizePositiveNumber = (value: unknown, fallback: number): number => {
    const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback
    return Math.max(candidate, 1)
}

const normalizeNonNegativeNumber = (value: unknown, fallback: number): number => {
    const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback
    return Math.max(candidate, 0)
}

export const normalizeTextTabPanels = (panels: unknown): TextTabPanel[] => {
    const fallbackPanels = cloneTextTabPanels(storageDefaultValues.modules.textSpam.tabPanels).map(
        (panel) => ({
            ...panel,
            msg: normalizeSubmittedText(panel.msg)
        })
    )

    if (!Array.isArray(panels)) {
        return fallbackPanels
    }

    const normalizedPanels = panels
        .filter((panel): panel is Record<string, unknown> => isRecord(panel))
        .map((panel, index) => {
            const defaultLabel = `标签页 ${index + 1}`
            const key = Number(panel.key)
            const id = Number(panel.id)
            const tab = typeof panel.tab === 'string' ? panel.tab.trim() : defaultLabel

            return {
                key: Number.isFinite(key) ? key : index + 1,
                id: Number.isFinite(id) ? id : index + 1,
                tab: tab || defaultLabel,
                msg: normalizeSubmittedText(panel.msg)
            }
        })

    if (normalizedPanels.length === 0) {
        return fallbackPanels
    }

    const dedupedIds = new Set<number>()
    const dedupedKeys = new Set<number>()
    let nextIdSeed = Math.max(0, ...normalizedPanels.map((panel) => panel.id))
    let nextKeySeed = Math.max(0, ...normalizedPanels.map((panel) => panel.key))

    return normalizedPanels.map((panel, index) => {
        let nextId = panel.id
        while (dedupedIds.has(nextId)) {
            nextIdSeed += 1
            nextId = nextIdSeed
        }
        dedupedIds.add(nextId)

        let nextKey = panel.key
        while (dedupedKeys.has(nextKey)) {
            nextKeySeed += 1
            nextKey = nextKeySeed
        }
        dedupedKeys.add(nextKey)

        return {
            key: nextKey,
            id: nextId,
            tab: panel.tab || `标签页 ${index + 1}`,
            msg: normalizeSubmittedText(panel.msg)
        }
    })
}

export const normalizeTextTabsSnapshot = (raw: unknown): TextTabsSnapshot => {
    const source = isRecord(raw) ? raw : {}
    const tabPanels = normalizeTextTabPanels(source.tabPanels)
    const activeIdCandidate = Number(source.activeTabId)
    const activeTabId = tabPanels.some((panel) => panel.id === activeIdCandidate)
        ? activeIdCandidate
        : tabPanels[0].id

    return {
        activeTabId,
        tabPanels
    }
}

export const sanitizeUiConfig = (raw: unknown): UiConfig => {
    const mergedUiConfig = mergeConfigs(raw, storageDefaultValues.ui)

    return {
        activeMenuIndex: normalizeMenuIndex(
            mergedUiConfig.activeMenuIndex,
            storageDefaultValues.ui.activeMenuIndex
        ),
        isShowPanel: normalizeBoolean(
            mergedUiConfig.isShowPanel,
            storageDefaultValues.ui.isShowPanel
        ),
        isCollapsed: normalizeBoolean(
            mergedUiConfig.isCollapsed,
            storageDefaultValues.ui.isCollapsed
        ),
        theme: normalizeTheme(mergedUiConfig.theme, storageDefaultValues.ui.theme),
        followBiliTheme: normalizeBoolean(
            mergedUiConfig.followBiliTheme,
            storageDefaultValues.ui.followBiliTheme
        ),
        syncHostThemeWithBrowser: normalizeBoolean(
            mergedUiConfig.syncHostThemeWithBrowser,
            storageDefaultValues.ui.syncHostThemeWithBrowser
        ),
        hideDanmakuHistoryScrollbar: normalizeBoolean(
            mergedUiConfig.hideDanmakuHistoryScrollbar,
            storageDefaultValues.ui.hideDanmakuHistoryScrollbar
        )
    }
}

export const sanitizeModuleConfig = (raw: unknown): ModuleConfig => {
    const currentModuleConfig = isRecord(raw) ? raw : {}
    const mergedModuleConfig = mergeConfigs(currentModuleConfig, storageDefaultValues.modules)

    const textDefaults = storageDefaultValues.modules.textSpam
    const textSnapshot = normalizeTextTabsSnapshot(mergedModuleConfig.textSpam)
    const timeInterval = normalizePositiveNumber(
        mergedModuleConfig.textSpam.timeInterval,
        textDefaults.timeInterval
    )
    const activeTab = textSnapshot.tabPanels.find((panel) => panel.id === textSnapshot.activeTabId)

    const emotionDefaults = storageDefaultValues.modules.emotionSpam
    const normalizedEmotionMsg = Array.isArray(mergedModuleConfig.emotionSpam.msg)
        ? mergedModuleConfig.emotionSpam.msg
              .map((item) => String(item))
              .filter((item) => item.trim().length > 0)
        : [...emotionDefaults.msg]

    return {
        textSpam: {
            enable: normalizeBoolean(mergedModuleConfig.textSpam.enable, textDefaults.enable),
            sourceMode: normalizeTextSourceMode(
                mergedModuleConfig.textSpam.sourceMode,
                textDefaults.sourceMode
            ),
            msg: normalizeSubmittedText(activeTab?.msg ?? mergedModuleConfig.textSpam.msg),
            timeInterval,
            textInterval: normalizePositiveNumber(
                mergedModuleConfig.textSpam.textInterval,
                textDefaults.textInterval
            ),
            timeLimit: normalizeNonNegativeNumber(
                mergedModuleConfig.textSpam.timeLimit,
                textDefaults.timeLimit
            ),
            splitMode: normalizeTextSplitMode(
                mergedModuleConfig.textSpam.splitMode,
                textDefaults.splitMode
            ),
            sequentialMode: normalizeBoolean(
                mergedModuleConfig.textSpam.sequentialMode,
                textDefaults.sequentialMode
            ),
            tabTimeInterval: normalizePositiveNumber(
                mergedModuleConfig.textSpam.tabTimeInterval,
                timeInterval
            ),
            tabSplitMode: normalizeTextSplitMode(
                mergedModuleConfig.textSpam.tabSplitMode,
                textDefaults.tabSplitMode
            ),
            activeTabId: textSnapshot.activeTabId,
            tabPanels: textSnapshot.tabPanels
        },
        emotionSpam: {
            enable: normalizeBoolean(mergedModuleConfig.emotionSpam.enable, emotionDefaults.enable),
            timeInterval: normalizePositiveNumber(
                mergedModuleConfig.emotionSpam.timeInterval,
                emotionDefaults.timeInterval
            ),
            sequentialMode: normalizeBoolean(
                mergedModuleConfig.emotionSpam.sequentialMode,
                emotionDefaults.sequentialMode
            ),
            selectedPackageId: normalizePositiveNumber(
                mergedModuleConfig.emotionSpam.selectedPackageId,
                emotionDefaults.selectedPackageId
            ),
            msg: normalizedEmotionMsg,
            timeLimit: normalizeNonNegativeNumber(
                mergedModuleConfig.emotionSpam.timeLimit,
                emotionDefaults.timeLimit
            )
        },
        settings: {
            saveSpamStatus: {
                enable: normalizeBoolean(
                    mergedModuleConfig.settings.saveSpamStatus.enable,
                    storageDefaultValues.modules.settings.saveSpamStatus.enable
                ),
                lastTask: normalizeSpamTaskKey(mergedModuleConfig.settings.saveSpamStatus.lastTask)
            },
            autoCheckUpdate: {
                enable: normalizeBoolean(
                    mergedModuleConfig.settings.autoCheckUpdate.enable,
                    storageDefaultValues.modules.settings.autoCheckUpdate.enable
                )
            },
            danmakuActions: {
                enable: normalizeBoolean(
                    mergedModuleConfig.settings.danmakuActions.enable,
                    storageDefaultValues.modules.settings.danmakuActions.enable
                ),
                crybabyEnabled: normalizeBoolean(
                    mergedModuleConfig.settings.danmakuActions.crybabyEnabled,
                    storageDefaultValues.modules.settings.danmakuActions.crybabyEnabled
                )
            }
        }
    }
}
