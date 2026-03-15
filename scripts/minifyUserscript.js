import { promises as fs } from 'fs'
import path from 'path'
import { minify } from 'terser'

const DIST_DIR = 'dist'
const TARGET_BASENAME = 'HazelSpam'
const TARGET_SCRIPT_PATH = path.join(DIST_DIR, `${TARGET_BASENAME}.user.js`)
const TARGET_MIN_SCRIPT_PATH = path.join(DIST_DIR, `${TARGET_BASENAME}.min.user.js`)

async function resolveBuildOutputPath() {
    const distFiles = await fs.readdir(DIST_DIR)
    const scriptCandidates = distFiles.filter(
        (fileName) => fileName.endsWith('.user.js') && !fileName.endsWith('.min.user.js')
    )

    if (scriptCandidates.length === 0) {
        throw new Error('未找到 userscript 构建产物，请先执行 vite build')
    }

    const directTarget = `${TARGET_BASENAME}.user.js`
    const preferredName = scriptCandidates.includes(directTarget)
        ? directTarget
        : scriptCandidates[0]

    return path.join(DIST_DIR, preferredName)
}

async function normalizeScriptName(inputPath) {
    if (inputPath === TARGET_SCRIPT_PATH) {
        return TARGET_SCRIPT_PATH
    }

    if (inputPath.toLowerCase() === TARGET_SCRIPT_PATH.toLowerCase()) {
        const tempPath = path.join(DIST_DIR, `${TARGET_BASENAME}.tmp.user.js`)
        await fs.rm(tempPath, { force: true })
        await fs.rename(inputPath, tempPath)
        await fs.rename(tempPath, TARGET_SCRIPT_PATH)
        return TARGET_SCRIPT_PATH
    }

    await fs.rm(TARGET_SCRIPT_PATH, { force: true })
    await fs.rename(inputPath, TARGET_SCRIPT_PATH)
    return TARGET_SCRIPT_PATH
}

async function minifyUserscript(inputPath, outputPath) {
    const code = await fs.readFile(inputPath, 'utf-8')

    const metadataMatch = code.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/)
    const metadata = metadataMatch ? metadataMatch[0] : ''

    const minified = await minify(code, {
        format: {
            comments: false
        }
    })

    const result = `${metadata}\n${minified.code}`

    await fs.writeFile(outputPath, result, 'utf-8')

    console.log(`\n压缩完成: ${inputPath} -> ${outputPath}`)
}

async function buildMinifiedUserscript() {
    const outputPath = await resolveBuildOutputPath()
    const normalizedPath = await normalizeScriptName(outputPath)
    await minifyUserscript(normalizedPath, TARGET_MIN_SCRIPT_PATH)
}

buildMinifiedUserscript().catch((error) => {
    console.error('\n压缩失败:', error)
    process.exitCode = 1
})
