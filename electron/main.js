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

  // intercept Ctrl+S
  win.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.key === "s") {
      win.webContents.send("trigger-save");
      event.preventDefault();
    }
  });
}

// save file dialog
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

// open file dialog
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