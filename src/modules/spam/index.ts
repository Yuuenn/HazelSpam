import EmotionSpamModule from './emotionSpamModule'
import TextSpamModule from './textSpamModule'

export const spamModuleConstructors = [TextSpamModule, EmotionSpamModule] as const
