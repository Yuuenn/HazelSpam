import { reactive } from 'vue'
import { PROJECT_CHANGELOG_URL } from '@/constants/brand'

const DEFAULT_CHANGELOG_URL = PROJECT_CHANGELOG_URL

export type UpdateDialogOptions = {
    version: string
    downloadUrl?: string
    changelogUrl?: string
}

type UpdateDialogState = {
    visible: boolean
    version: string
    downloadUrl: string
    changelogUrl: string
}

const updateDialogState = reactive<UpdateDialogState>({
    visible: false,
    version: '',
    downloadUrl: '',
    changelogUrl: DEFAULT_CHANGELOG_URL
})

export const getDefaultUpdateChangelogUrl = () => DEFAULT_CHANGELOG_URL

export const useUpdateDialogState = () => updateDialogState

export const showUpdateDialog = (options: UpdateDialogOptions) => {
    updateDialogState.version = options.version
    updateDialogState.downloadUrl = options.downloadUrl ?? ''
    updateDialogState.changelogUrl = options.changelogUrl ?? DEFAULT_CHANGELOG_URL
    updateDialogState.visible = true
}

export const hideUpdateDialog = () => {
    updateDialogState.visible = false
}
