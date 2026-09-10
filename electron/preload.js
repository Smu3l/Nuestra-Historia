const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('saveAPI', {
  save: (data) => ipcRenderer.invoke('save-game', data),
  load: () => ipcRenderer.invoke('load-game'),
  hasSave: () => ipcRenderer.invoke('has-save'),
});
