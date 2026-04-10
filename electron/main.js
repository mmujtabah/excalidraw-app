const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    win.loadURL("http://localhost:5173");
  }

  win.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.key === "s") {
      win.webContents.send("trigger-save");
      event.preventDefault();
    }
    if (input.control && input.key === "o") {
      win.webContents.send("trigger-open");
      event.preventDefault();
    }
  });
}

ipcMain.handle("save-file", async (event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save Drawing",
    defaultPath: "drawing.excalidraw",
    filters: [{ name: "Excalidraw", extensions: ["excalidraw"] }],
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, data, "utf-8");
    return filePath;
  }
  return null;
});

ipcMain.handle("save-image", async (event, base64, ext) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Export Image",
    defaultPath: `drawing.${ext}`,
    filters: [{ name: "Image", extensions: [ext] }],
  });
  if (!canceled && filePath) {
    const buffer = Buffer.from(base64.split(",")[1], "base64");
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
  return null;
});

ipcMain.handle("open-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open Drawing",
    filters: [{ name: "Excalidraw", extensions: ["excalidraw"] }],
    properties: ["openFile"],
  });
  if (!canceled && filePaths.length > 0) {
    return fs.readFileSync(filePaths[0], "utf-8");
  }
  return null;
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());