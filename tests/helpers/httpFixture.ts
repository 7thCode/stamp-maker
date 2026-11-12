import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

export type Behavior = 'normal' | 'ignoreRange' | 'truncate' | 'notFound' | 'serverError' | 'rangeNotSatisfiable'

export interface Fixture {
  baseUrl: string
  // 受け取った Range ヘッダー(無ければ null)の履歴
  ranges: Array<string | null>
  behavior: Behavior
  close(): Promise<void>
}

// パスごとの内容を返すテスト用の HTTP サーバー。Range に対応し、いろいろな不調を再現できる
export async function startFixture(files: Record<string, Buffer>): Promise<Fixture> {
  const state = { behavior: 'normal' as Behavior, ranges: [] as Array<string | null> }
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    const body = files[req.url ?? '']
    const range = req.headers.range ?? null
    state.ranges.push(range)
    if (!body || state.behavior === 'notFound') { res.writeHead(404).end(); return }
    if (state.behavior === 'serverError') { res.writeHead(500).end(); return }
    if (state.behavior === 'rangeNotSatisfiable' && range) { res.writeHead(416).end(); return }
    const start = state.behavior !== 'ignoreRange' && range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0
    const slice = body.subarray(start)
    if (start > 0) {
      res.writeHead(206, { 'content-length': slice.length, 'content-range': `bytes ${start}-${body.length - 1}/${body.length}` })
    } else {
      res.writeHead(200, { 'content-length': body.length })
    }
    if (state.behavior === 'truncate') {
      res.write(slice.subarray(0, Math.floor(slice.length / 2)))
      setTimeout(() => res.destroy(), 20)
      return
    }
    res.end(slice)
  }
  const server: Server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    ranges: state.ranges,
    get behavior() { return state.behavior },
    set behavior(b: Behavior) { state.behavior = b },
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()) })
  }
}
