import { PRODUCT_NAME } from '@/constants/brand'

class Logger {
    private readonly NAME: string = PRODUCT_NAME
    private readonly module: string

    private get prefix(): string[] {
        const now = new Date()
        const time = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
        return [
            `%c${this.NAME}%c[${time}][${this.module}]%c:`,
            'font-weight: bold; color: white; background-color: #23ade5; padding: 1px 4px; border-radius: 4px;',
            'font-weight: bold; color: #d3d3d3;',
            ''
        ]
    }

    public log(...data: unknown[]): void {
        console.log(...this.prefix, ...data)
    }

    public info(...data: unknown[]): void {
        console.info(...this.prefix, ...data)
    }

    public warn(...data: unknown[]): void {
        console.warn(...this.prefix, ...data)
    }

    public error(...data: unknown[]): void {
        console.error(...this.prefix, ...data)
    }

    constructor(module: string) {
        this.module = module.split('_').join('][')
    }
}

export default Logger
