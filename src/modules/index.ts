import { settingsModuleConstructors } from './settings'
import { spamModuleConstructors } from './spam'

export const appModuleConstructors = [
    ...spamModuleConstructors,
    ...settingsModuleConstructors
] as const
