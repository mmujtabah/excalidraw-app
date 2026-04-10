const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
  saveImage: (base64, ext) => ipcRenderer.invoke("save-image", base64, ext),
  openFile: () => ipcRenderer.invoke("open-file"),
  onTriggerSave: (callback) => ipcRenderer.on("trigger-save", callback),
});