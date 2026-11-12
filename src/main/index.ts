import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import type { ExportRequest, ExportResponse } from '../shared/api'
import { adoptedStickers, findSlot, imageSlots, updateSlot } from '../shared/project'
import { CREATORS_MARKET_URL } from '../shared/publish'
import type { Project } from '../shared/types'
import { buildExport } from './exporter'
import { exportDirPath } from './exportDir'
import { getGenerator, listGenerators, pickRandomReference } from './generators'
import { finalizeImage, removeBackground } from './imagePipeline'
import { ProjectStore } from './projectStore'
import { generateReferenceCandidate } from './referenceGen'
import { MODEL_SPECS } from './sdModels'
import { SD_BIN, SD_MODEL_DIR, missingSdFiles } from './sdRunner'
import { SdSetup } from './sdSetup'
import { translateAll } from './translator'

let store: ProjectStore
let sdSetup: SdSetup

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

// 削除前の確認。キャンセルなら false
async function confirmDelete(message: string, detail: string): Promise<boolean> {
  const options = {
    type: 'warning' as const, buttons: ['削除', 'キャンセル'], defaultId: 1, cancelId: 1, message, detail
  }
  const win = BrowserWindow.getFocusedWindow()
  const r = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
  return r.response === 0
}

function registerIpc(): void {
  ipcMain.handle('sdSetup:get', () => sdSetup.getState())
  ipcMain.handle('sdSetup:retry', () => sdSetup.start())
  ipcMain.handle('project:list', () => store.list())
  ipcMain.handle('project:create', (_e, name: string) => store.create(name))
  ipcMain.handle('project:load', (_e, id: string) => store.load(id))
  ipcMain.handle('project:save', (_e, project: Project) => store.save(project))
  ipcMain.handle('generator:list', () => listGenerators())
  // 開く先は固定のURLのみ(画面から任意のURLは受け付けない)
  ipcMain.handle('publish:openCreatorsMarket', () => shell.openExternal(CREATORS_MARKET_URL))

  ipcMain.handle('project:delete', async (_e, id: string) => {
    const project = await store.load(id)
    const ok = await confirmDelete(`プロジェクト「${project.name}」を削除しますか?`, '参考画像・生成画像を含むすべてのデータが消えます。元に戻せません。')
    if (!ok) return false
    await store.remove(id)
    return true
  })

  ipcMain.handle('project:removeReference', async (_e, id: string, rel: string) => {
    const ok = await confirmDelete('この参考画像を削除しますか?', '生成済みのスタンプ画像には影響しません。元に戻せません。')
    return ok ? store.removeReference(id, rel) : null
  })

  ipcMain.handle('project:importReferences', async (_e, id: string) => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '画像', extensions: ['png', 'jpg', 'jpeg'] }]
    })
    if (r.canceled) return null
    const rels = await Promise.all(r.filePaths.map((p) => store.importReference(id, p)))
    const project = await store.load(id)
    return store.save({ ...project, referenceImages: [...project.referenceImages, ...rels] })
  })

  ipcMain.handle('image:read', async (_e, id: string, rel: string) => {
    const buf = await store.readImage(id, rel)
    const mime = rel.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  // 成功時は都度保存し、失敗しても他の画像・採用済み画像には影響しない
  ipcMain.handle('sticker:generate', async (_e, id: string, stickerId: string) => {
    let project = await store.load(id)
    const sticker = findSlot(project, stickerId)
    if (!sticker) throw new Error('スタンプが見つかりません')
    if (sticker.status === 'adopted' && sticker.imagePath) return project // 採用済みは上書きしない
    try {
      const refs = await Promise.all(pickRandomReference(project.referenceImages).map((r) => store.readImage(id, r)))
      const raw = await getGenerator(project.generator).generate({
        referenceImages: refs,
        // 英語欄が空なら入力そのまま(旧データや英語入力)
        characterTraits: project.character.keepTraitsEn || project.character.keepTraits,
        // 英語欄が空なら入力そのまま(旧データや英語入力)
        expression: sticker.expressionEn || sticker.expression,
        pose: sticker.poseEn || sticker.pose
      })
      const rel = join('images', `${stickerId}-${randomUUID()}.png`)
      await store.writeImage(id, rel, await finalizeImage(raw, 'sticker'))
      project = updateSlot(project, stickerId, { imagePath: rel, job: 'success', status: 'unchecked' })
    } catch (err) {
      project = updateSlot(project, stickerId, { job: 'failed' })
      await store.save(project)
      throw err
    }
    return store.save(project)
  })

  ipcMain.handle('sticker:importImage', async (_e, id: string, stickerId: string) => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '画像', extensions: ['png', 'jpg', 'jpeg'] }]
    })
    if (r.canceled) return null
    const raw = await readFile(r.filePaths[0])
    const rel = join('images', `${stickerId}-${randomUUID()}.png`)
    await store.writeImage(id, rel, await finalizeImage(raw, 'sticker'))
    const project = await store.load(id)
    return store.save(updateSlot(project, stickerId, { imagePath: rel, job: 'success', status: 'unchecked' }))
  })

  ipcMain.handle('sticker:removeBackground', async (_e, id: string, stickerId: string) => {
    const project = await store.load(id)
    const sticker = findSlot(project, stickerId)
    if (!sticker?.imagePath) throw new Error('画像がありません')
    const out = await removeBackground(await store.readImage(id, sticker.imagePath))
    const rel = join('images', `${stickerId}-${randomUUID()}.png`)
    await store.writeImage(id, rel, out)
    return store.save(updateSlot(project, stickerId, { imagePath: rel }))
  })

  // 日本語の表情・ポーズを英訳して英語欄へ入れる(英語欄は後から手で直せる)
  ipcMain.handle('prompts:translate', async (_e, id: string) => {
    const project = await store.load(id)
    const slots = imageSlots(project)
    const sources = slots.flatMap((s) => [s.expression, s.pose])
    const translated = await translateAll(sources, (url, init) => fetch(url, init))
    // スタンプ・メイン画像・タブ画像の順に、英訳結果を戻す
    const withEn = slots.map((s, i) => ({ ...s, expressionEn: translated[i * 2], poseEn: translated[i * 2 + 1] }))
    const count = project.stickers.length
    return store.save({ ...project, stickers: withEn.slice(0, count), mainImage: withEn[count], tabImage: withEn[count + 1] })
  })

  ipcMain.handle('text:translate', async (_e, text: string) => (await translateAll([text], (url, init) => fetch(url, init)))[0])

  ipcMain.handle('reference:generate', async (_e, id: string, description: string) =>
    store.saveCandidate(id, await generateReferenceCandidate(description)))

  ipcMain.handle('reference:adopt', async (_e, id: string, candidateRel: string) => {
    const rel = await store.adoptCandidate(id, candidateRel)
    const project = await store.load(id)
    return store.save({ ...project, referenceImages: [...project.referenceImages, rel] })
  })

  ipcMain.handle('export:run', async (_e, req: ExportRequest): Promise<ExportResponse> => {
    const project = await store.load(req.projectId)
    const order = adoptedStickers(project).map((s) => s.id)
    const byId = new Map(req.stickers.map((s) => [s.id, Buffer.from(s.png)]))
    const result = await buildExport({
      stickers: order.filter((sid) => byId.has(sid)).map((sid) => ({ id: sid, png: byId.get(sid) as Buffer })),
      main: Buffer.from(req.main),
      tab: Buffer.from(req.tab),
      sales: project.sales
    })
    if (!result.files || !result.zip) return { issues: result.issues, outputDir: null }

    const outDir = exportDirPath(app.getPath('downloads'), project.name, new Date())
    await mkdir(outDir, { recursive: true })
    for (const [name, data] of Object.entries(result.files)) await writeFile(join(outDir, name), data)
    await writeFile(join(outDir, 'stamps.zip'), result.zip)
    await writeFile(join(outDir, 'sales.json'), JSON.stringify(project.sales, null, 2), 'utf-8')
    shell.showItemInFolder(join(outDir, 'stamps.zip'))
    return { issues: result.issues, outputDir: outDir }
  })
}

// 開発版・パッケージ版で保存先が分かれないよう、データの置き場所を固定する
app.setPath('userData', join(app.getPath('appData'), 'StampMaker'))

app.whenReady().then(() => {
  store = new ProjectStore(join(app.getPath('userData'), 'projects'))
  sdSetup = new SdSetup({
    models: MODEL_SPECS,
    modelDir: SD_MODEL_DIR,
    binPath: SD_BIN,
    isReady: () => missingSdFiles().length === 0,
    fetchFn: (url, init) => fetch(url, init)
  })
  sdSetup.subscribe((state) => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('sdSetup:state', state)
  })
  registerIpc()
  createWindow()
  // 初回起動などでモデルが無ければ、自動でダウンロードする
  void sdSetup.start()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
