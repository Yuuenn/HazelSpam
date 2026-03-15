import { promises as fs } from 'fs'
import path from 'path'

const DIST_DIR = 'dist'
const PACKAGE_JSON_PATH = 'package.json'
const RELEASE_ORIGIN = process.env.HAZELSPAM_RELEASE_ORIGIN ?? 'https://hazel.idols.ltd'
const CHANGELOG_URL =
    process.env.HAZELSPAM_CHANGELOG_URL ??
    'https://github.com/Yuuenn/HazelSpam/blob/main/CHANGELOG.md'
const OUTPUT_FILE_PATH = path.join(DIST_DIR, 'latest.json')

async function readVersion() {
    const packageJson = JSON.parse(await fs.readFile(PACKAGE_JSON_PATH, 'utf-8'))
    const version = packageJson.version?.trim()

    if (!version) {
        throw new Error('package.json 中缺少有效的 version 字段')
    }

    return version
}

async function writeLatestManifest() {
    const version = await readVersion()
    const manifest = {
        version,
        publishedAt: new Date().toISOString(),
        downloadUrl: `${RELEASE_ORIGIN}/HazelSpam.min.user.js`,
        changelogUrl: CHANGELOG_URL,
        downloads: {
            default: `${RELEASE_ORIGIN}/HazelSpam.min.user.js`,
            minified: `${RELEASE_ORIGIN}/HazelSpam.min.user.js`,
            source: `${RELEASE_ORIGIN}/HazelSpam.user.js`
        }
    }

    await fs.writeFile(OUTPUT_FILE_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
    console.log(`\n已生成 latest manifest: ${OUTPUT_FILE_PATH}`)
}

writeLatestManifest().catch((error) => {
    console.error('\n生成 latest manifest 失败:', error)
    process.exitCode = 1
})
