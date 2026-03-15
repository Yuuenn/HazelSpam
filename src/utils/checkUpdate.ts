import { GM_info, GM_xmlhttpRequest } from '$'
import { LATEST_RELEASE_MANIFEST_URL, PROJECT_CHANGELOG_URL } from '@/constants/brand'
import type { HazelSpamRelease } from '@/types'

export type UpdateCheckResult =
    | {
          status: 'latest'
          currentVersion: string
          latestVersion: string
      }
    | {
          status: 'available'
          currentVersion: string
          latestVersion: string
          downloadUrl: string
          changelogUrl: string
      }

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'

const parseLatestReleaseManifest = (responseText: string): HazelSpamRelease.LatestManifest => {
    const payload = JSON.parse(responseText) as unknown

    if (!isRecord(payload) || !isString(payload.version) || payload.version.trim() === '') {
        throw new Error('最新版本信息缺少有效版本号')
    }

    const downloadUrl = payload.downloadUrl
    const changelogUrl = payload.changelogUrl
    const downloads = payload.downloads

    if (downloadUrl !== undefined && !isString(downloadUrl)) {
        throw new Error('最新版本信息中的下载链接格式无效')
    }

    if (changelogUrl !== undefined && !isString(changelogUrl)) {
        throw new Error('最新版本信息中的更新日志链接格式无效')
    }

    if (downloads !== undefined) {
        if (!isRecord(downloads)) {
            throw new Error('最新版本信息中的下载清单格式无效')
        }

        const downloadEntries = ['default', 'minified', 'source'] as const
        for (const key of downloadEntries) {
            const value = downloads[key]
            if (value !== undefined && !isString(value)) {
                throw new Error(`最新版本信息中的 ${key} 下载链接格式无效`)
            }
        }
    }

    return payload as unknown as HazelSpamRelease.LatestManifest
}

const getLatestReleaseManifest = async (): Promise<HazelSpamRelease.LatestManifest> =>
    new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: LATEST_RELEASE_MANIFEST_URL,
            onload: (response) => {
                if (response.status !== 200) {
                    reject(new Error(`获取最新版本信息失败：${response.status}`))
                    return
                }

                try {
                    resolve(parseLatestReleaseManifest(response.responseText))
                } catch (error) {
                    reject(
                        error instanceof Error ? error : new Error('解析最新版本信息失败')
                    )
                }
            },
            onerror: () => {
                reject(new Error('获取最新版本信息失败'))
            }
        })
    })

const resolveDownloadUrl = (manifest: HazelSpamRelease.LatestManifest) => {
    const candidate =
        manifest.downloadUrl || manifest.downloads?.default || manifest.downloads?.minified || ''

    if (!candidate) {
        throw new Error('最新版本信息未提供可用的安装链接')
    }

    return candidate
}

const resolveChangelogUrl = (manifest: HazelSpamRelease.LatestManifest) =>
    manifest.changelogUrl || PROJECT_CHANGELOG_URL

const normalizeVersion = (version: string): string => {
    const trimmed = version.trim()
    if (!trimmed) {
        return '0'
    }

    const withoutPrefix = trimmed.replace(/^v/i, '')
    const withoutMeta = withoutPrefix.split(/[+-]/)[0]
    const match = withoutMeta.match(/\d+(?:\.\d+)*/)
    return match?.[0] ?? '0'
}

const parseVersionParts = (version: string) =>
    normalizeVersion(version)
        .split('.')
        .map((part) => Number(part) || 0)

const compareVersion = (currentVersion: string, latestVersion: string): number => {
    const currentVersionParts = parseVersionParts(currentVersion)
    const latestVersionParts = parseVersionParts(latestVersion)

    for (
        let index = 0;
        index < Math.max(currentVersionParts.length, latestVersionParts.length);
        index += 1
    ) {
        const currentVersionPart = currentVersionParts[index] ?? 0
        const latestVersionPart = latestVersionParts[index] ?? 0

        if (currentVersionPart !== latestVersionPart) {
            return currentVersionPart > latestVersionPart ? 1 : -1
        }
    }

    return 0
}

export const checkUpdate = async (): Promise<UpdateCheckResult> => {
    const currentVersion = GM_info.script.version
    const latestRelease = await getLatestReleaseManifest()
    const latestVersion = latestRelease.version

    if (compareVersion(currentVersion, latestVersion) < 0) {
        return {
            status: 'available',
            currentVersion,
            latestVersion,
            downloadUrl: resolveDownloadUrl(latestRelease),
            changelogUrl: resolveChangelogUrl(latestRelease)
        }
    }

    return {
        status: 'latest',
        currentVersion,
        latestVersion
    }
}
