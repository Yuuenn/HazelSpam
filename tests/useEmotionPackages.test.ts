import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeModuleConfig } from '@/utils/storage/schema'

const { moduleStoreState, biliStoreState } = vi.hoisted(() => ({
    moduleStoreState: {
        current: null as {
            moduleConfig: ReturnType<typeof sanitizeModuleConfig>
        } | null
    },
    biliStoreState: {
        current: null as {
            emotionData: Array<{
                pkg_id: number
                pkg_name: string
                pkg_descript: string
                current_cover: string
                emoticons: Array<{
                    emoticon_id: number
                    emoticon_unique: string
                    emoji: string
                    descript: string
                    url: string
                    perm: number
                }>
            }>
            roomAnchorName: string
        } | null
    }
}))

vi.mock('@/stores/useModuleStore', () => ({
    useModuleStore: () => moduleStoreState.current
}))

vi.mock('@/stores/useBiliStore', () => ({
    useBiliStore: () => biliStoreState.current
}))

import { useEmotionPackages } from '@/composables/useEmotionPackages'

const createEmotionPackage = (pkgId: number, pkgName: string, emotionUnique: string) => ({
    pkg_id: pkgId,
    pkg_name: pkgName,
    pkg_descript: '',
    current_cover: `https://example.com/${pkgId}.png`,
    emoticons: [
        {
            emoticon_id: pkgId,
            emoticon_unique: emotionUnique,
            emoji: `[${emotionUnique}]`,
            descript: emotionUnique,
            url: `https://example.com/${emotionUnique}.png`,
            perm: 1
        }
    ]
})

describe('useEmotionPackages', () => {
    beforeEach(() => {
        moduleStoreState.current = reactive({
            moduleConfig: sanitizeModuleConfig({})
        })

        biliStoreState.current = reactive({
            emotionData: [
                createEmotionPackage(100, '测试表情包 A', 'emotion-a'),
                createEmotionPackage(200, '测试表情包 B', 'emotion-b')
            ],
            roomAnchorName: ''
        })
    })

    it('preserves the stored selected package when the package still exists', () => {
        const moduleStoreMock = moduleStoreState.current!

        moduleStoreMock.moduleConfig.emotionSpam.selectedPackageId = 100
        moduleStoreMock.moduleConfig.emotionSpam.msg = ['emotion-a']

        const { selectedPackageId, selectedEmotionCount, hasSelectedInCurrentPackage } =
            useEmotionPackages()

        expect(moduleStoreMock.moduleConfig.emotionSpam.selectedPackageId).toBe(100)
        expect(selectedPackageId.value).toBe(100)
        expect(selectedEmotionCount.value).toBe(1)
        expect(hasSelectedInCurrentPackage.value).toBe(true)
    })

    it('falls back to the first package only when the stored package is missing', () => {
        const moduleStoreMock = moduleStoreState.current!

        moduleStoreMock.moduleConfig.emotionSpam.selectedPackageId = 999

        const { selectedPackageId } = useEmotionPackages()

        expect(moduleStoreMock.moduleConfig.emotionSpam.selectedPackageId).toBe(200)
        expect(selectedPackageId.value).toBe(200)
    })
})
