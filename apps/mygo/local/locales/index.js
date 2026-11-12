import en from './en.js'
import zh from './zh.js'
import ja from './ja.js'
import es from './es.js'
import fr from './fr.js'
import de from './de.js'
import ru from './ru.js'
import pt from './pt.js'
export const namespace = 'mygo.client'
export const dictionaries = { en, zh, ja, es, fr, de, ru, pt }
export const localized = key => Object.fromEntries(Object.entries(dictionaries).map(([language, dictionary]) => [language, dictionary[key] ?? key]))
