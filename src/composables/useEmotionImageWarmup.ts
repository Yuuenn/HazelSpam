import { computed, onBeforeUnmount, watch, type ComputedRef, type Ref } from 'vue'

export type EmotionImageWarmupPanel = {
    packageId: number
    imageUrls: string[]
}

const IMAGE_WARMUP_START_DELAY_MS = 180
const IMAGE_WARMUP_BATCH_SIZE = 8
const IMAGE_WARMUP_BATCH_DELAY_MS = 120

const primedEmotionImageUrls = new Set<string>()

const canWarmEmotionImages = () => typeof window !== 'undefined' && typeof Image !== 'undefined'

const getNeighborPackageOrder = (
    packageIds: number[],
    currentPackageId: number | null
): number[] => {
    if (packageIds.length === 0) {
        return []
    }

    if (currentPackageId === null) {
        return packageIds
    }

    const currentIndex = packageIds.findIndex((packageId) => packageId === currentPackageId)
    if (currentIndex < 0) {
        return packageIds
    }

    const orderedPackageIds: number[] = []

    for (let offset = 1; offset < packageIds.length; offset += 1) {
        const nextIndex = currentIndex + offset
        if (nextIndex < packageIds.length) {
            orderedPackageIds.push(packageIds[nextIndex])
        }

        const previousIndex = currentIndex - offset
        if (previousIndex >= 0) {
            orderedPackageIds.push(packageIds[previousIndex])
        }
    }

    return orderedPackageIds
}

export const getEmotionWarmupUrls = (
    panels: EmotionImageWarmupPanel[],
    currentPackageId: number | null
) => {
    const orderedPackageIds = getNeighborPackageOrder(
        panels.map((panel) => panel.packageId),
        currentPackageId
    )

    const panelMap = new Map(panels.map((panel) => [panel.packageId, panel]))
    const queuedImageUrls = new Set<string>()
    const warmupUrls: string[] = []

    orderedPackageIds.forEach((packageId) => {
        const panel = panelMap.get(packageId)
        if (!panel) {
            return
        }

        panel.imageUrls.forEach((imageUrl) => {
            if (!imageUrl || queuedImageUrls.has(imageUrl)) {
                return
            }

            queuedImageUrls.add(imageUrl)
            warmupUrls.push(imageUrl)
        })
    })

    return warmupUrls
}

const createWarmupSignature = (panels: EmotionImageWarmupPanel[]) =>
    panels
        .map((panel) => `${panel.packageId}:${panel.imageUrls.join(',')}`)
        .join('|')

const warmEmotionImage = (imageUrl: string) => {
    if (!canWarmEmotionImages() || primedEmotionImageUrls.has(imageUrl)) {
        return
    }

    primedEmotionImageUrls.add(imageUrl)

    const image = new Image()
    let settled = false

    const cleanup = () => {
        image.onload = null
        image.onerror = null
    }

    const finalize = () => {
        if (settled) {
            return
        }

        settled = true
        cleanup()
    }

    image.decoding = 'async'
    image.loading = 'eager'
    image.onload = finalize
    image.onerror = finalize
    image.src = imageUrl

    if (typeof image.decode === 'function') {
        image.decode().then(finalize).catch(finalize)
    } else if (image.complete) {
        finalize()
    }
}

type UseEmotionImageWarmupOptions = {
    packagePanels: ComputedRef<EmotionImageWarmupPanel[]>
    currentPackageId: Ref<number | null>
}

export const useEmotionImageWarmup = ({
    packagePanels,
    currentPackageId
}: UseEmotionImageWarmupOptions) => {
    const warmupSignature = computed(() => createWarmupSignature(packagePanels.value))
    let warmupTimer: number | null = null
    let warmupRunId = 0

    const clearWarmupTimer = () => {
        if (warmupTimer === null || typeof window === 'undefined') {
            return
        }

        window.clearTimeout(warmupTimer)
        warmupTimer = null
    }

    const scheduleWarmupBatch = (runId: number, imageUrls: string[], startIndex: number) => {
        if (runId !== warmupRunId || !canWarmEmotionImages()) {
            return
        }

        imageUrls.slice(startIndex, startIndex + IMAGE_WARMUP_BATCH_SIZE).forEach(warmEmotionImage)

        const nextIndex = startIndex + IMAGE_WARMUP_BATCH_SIZE
        if (nextIndex >= imageUrls.length) {
            warmupTimer = null
            return
        }

        warmupTimer = window.setTimeout(() => {
            scheduleWarmupBatch(runId, imageUrls, nextIndex)
        }, IMAGE_WARMUP_BATCH_DELAY_MS)
    }

    watch(
        [warmupSignature, currentPackageId],
        () => {
            warmupRunId += 1
            clearWarmupTimer()

            if (!canWarmEmotionImages()) {
                return
            }

            const imageUrls = getEmotionWarmupUrls(packagePanels.value, currentPackageId.value).filter(
                (imageUrl) => !primedEmotionImageUrls.has(imageUrl)
            )

            if (imageUrls.length === 0) {
                return
            }

            const runId = warmupRunId
            warmupTimer = window.setTimeout(() => {
                scheduleWarmupBatch(runId, imageUrls, 0)
            }, IMAGE_WARMUP_START_DELAY_MS)
        },
        { immediate: true }
    )

    onBeforeUnmount(() => {
        warmupRunId += 1
        clearWarmupTimer()
    })
}
