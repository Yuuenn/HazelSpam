import { computed, watch } from 'vue'
import type { BiliAPIResponse } from '@/types'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'

type EmotionPackage = BiliAPIResponse.GetEmoticons.EmoticonPackage
type EmotionItem = EmotionPackage['emoticons'][number]

export type EmotionPackageListItem = {
    id: number
    coverUrl: string
    name: string
    description: string
    selectedCount: number
    isCurrent: boolean
}

export type EmotionGridVariant = 'default' | 'general' | 'emoji'

export type EmotionGridItem = {
    id: number
    unique: string
    title: string
    imageUrl: string
    isSelected: boolean
    isDisabled: boolean
}

export type EmotionPackagePanel = {
    packageId: number
    imageVariant: EmotionGridVariant
    emotionItems: EmotionGridItem[]
}

type PackageDisplayInfo = {
    name: string
    descript: string
}

const isEmojiPackage = (pkg: EmotionPackage) => /emoji/i.test(pkg.pkg_name || '')

const isGeneralPackage = (pkg: EmotionPackage) =>
    pkg.pkg_name.includes('通用表情') && !isEmojiPackage(pkg)

const getPackageOrder = (pkg: EmotionPackage) => {
    const pkgName = pkg.pkg_name || ''
    if (pkgName.includes('房间专属表情')) return 0
    if (/up主大表情/i.test(pkgName)) return 1
    if (pkgName.includes('装扮表情')) return 2
    if (isGeneralPackage(pkg)) return 3
    if (isEmojiPackage(pkg)) return 4
    return 5
}

const extractDressCollectionName = (pkg: EmotionPackage) => {
    const firstUnique = pkg.emoticons.find((item) => item.emoticon_unique)?.emoticon_unique || ''
    const bracketContent = firstUnique.match(/\[([^\]]+)\]/)?.[1] || ''
    if (!bracketContent) return ''
    const splitIndex = bracketContent.lastIndexOf('_')
    if (splitIndex <= 0) return bracketContent.trim()
    return bracketContent.slice(0, splitIndex).trim()
}

const sanitizePackageDisplayName = (name: string) => {
    const sanitized = name
        .replace(/收藏集/g, '')
        .replace(/表情包/g, '')
        .trim()
    return sanitized || name
}

