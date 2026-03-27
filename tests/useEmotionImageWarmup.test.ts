import { describe, expect, it } from 'vitest'
import {
    getEmotionWarmupUrls,
    type EmotionImageWarmupPanel
} from '@/composables/useEmotionImageWarmup'

const createPanel = (packageId: number, imageUrls: string[]): EmotionImageWarmupPanel => ({
    packageId,
    imageUrls
})

describe('useEmotionImageWarmup', () => {
    it('prioritizes nearby packages and skips the current package', () => {
        const panels = [
            createPanel(100, ['100-a', '100-b']),
            createPanel(200, ['200-a']),
            createPanel(300, ['300-a', '300-b']),
            createPanel(400, ['400-a'])
        ]

        expect(getEmotionWarmupUrls(panels, 200)).toEqual([
            '300-a',
            '300-b',
            '100-a',
            '100-b',
            '400-a'
        ])
    })

    it('falls back to package order when there is no valid current package', () => {
        const panels = [createPanel(100, ['100-a']), createPanel(200, ['200-a'])]

        expect(getEmotionWarmupUrls(panels, null)).toEqual(['100-a', '200-a'])
        expect(getEmotionWarmupUrls(panels, 999)).toEqual(['100-a', '200-a'])
    })

    it('deduplicates repeated or empty image urls across packages', () => {
        const panels = [
            createPanel(100, ['', 'shared', '100-a']),
            createPanel(200, ['shared', '200-a'])
        ]

        expect(getEmotionWarmupUrls(panels, null)).toEqual(['shared', '100-a', '200-a'])
    })
})
