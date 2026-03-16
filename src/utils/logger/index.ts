import { PRODUCT_NAME } from '@/constants/brand'
import { APP_COLOR_TOKENS } from '@/theme/colorTokens'

const LOGGER_BRAND_BACKGROUND = APP_COLOR_TOKENS.dark['--hazelspam-color-brand']
const LOGGER_BRAND_TEXT = APP_COLOR_TOKENS.dark['--hazelspam-color-accent-contrast']
const LOGGER_META_BACKGROUND = APP_COLOR_TOKENS.dark['--hazelspam-color-shell-card-bg']
const LOGGER_META_TEXT = APP_COLOR_TOKENS.dark['--hazelspam-color-text-primary']
const LOGGER_META_BORDER = APP_COLOR_TOKENS.dark['--hazelspam-color-surface-border']
const LOGGER_WARN_BACKGROUND = APP_COLOR_TOKENS.dark['--hazelspam-color-warning']
const LOGGER_WARN_TEXT = APP_COLOR_TOKENS.dark['--hazelspam-color-accent-contrast']
const LOGGER_ERROR_BACKGROUND = APP_COLOR_TOKENS.dark['--hazelspam-color-danger']
const LOGGER_ERROR_TEXT = APP_COLOR_TOKENS.dark['--hazelspam-color-accent-contrast']

type LoggerTone = 'default' | 'warn' | 'error'

class Logger {
    private readonly NAME: string = PRODUCT_NAME
    private readonly module: string

    private getPrefix(tone: LoggerTone = 'default'): string[] {
        const now = new Date()
        const time = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
        const brandBackground =
            tone === 'error'
                ? LOGGER_ERROR_BACKGROUND
                : tone === 'warn'
                  ? LOGGER_WARN_BACKGROUND
                  : LOGGER_BRAND_BACKGROUND
        const brandText =
            tone === 'error'
                ? LOGGER_ERROR_TEXT
                : tone === 'warn'
                  ? LOGGER_WARN_TEXT
                  : LOGGER_BRAND_TEXT

        return [
            `%c${this.NAME}%c[${time}][${this.module}]%c:`,
            [
                'font-weight: 700',
                `color: ${brandText}`,
                `background-color: ${brandBackground}`,
                `border: 1px solid ${brandBackground}`,
                'padding: 1px 6px',
                'border-radius: 999px'
            ].join(';'),
            [
                'font-weight: 600',
                `color: ${LOGGER_META_TEXT}`,
                `background-color: ${LOGGER_META_BACKGROUND}`,
                `border: 1px solid ${LOGGER_META_BORDER}`,
                'padding: 1px 6px',
                'border-radius: 999px'
            ].join(';'),
            ''
        ]
    }

    public log(...data: unknown[]): void {
        console.log(...this.getPrefix(), ...data)
    }

    public info(...data: unknown[]): void {
        console.info(...this.getPrefix(), ...data)
    }

    public warn(...data: unknown[]): void {
        console.warn(...this.getPrefix('warn'), ...data)
    }

    public error(...data: unknown[]): void {
        console.error(...this.getPrefix('error'), ...data)
    }

    constructor(module: string) {
        this.module = module.split('_').join('][')
    }
}

export default Logger
