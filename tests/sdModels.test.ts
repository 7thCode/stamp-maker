import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { downloadFile, type FetchFn } from '../src/main/sdModels'
import { startFixture, type Fixture } from './helpers/httpFixture'

const realFetch: FetchFn = (url, init) => fetch(url, init)
const BODY = Buffer.from(Array.from({ length: 200_000 }, (_, i) => i % 251))

let dir: string
let server: Fixture
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sdmodels-'))
  server = await startFixture({ '/model.bin': BODY })
})
afterEach(async () => {
  await server.close()
  rmSync(dir, { recursive: true, force: true })
})

const url = (): string => `${server.baseUrl}/model.bin`

describe('downloadFile', () => {
  it('全体を取得して dest に置き、.part を残さない。進み具合を知らせる', async () => {
    const dest = join(dir, 'm.bin')
    const seen: Array<[number, number | null]> = []
    await downloadFile(url(), dest, realFetch, (done, total) => seen.push([done, total]))
    expect(readFileSync(dest).equals(BODY)).toBe(true)
    expect(existsSync(`${dest}.part`)).toBe(false)
    expect(seen.at(-1)).toEqual([BODY.length, BODY.length])
  })

  it('前回の続き(.part)があれば、Range で続きから取得する', async () => {
    const dest = join(dir, 'm.bin')
    writeFileSync(`${dest}.part`, BODY.subarray(0, 50_000))
    await downloadFile(url(), dest, realFetch, () => {})
    expect(server.ranges).toEqual(['bytes=50000-'])
    expect(readFileSync(dest).equals(BODY)).toBe(true)
  })

  it('サーバーが Range を無視(200)しても、最初から書き直して正しい内容にする', async () => {
    const dest = join(dir, 'm.bin')
    writeFileSync(`${dest}.part`, Buffer.alloc(30_000, 7))
    server.behavior = 'ignoreRange'
    await downloadFile(url(), dest, realFetch, () => {})
    expect(readFileSync(dest).equals(BODY)).toBe(true)
  })

  it('続きの位置が範囲外(416)なら、.part を捨てて最初から取り直す', async () => {
    const dest = join(dir, 'm.bin')
    writeFileSync(`${dest}.part`, Buffer.alloc(BODY.length + 10, 1))
    server.behavior = 'rangeNotSatisfiable'
    await downloadFile(url(), dest, realFetch, () => {})
    expect(readFileSync(dest).equals(BODY)).toBe(true)
    expect(server.ranges).toHaveLength(2)
    expect(server.ranges[1]).toBeNull()
  })

  it('途中で切れたら失敗にし、dest は作らず .part を残す(再試行で続きから行うため)', async () => {
    const dest = join(dir, 'm.bin')
    server.behavior = 'truncate'
    await expect(downloadFile(url(), dest, realFetch, () => {})).rejects.toThrow()
    expect(existsSync(dest)).toBe(false)
    expect(existsSync(`${dest}.part`)).toBe(true)
  })

  it('HTTP エラーは状態コードを示す', async () => {
    server.behavior = 'notFound'
    await expect(downloadFile(url(), join(dir, 'm.bin'), realFetch, () => {})).rejects.toThrow('HTTP 404')
  })
})
