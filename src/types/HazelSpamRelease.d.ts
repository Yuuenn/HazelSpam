declare namespace HazelSpamRelease {
    interface LatestManifest {
        version: string
        publishedAt: string
        downloadUrl: string
        changelogUrl?: string
        downloads?: {
            default?: string
            minified?: string
            source?: string
        }
    }
}

export { HazelSpamRelease }
