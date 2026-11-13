// Scan app.asar for a literal needle and print surrounding text.
// Usage: node scripts/scan-asar.mjs <needle> [before] [after] [maxHits]
import { readFileSync } from 'node:fs'

const asar = 'D:/APP/DSH-NEXT/DSH NEXT/resources/app.asar'
const raw = process.argv.slice(2)
// Non-ASCII needles cannot survive argv on a GBK console, so accept "u:4e0a6e38" hex.
const decode = (value) => (value.startsWith('u:')
  ? value.slice(2).match(/.{4}/g).map((hex) => String.fromCharCode(parseInt(hex, 16))).join('')
  : value)
const [needle, before = '200', after = '300', maxHits = '12'] = raw.map((value, index) => (index === 0 ? decode(value) : value))
if (!needle) throw new Error('needle required')

const buf = readFileSync(asar)
const text = buf.toString('latin1')
const hits = []
let from = 0
for (let i = 0; i < Number(maxHits); i += 1) {
  const at = text.indexOf(needle, from)
  if (at < 0) break
  hits.push(at)
  from = at + needle.length
}
console.log(`hits=${hits.length}`)
for (const at of hits) {
  const slice = buf.subarray(Math.max(0, at - Number(before)), at + Number(after)).toString('utf8')
  console.log('---', at, '---')
  console.log(slice.replace(/\s+/g, ' '))
}
