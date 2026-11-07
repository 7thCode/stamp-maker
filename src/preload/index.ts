import { contextBridge, ipcRenderer } from 'electron'
import type { StampApi } from '../shared/api'

const api: StampApi = {
  listProjects: () => ipcRenderer.invoke('project:list'),
  createProject: (name) => ipcRenderer.invoke('project:create', name),
  loadProject: (id) => ipcRenderer.invoke('project:load', id),
  saveProject: (p) => ipcRenderer.invoke('project:save', p),
  importReferences: (id) => ipcRenderer.invoke('project:importReferences', id),
  readImage: (id, rel) => ipcRenderer.invoke('image:read', id, rel),
  listGenerators: () => ipcRenderer.invoke('generator:list'),
  generateSticker: (id, sid) => ipcRenderer.invoke('sticker:generate', id, sid),
  importStickerImage: (id, sid) => ipcRenderer.invoke('sticker:importImage', id, sid),
  removeBackground: (id, sid) => ipcRenderer.invoke('sticker:removeBackground', id, sid),
  translatePrompts: (id) => ipcRenderer.invoke('prompts:translate', id),
  exportSet: (req) => ipcRenderer.invoke('export:run', req)
}

contextBridge.exposeInMainWorld('stamp', api)
