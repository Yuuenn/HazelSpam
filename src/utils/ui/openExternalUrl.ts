import { unsafeWindow } from '$'

const EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:'])

export const normalizeExternalUrl = (url: string): string | null => {
    if (typeof url !== 'string') {
        return null
    }

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
        return null
    }

    try {
        const normalizedUrl = new URL(trimmedUrl, unsafeWindow.location.href)
        if (!EXTERNAL_URL_PROTOCOLS.has(normalizedUrl.protocol)) {
            return null
        }

        return normalizedUrl.href
    } catch {
        return null
    }
}

const openByAnchor = (url: string) => {
    if (typeof document === 'undefined') {
        return false
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.referrerPolicy = 'no-referrer'
    anchor.click()
    return true
}

export const openExternalUrl = (url: string): boolean => {
    const normalizedUrl = normalizeExternalUrl(url)
    if (!normalizedUrl) {
        return false
    }

    if (openByAnchor(normalizedUrl)) {
        return true
    }

    unsafeWindow.open(normalizedUrl, '_blank', 'noopener,noreferrer')
    return true
}
