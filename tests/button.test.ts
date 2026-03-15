import { describe, expect, it } from 'vitest'
import {
    APP_BUTTON_BASE_CLASS,
    APP_BUTTON_STYLE_ATTR,
    APP_BUTTON_TONE_ATTR,
    createAppButtonChrome,
    createAppButtonProps
} from '@/constants/button'

describe('button helpers', () => {
    it('为按钮封装输出统一语义标记', () => {
        const chrome = createAppButtonChrome({ style: 'inline', tone: 'surface' })

        expect(chrome[APP_BUTTON_STYLE_ATTR]).toBe('inline')
        expect(chrome[APP_BUTTON_TONE_ATTR]).toBe('surface')
        expect(chrome.class).toEqual(
            expect.arrayContaining([APP_BUTTON_BASE_CLASS, 'hazelspam-inline-btn'])
        )
    })

    it('把 tone 语义映射到 PrimeVue 按钮属性', () => {
        const dangerSurfaceButton = createAppButtonProps({
            style: 'inline',
            tone: 'dangerSurface'
        })
        const successButton = createAppButtonProps({ style: 'action', tone: 'success' })

        expect(dangerSurfaceButton).toMatchObject({
            [APP_BUTTON_STYLE_ATTR]: 'inline',
            [APP_BUTTON_TONE_ATTR]: 'dangerSurface',
            severity: 'danger',
            outlined: true
        })
        expect(successButton).toMatchObject({
            [APP_BUTTON_STYLE_ATTR]: 'action',
            [APP_BUTTON_TONE_ATTR]: 'success',
            severity: 'success'
        })
    })
})
