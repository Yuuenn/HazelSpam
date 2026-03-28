export const PRODUCT_NAME = 'HazelSpam'
export const USERSCRIPT_NAME = 'HazelSpam - 后现代 B 站弹幕工具'
export const PRODUCT_AUTHOR = 'Yuuenn'

export const APP_ROOT_ID = 'hazelspam'
export const APP_CSS_NAMESPACE = 'hazelspam'
export const DEBUG_NOTIFY_GLOBAL_KEY = '__HAZELSPAM_NOTIFY__'

export const GITHUB_OWNER = 'Yuuenn'
export const GITHUB_REPOSITORY = 'HazelSpam'
export const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_OWNER}`
export const EDGEONE_RELEASE_ORIGIN = 'https://hazel.idols.ltd'
export const EDGEONE_RELEASE_HOST = 'hazel.idols.ltd'

export const APP_ROOT_SELECTOR = `#${APP_ROOT_ID}`
export const APP_ROOT_CLASS = `${APP_CSS_NAMESPACE}-root`
export const APP_MODAL_CLASS = `${APP_CSS_NAMESPACE}-modal`
export const APP_DARK_CLASS = `${APP_CSS_NAMESPACE}-dark`
export const APP_TOAST_CLASS = `${APP_CSS_NAMESPACE}-toast`
export const APP_MESSAGE_GROUP = `${APP_CSS_NAMESPACE}-message`
export const APP_NOTIFICATION_GROUP = `${APP_CSS_NAMESPACE}-notification`
export const APP_TOOLTIP_CLASS = `${APP_CSS_NAMESPACE}-tooltip`
export const APP_TOOLTIP_UP_CLASS = `${APP_CSS_NAMESPACE}-tooltip-up`
export const APP_HOST_BUTTON_CLASS = `${APP_CSS_NAMESPACE}_app_btn`
export const APP_HOST_BUTTON_ICON_CLASS = `${APP_CSS_NAMESPACE}_app_btn_icon`
export const APP_HOST_BUTTON_BADGE_CLASS = `${APP_CSS_NAMESPACE}_app_btn_badge`
export const APP_HOST_TOOLBAR_ITEM_CLASS = `${APP_CSS_NAMESPACE}-host-toolbar-item`
export const APP_HOST_TOOLBAR_BUTTON_CLASS = `${APP_CSS_NAMESPACE}-host-toolbar-btn`
export const APP_HOST_TOOLBAR_ICON_WRAPPER_CLASS = `${APP_CSS_NAMESPACE}-host-toolbar-icon-wrapper`
export const APP_HOST_TOOLBAR_ICON_CLASS = `${APP_CSS_NAMESPACE}-host-toolbar-icon`
export const APP_COLOR_STYLE_ID = `${APP_CSS_NAMESPACE}-color-token-style`
export const APP_STYLE_SCOPE_SELECTOR = `${APP_ROOT_SELECTOR}, .${APP_MODAL_CLASS}, .${APP_ROOT_CLASS}`
export const APP_DIALOG_STYLE_SCOPE_SELECTOR = `${APP_STYLE_SCOPE_SELECTOR}, .hazelspam-dialog`
export const APP_FLOATING_STYLE_SCOPE_SELECTOR = `.${APP_TOAST_CLASS}, .${APP_TOOLTIP_CLASS}, .${APP_TOOLTIP_UP_CLASS}, .${APP_HOST_BUTTON_CLASS}, .${APP_HOST_TOOLBAR_ITEM_CLASS}, .${APP_HOST_TOOLBAR_BUTTON_CLASS}`
export const APP_TOKEN_SCOPE_SELECTOR = `${APP_DIALOG_STYLE_SCOPE_SELECTOR}, ${APP_FLOATING_STYLE_SCOPE_SELECTOR}`
export const APP_COLOR_SCOPE_SELECTOR = APP_TOKEN_SCOPE_SELECTOR
// PrimeVue's darkModeSelector should stay as a plain class selector.
// Comma-joined or compound selectors fall through its "custom" branch and can produce invalid nested CSS.
export const PRIME_DARK_MODE_SELECTOR = `.${APP_DARK_CLASS}`

export const PROJECT_REPOSITORY_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPOSITORY}`
export const PROJECT_HOMEPAGE_URL = 'https://car.hzm.baby'
export const PROJECT_ISSUES_URL = `${PROJECT_REPOSITORY_URL}/issues`
export const PROJECT_README_URL = `${PROJECT_REPOSITORY_URL}/blob/main/README.md`
export const PROJECT_CHANGELOG_URL = `${PROJECT_REPOSITORY_URL}/blob/main/CHANGELOG.md`
export const PROJECT_RELEASES_URL = EDGEONE_RELEASE_ORIGIN
export const INSPIRATION_AUTHOR_NAME = '虚拟主播灰泽满 Hazel（ManShin）'
export const INSPIRATION_AUTHOR_SPACE_URL = 'https://space.bilibili.com/1298779265'

const USER_SCRIPT_FILE_NAME = 'HazelSpam.min.user.js'
const USER_SCRIPT_SOURCE_FILE_NAME = 'HazelSpam.user.js'
const LATEST_RELEASE_MANIFEST_FILE_NAME = 'latest.json'

export const USERSCRIPT_DOWNLOAD_URL = `${EDGEONE_RELEASE_ORIGIN}/${USER_SCRIPT_FILE_NAME}`
export const USERSCRIPT_UPDATE_URL = USERSCRIPT_DOWNLOAD_URL
export const USERSCRIPT_SOURCE_DOWNLOAD_URL = `${EDGEONE_RELEASE_ORIGIN}/${USER_SCRIPT_SOURCE_FILE_NAME}`
export const LATEST_RELEASE_MANIFEST_URL = `${EDGEONE_RELEASE_ORIGIN}/${LATEST_RELEASE_MANIFEST_FILE_NAME}`

export const PRODUCT_DESCRIPTION = '绿冻车得太快就像龙卷风'
export const PRODUCT_SUBTITLE = '面向 B 站直播的后现代风格弹幕工具'
