import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import type { ModuleConfig, UiConfig } from '@/types'
import { sanitizeModuleConfig, sanitizeUiConfig } from './schema'

class Storage {
    private static readonly UI_CONFIG_KEY = 'ui'
    private static readonly MODULE_CONFIG_KEY = 'modules'

    private static getRawConfigRecord(key: string): Record<string, unknown> {
        const raw = GM_getValue(key, {})
        return typeof raw === 'object' && raw !== null
            ? { ...(raw as Record<string, unknown>) }
            : {}
    }

    public static setUiConfig(uiConfig: UiConfig) {
        GM_setValue(Storage.UI_CONFIG_KEY, sanitizeUiConfig(uiConfig))
    }

    public static getUiConfig(): UiConfig {
        return sanitizeUiConfig(GM_getValue(Storage.UI_CONFIG_KEY, {}))
    }

    public static setModuleConfig(moduleConfig: ModuleConfig) {
        GM_setValue(Storage.MODULE_CONFIG_KEY, sanitizeModuleConfig(moduleConfig))
    }

    public static setModuleConfigSection<K extends keyof ModuleConfig>(
        section: K,
        value: ModuleConfig[K]
    ) {
        const rawModuleConfig = Storage.getRawConfigRecord(Storage.MODULE_CONFIG_KEY)
        rawModuleConfig[section] = value as unknown
        GM_setValue(Storage.MODULE_CONFIG_KEY, sanitizeModuleConfig(rawModuleConfig))
    }

    public static getModuleConfig(): ModuleConfig {
        return sanitizeModuleConfig(GM_getValue(Storage.MODULE_CONFIG_KEY, {}))
    }

    public static clearAll() {
        GM_deleteValue(Storage.UI_CONFIG_KEY)
        GM_deleteValue(Storage.MODULE_CONFIG_KEY)
    }
}

export default Storage
