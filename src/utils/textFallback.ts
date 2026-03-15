const TEXT_FALLBACK_POOL = [
    '人无法同时拥有青春和对青春的感受',
    '幸福就是做一个记性很差的人 但是我的记性极好',
    '弹幕非常的不乖哦',
    '🩶💚植树节快乐🩶💚摇钱树们🩶💚'
] as const

export const pickRandomTextFallback = (): string => {
    const index = Math.floor(Math.random() * TEXT_FALLBACK_POOL.length)
    return TEXT_FALLBACK_POOL[index]
}

export const normalizeSubmittedText = (value: unknown): string => {
    if (typeof value !== 'string') {
        return pickRandomTextFallback()
    }

    return value.trim().length > 0 ? value : pickRandomTextFallback()
}

export const getTextFallbackPool = (): readonly string[] => TEXT_FALLBACK_POOL
