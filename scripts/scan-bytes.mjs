// Byte-level search in app.asar: matches UTF-8, UTF-16LE and \uXXXX escaped forms
// of the same needle, so a Chinese UI string can be found wherever it is compiled.
import { readFileSync } from 'node:fs'

const asar = 'D:/APP/DSH-NEXT/DSH NEXT/resources/app.asar'
// hex code points, e.g. 4e0a6e38 -> 上游
const needle = process.argv[2]
if (!needle) throw new Error('needle hex required')
const chars = needle.match(/.{4}/g).map((hex) => String.fromCharCode(parseInt(hex, 16)))
const variants = [
  ['utf8', Buffer.from(chars.join(''), 'utf8')],
  ['utf16le', Buffer.from(chars.join(''), 'utf16le')],
  ['escaped', Buffer.from(chars.map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join(''), 'latin1')],
]
const buf = readFileSync(asar)
for (const [label, bytes] of variants) {
  let count = 0
  let at = buf.indexOf(bytes)
  const first = at
  while (at >= 0 && count < 200) {
    count += 1
    at = buf.indexOf(bytes, at + 1)
  }
  console.log(`${label}: ${count}${first >= 0 ? ` first=${first}` : ''}`)
  if (first >= 0 && count > 0 && count < 40) {
    const slice = buf.subarray(Math.max(0, first - 160), first + 200)
    console.log('  ctx:', slice.toString('utf8').replace(/\s+/g, ' '))
  }
}
