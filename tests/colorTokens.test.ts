import { describe, expect, it } from 'vitest'
import { APP_COLOR_TOKENS } from '@/theme/colorTokens'

const REQUIRED_TOKEN_KEYS = [
    '--hazelspam-color-accent-hover',
    '--hazelspam-color-accent-active',
    '--hazelspam-color-accent-contrast',
    '--hazelspam-color-field-bg',
    '--hazelspam-color-field-border',
    '--hazelspam-color-field-focus-border',
    '--hazelspam-color-field-placeholder',
    '--hazelspam-focus-ring-color',
    '--hazelspam-focus-ring-shadow',
    '--hazelspam-color-scroll-hint',
    '--hazelspam-color-shell-card-bg',
    '--hazelspam-color-text-primary',
    '--hazelspam-color-success',
    '--hazelspam-color-danger',
    '--hazelspam-color-brand',
    '--p-primary-color',
    '--p-primary-hover-color',
    '--p-content-background',
    '--p-content-border-color',
    '--p-text-color',
    '--p-text-muted-color',
    '--p-form-field-background',
    '--p-form-field-border-color',
    '--p-focus-ring-color',
    '--p-focus-ring-shadow'
] as const

describe('APP_COLOR_TOKENS', () => {
    it('为浅色与深色都提供关键兼容 token', () => {
        for (const theme of ['light', 'dark'] as const) {
            const tokens = APP_COLOR_TOKENS[theme]
            for (const key of REQUIRED_TOKEN_KEYS) {
                expect(tokens[key]).toBeTruthy()
            }
        }
    })

    it('保持 Hazel 与 Prime 关键 token 映射一致', () => {
        for (const theme of ['light', 'dark'] as const) {
            const tokens = APP_COLOR_TOKENS[theme]

            expect(tokens['--hazelspam-color-accent']).toBe(tokens['--p-primary-color'])
            expect(tokens['--hazelspam-color-accent-hover']).toBe(tokens['--p-primary-hover-color'])
            expect(tokens['--hazelspam-color-accent-active']).toBe(tokens['--p-primary-active-color'])
            expect(tokens['--hazelspam-color-accent-contrast']).toBe(
                tokens['--p-primary-contrast-color']
            )
            expect(tokens['--hazelspam-color-field-bg']).toBe(tokens['--p-form-field-background'])
            expect(tokens['--hazelspam-color-field-border']).toBe(tokens['--p-form-field-border-color'])
            expect(tokens['--hazelspam-color-field-focus-border']).toBe(
                tokens['--p-form-field-focus-border-color']
            )
            expect(tokens['--hazelspam-color-field-placeholder']).toBe(
                tokens['--p-form-field-placeholder-color']
            )
            expect(tokens['--hazelspam-focus-ring-color']).toBe(tokens['--p-focus-ring-color'])
            expect(tokens['--hazelspam-focus-ring-shadow']).toBe(tokens['--p-focus-ring-shadow'])
            expect(tokens['--p-content-background']).toBe(tokens['--hazelspam-color-shell-card-bg'])
            expect(tokens['--p-text-color']).toBe(tokens['--hazelspam-color-text-primary'])
        }
    })

    it('在浅色模式下保持品牌边框与图标颜色一致', () => {
        const lightTokens = APP_COLOR_TOKENS.light

        expect(lightTokens['--hazelspam-color-brand-border']).toBe(
            lightTokens['--hazelspam-color-brand-icon']
        )
    })

    it('为危险与成功语义提供完整色阶', () => {
        for (const theme of ['light', 'dark'] as const) {
            const tokens = APP_COLOR_TOKENS[theme]

            expect(tokens['--hazelspam-color-danger']).toBeTruthy()
            expect(tokens['--hazelspam-color-danger-hover']).toBeTruthy()
            expect(tokens['--hazelspam-color-danger-active']).toBeTruthy()
            expect(tokens['--hazelspam-color-success']).toBeTruthy()
            expect(tokens['--hazelspam-color-success-hover']).toBeTruthy()
            expect(tokens['--hazelspam-color-success-active']).toBeTruthy()
        }
    })
})
