import { contextBridge, ipcRenderer } from 'electron'
import type { SdSetupState, StampApi } from '../shared/api'

const api: StampApi = {
  listProjects: () => ipcRenderer.invoke('project:list'),
  createProject: (name) => ipcRenderer.invoke('project:create', name),
  loadProject: (id) => ipcRenderer.invoke('project:load', id),
  saveProject: (p) => ipcRenderer.invoke('project:save', p),
  deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
  removeReference: (id, rel) => ipcRenderer.invoke('project:removeReference', id, rel),
  importReferences: (id) => ipcRenderer.invoke('project:importReferences', id),
  readImage: (id, rel) => ipcRenderer.invoke('image:read', id, rel),
  listGenerators: () => ipcRenderer.invoke('generator:list'),
  generateSticker: (id, sid) => ipcRenderer.invoke('sticker:generate', id, sid),
  importStickerImage: (id, sid) => ipcRenderer.invoke('sticker:importImage', id, sid),
  removeBackground: (id, sid) => ipcRenderer.invoke('sticker:removeBackground', id, sid),
  translatePrompts: (id) => ipcRenderer.invoke('prompts:translate', id),
  translateText: (text) => ipcRenderer.invoke('text:translate', text),
  generateReferenceCandidate: (id, d) => ipcRenderer.invoke('reference:generate', id, d),
  adoptReferenceCandidate: (id, rel) => ipcRenderer.invoke('reference:adopt', id, rel),
  openCreatorsMarket: () => ipcRenderer.invoke('publish:openCreatorsMarket'),
  exportSet: (req) => ipcRenderer.invoke('export:run', req),
  getSdSetup: () => ipcRenderer.invoke('sdSetup:get'),
  retrySdSetup: () => ipcRenderer.invoke('sdSetup:retry'),
  onSdSetup: (listener) => {
    const handler = (_e: Electron.IpcRendererEvent, state: SdSetupState): void => listener(state)
    ipcRenderer.on('sdSetup:state', handler)
    return () => { ipcRenderer.removeListener('sdSetup:state', handler) }
  }
}

contextBridge.exposeInMainWorld('stamp', api)
