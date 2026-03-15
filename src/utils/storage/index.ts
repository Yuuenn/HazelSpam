import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import type { ModuleConfig, UiConfig } from '@/types'
import { sanitizeModuleConfig, sanitizeUiConfig } from './schema'

class Storage {
    public static setUiConfig(uiConfig: UiConfig) {
        GM_setValue('ui', sanitizeUiConfig(uiConfig))
    }

    public static getUiConfig(): UiConfig {
        return sanitizeUiConfig(GM_getValue('ui', {}))
    }

    public static setModuleConfig(moduleConfig: ModuleConfig) {
        GM_setValue('modules', sanitizeModuleConfig(moduleConfig))
    }

    public static getModuleConfig(): ModuleConfig {
        return sanitizeModuleConfig(GM_getValue('modules', {}))
    }

    public static clearAll() {
        GM_deleteValue('ui')
        GM_deleteValue('modules')
    }
}

export default Storage