export const useEmotionPackages = () => {
    const biliStore = useBiliStore()
    const moduleStore = useModuleStore()

    const anchorDisplayName = computed(() => biliStore.roomAnchorName?.trim() || '')
    const isEmotionSpamRunning = computed(() => moduleStore.moduleConfig.emotionSpam.enable)

    const packageList = computed(() => {
        return biliStore.emotionData.slice().sort((a, b) => {
            const orderA = getPackageOrder(a)
            const orderB = getPackageOrder(b)
            if (orderA !== orderB) return orderA - orderB
            return b.pkg_id - a.pkg_id
        })
    })

    const formatPackageDisplayInfo = (pkg: EmotionPackage): PackageDisplayInfo => {
        const defaultName = pkg.pkg_name || `表情包 ${pkg.pkg_id}`
        let name = defaultName
        let descript = pkg.pkg_descript || ''

        if (descript === 'emoji表情' || descript === '官方表情(系统)') {
            descript = ''
        }

        if (descript === '装扮表情') {
            const collectionName = extractDressCollectionName(pkg)
            if (collectionName) {
                name = collectionName
            }
        }

        if (descript === '房间表情(系统)') {
            descript = '动态评论表情'
            if (anchorDisplayName.value) {
                name = anchorDisplayName.value
            }
        }

        if (!descript && pkg.pkg_name === '房间专属表情') {
            descript = '直播间表情'
            if (anchorDisplayName.value) {
                name = anchorDisplayName.value
            }
        }

        return { name: sanitizePackageDisplayName(name), descript }
    }

    const packageDisplayMap = computed(() => {
        const map = new Map<number, PackageDisplayInfo>()
        packageList.value.forEach((pkg) => {
            map.set(pkg.pkg_id, formatPackageDisplayInfo(pkg))
        })
        return map
    })

    const getPackageDisplayInfo = (pkg: EmotionPackage): PackageDisplayInfo =>
        packageDisplayMap.value.get(pkg.pkg_id) ?? {
            name: pkg.pkg_name || `表情包 ${pkg.pkg_id}`,
            descript: pkg.pkg_descript || ''
        }

    const selectedPackage = computed(
        () =>
            packageList.value.find(
                (data) => data.pkg_id === moduleStore.moduleConfig.emotionSpam.selectedPackageId
            ) ?? null
    )

    const isCurrentPackageGeneral = computed(() =>
        Boolean(selectedPackage.value && isGeneralPackage(selectedPackage.value))
    )

    const isCurrentPackageEmojiSeries = computed(() =>
        Boolean(selectedPackage.value && isEmojiPackage(selectedPackage.value))
    )

    const selectedEmotionSet = computed(
        () => new Set(moduleStore.moduleConfig.emotionSpam.msg.map((item) => String(item)))
    )

    const packageSelectedCountMap = computed(() => {
        const selectedSet = selectedEmotionSet.value
        const map = new Map<number, number>()
        packageList.value.forEach((pkg) => {
            let count = 0
            pkg.emoticons.forEach((item) => {
                if (selectedSet.has(String(item.emoticon_unique))) {
                    count += 1
                }
            })
            map.set(pkg.pkg_id, count)
        })
        return map
    })

    const getPackageSelectedCount = (pkgId: number) => packageSelectedCountMap.value.get(pkgId) ?? 0

    const selectedEmotionCount = computed(() => moduleStore.moduleConfig.emotionSpam.msg.length)

    watch(
        packageList,
        (list) => {
            if (list.length === 0) {
                return
            }

            const currentSelectedPackageId = moduleStore.moduleConfig.emotionSpam.selectedPackageId
            const hasCurrentSelection = list.some(
                (pkg) => pkg.pkg_id === currentSelectedPackageId
            )

            if (!hasCurrentSelection) {
                moduleStore.moduleConfig.emotionSpam.selectedPackageId = list[0].pkg_id
            }
        },
        { immediate: true }
    )

    const handleSelectPackage = (id: number) => {
        moduleStore.moduleConfig.emotionSpam.selectedPackageId = id
    }

    const isPackageCurrent = (id: number) =>
        moduleStore.moduleConfig.emotionSpam.selectedPackageId === id

    const isEmotionDisabled = (item: EmotionItem) => item.perm === 0 || isEmotionSpamRunning.value

    const isEmotionSelected = (item: EmotionItem) =>
        selectedEmotionSet.value.has(String(item.emoticon_unique))

    const toggleEmotionSelection = (emotionUnique: string) => {
        const emotionKey = String(emotionUnique)
        const targetEmotion = selectedPackage.value?.emoticons.find(
            (item) => String(item.emoticon_unique) === emotionKey
        )

        if (!targetEmotion || isEmotionDisabled(targetEmotion)) {
            return
        }

        const selected = moduleStore.moduleConfig.emotionSpam.msg
        const existedIndex = selected.findIndex((value) => String(value) === emotionKey)

        if (existedIndex >= 0) {
            selected.splice(existedIndex, 1)
        } else {
            selected.push(emotionKey)
        }
    }

    const clearAllSelections = () => {
        if (isEmotionSpamRunning.value) return
        moduleStore.moduleConfig.emotionSpam.msg = []
    }

    const clearCurrentPackageSelections = () => {
        if (isEmotionSpamRunning.value || !selectedPackage.value) return

        const currentPackageSet = new Set(
            selectedPackage.value.emoticons.map((item) => String(item.emoticon_unique))
        )

        moduleStore.moduleConfig.emotionSpam.msg = moduleStore.moduleConfig.emotionSpam.msg.filter(
            (value) => !currentPackageSet.has(String(value))
        )
    }

    const packageCards = computed<EmotionPackageListItem[]>(() => {
        return packageList.value.map((pkg) => {
            const displayInfo = getPackageDisplayInfo(pkg)

            return {
                id: pkg.pkg_id,
                coverUrl: pkg.current_cover,
                name: displayInfo.name || `表情包 ${pkg.pkg_id}`,
                description: displayInfo.descript,
                selectedCount: getPackageSelectedCount(pkg.pkg_id),
                isCurrent: isPackageCurrent(pkg.pkg_id)
            }
        })
    })

    const selectedPackageId = computed(() => selectedPackage.value?.pkg_id ?? null)

    const selectedPackageGridVariant = computed<EmotionGridVariant>(() => {
        if (isCurrentPackageGeneral.value) {
            return 'general'
        }

        if (isCurrentPackageEmojiSeries.value) {
            return 'emoji'
        }

        return 'default'
    })

    const selectedPackageEmotionCards = computed<EmotionGridItem[]>(() => {
        return (selectedPackage.value?.emoticons ?? []).map((item) => ({
            id: item.emoticon_id,
            unique: String(item.emoticon_unique),
            title: item.emoji || item.descript || `表情 ${item.emoticon_id}`,
            imageUrl: item.url,
            isSelected: isEmotionSelected(item),
            isDisabled: isEmotionDisabled(item)
        }))
    })

    const packagePanels = computed<EmotionPackagePanel[]>(() => {
        return packageList.value.map((pkg) => {
            const imageVariant: EmotionGridVariant = isGeneralPackage(pkg)
                ? 'general'
                : isEmojiPackage(pkg)
                  ? 'emoji'
                  : 'default'

            return {
                packageId: pkg.pkg_id,
                imageVariant,
                emotionItems: pkg.emoticons.map((item) => ({
                    id: item.emoticon_id,
                    unique: String(item.emoticon_unique),
                    title: item.emoji || item.descript || `表情 ${item.emoticon_id}`,
                    imageUrl: item.url,
                    isSelected: isEmotionSelected(item),
                    isDisabled: isEmotionDisabled(item)
                }))
            }
        })
    })

    const hasSelectedInCurrentPackage = computed(() => {
        if (selectedPackageId.value === null) {
            return false
        }

        return getPackageSelectedCount(selectedPackageId.value) > 0
    })

    return {
        packageCards,
        packagePanels,
        selectedPackageId,
        selectedPackageEmotionCards,
        selectedPackageGridVariant,
        hasSelectedInCurrentPackage,
        selectedEmotionCount,
        handleSelectPackage,
        toggleEmotionSelection,
        clearAllSelections,
        clearCurrentPackageSelections
    }
}
