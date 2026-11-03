/**
 * Inline the translated locale files (i18n/ui-<lang>.json) into client.js.
 *
 * The client bundle ships as a single file, so a runtime fetch would add a
 * request and a failure mode; inlining keeps one artifact. Idempotent: the block
 * between the markers is regenerated on every run, so `node scripts/merge-i18n.mjs`
 * is safe to re-run after editing a translation.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const clientPath = path.join(root, 'client.js')
const i18nDir = path.join(root, 'i18n')
const BEGIN = '/* @@EXTRA_LOCALES_BEGIN@@ */'
const END = '/* @@EXTRA_LOCALES_END@@ */'

let source = fs.readFileSync(clientPath, 'utf8')

// The zh block is the key-set authority.
const zhBlock = source.slice(source.indexOf('      zh: {'), source.indexOf('      en: {'))
const zhKeys = [...zhBlock.matchAll(/^ {8}(\w+):/gm)].map((match) => match[1])
if (zhKeys.length < 50) throw new Error(`could not read the zh key set (${zhKeys.length} keys)`)

const files = fs.readdirSync(i18nDir).filter((name) => /^ui-[a-z]{2}(-[a-z]{2})?\.json$/.test(name)).sort()
if (files.length === 0) throw new Error('no i18n/ui-*.json files to inline')

const locales = files.map((name) => {
  const lang = name.replace(/^ui-/, '').replace(/\.json$/, '')
  const dict = JSON.parse(fs.readFileSync(path.join(i18nDir, name), 'utf8'))
  const keys = Object.keys(dict)
  const missing = zhKeys.filter((key) => !(key in dict))
  const extra = keys.filter((key) => !zhKeys.includes(key))
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`${name}: missing ${missing.join(',') || '-'} extra ${extra.join(',') || '-'}`)
  }
  return { lang, dict, count: keys.length }
})

const body = locales
  .map(({ lang, dict }) => {
    const pairs = Object.entries(dict)
      .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
      .join('\n')
    return `    ${JSON.stringify(lang)}: {\n${pairs}\n    },`
  })
  .join('\n')

const block = `${BEGIN}\n    Object.assign(DICT, {\n${body.replace(/^ {4}/gm, '  ')}\n    });\n    ${END}`

const start = source.indexOf(BEGIN)
const current = start === -1 ? '' : source.slice(start, source.indexOf(END) + END.length)

if (process.argv.includes('--check')) {
  if (current !== block) {
    console.error('client.js is out of date: run `node scripts/merge-i18n.mjs`')
    process.exit(1)
  }
  console.log(`locales in sync: ${locales.map((entry) => `${entry.lang}(${entry.count})`).join(' ')}`)
  process.exit(0)
}

if (start !== -1) {
  const end = source.indexOf(END) + END.length
  source = `${source.slice(0, start)}${block}${source.slice(end)}`
} else {
  const anchor = '\n    const localeOf = (tag) => {'
  const at = source.indexOf(anchor)
  if (at === -1) throw new Error('could not find the insertion point after DICT')
  source = `${source.slice(0, at)}\n\n${block}\n${source.slice(at)}`
}
fs.writeFileSync(clientPath, source)

console.log(`inlined ${locales.length} locales: ${locales.map((entry) => `${entry.lang}(${entry.count})`).join(' ')}`)
