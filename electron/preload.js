const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
  openFile: () => ipcRenderer.invoke("open-file"),
  onTriggerSave: (callback) => ipcRenderer.on("trigger-save", callback),
});