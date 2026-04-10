const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const url = require("url");
const path = require("path");

const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://127.0.0.1:3001";

let devServerProcess = null;
let staticServer = null;
let isQuitting = false;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isServerReady = (targetUrl) =>
  new Promise((resolve) => {
    const req = http.get(targetUrl, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });

const waitForServer = async (targetUrl, timeoutMs) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(targetUrl)) {
      return;
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for server at ${targetUrl}`);
};

const startDevServerIfNeeded = async () => {
  if (await isServerReady(DEV_SERVER_URL)) {
    return;
  }

  const command =
    process.platform === "win32" ? "cmd.exe" : "npx";
  const args =
    process.platform === "win32"
      ? [
          "/d",
          "/s",
          "/c",
          "npx -y yarn@1.22.22 --cwd ./excalidraw-app start --host 127.0.0.1 --port 3001",
        ]
      : [
          "-y",
          "yarn@1.22.22",
          "--cwd",
          "./excalidraw-app",
          "start",
          "--host",
          "127.0.0.1",
          "--port",
          "3001",
        ];

  try {
    devServerProcess = spawn(command, args, {
      cwd: app.getAppPath(),
      env: {
        ...process.env,
        EXCALIDRAW_DESKTOP: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(`Unable to start dev server: ${error.message}`);
  }

  if (devServerProcess.stdout) {
    devServerProcess.stdout.on("data", (chunk) => {
      console.log(chunk.toString());
    });
  }

  if (devServerProcess.stderr) {
    devServerProcess.stderr.on("data", (chunk) => {
      console.error(chunk.toString());
    });
  }

  const startupError = new Promise((_, reject) => {
    devServerProcess.once("error", (error) => {
      reject(new Error(`Dev server failed to start: ${error.message}`));
    });
    devServerProcess.once("exit", (code) => {
      if (!isQuitting && code !== 0) {
        reject(new Error(`Dev server exited early with code ${code}`));
      }
    });
  });

  devServerProcess.on("exit", (code) => {
    if (!isQuitting && code !== 0) {
      console.error(`Dev server exited with code ${code}`);
    }
    devServerProcess = null;
  });

  await Promise.race([
    waitForServer(DEV_SERVER_URL, 120000),
    startupError,
  ]);
};

const stopDevServer = () => {
  if (!devServerProcess?.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(devServerProcess.pid), "/t", "/f"]);
  } else {
    devServerProcess.kill("SIGTERM");
  }
};

const startStaticServer = () =>
  new Promise((resolve, reject) => {
    const buildRoot = path.join(app.getAppPath(), "excalidraw-app", "build");

    if (!fs.existsSync(buildRoot)) {
      reject(new Error(`Build output not found at ${buildRoot}`));
      return;
    }

    staticServer = http.createServer((req, res) => {
      const parsed = url.parse(req.url || "/");
      const requestPath = decodeURIComponent(parsed.pathname || "/");

      const candidatePath = path.join(
        buildRoot,
        requestPath === "/" ? "index.html" : requestPath,
      );
      const normalizedPath = path.normalize(candidatePath);

      const safePath = normalizedPath.startsWith(buildRoot)
        ? normalizedPath
        : path.join(buildRoot, "index.html");

      let filePath = safePath;
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(buildRoot, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        res.statusCode = 500;
        res.end("Internal server error");
      });
      stream.pipe(res);
    });

    staticServer.once("error", reject);
    staticServer.listen(0, "127.0.0.1", () => {
      const address = staticServer.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });

const stopStaticServer = () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
};

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  try {
    if (isDev) {
      await startDevServerIfNeeded();
      await win.loadURL(DEV_SERVER_URL);
      return;
    }

    const localUrl = await startStaticServer();
    await win.loadURL(localUrl);
  } catch (error) {
    dialog.showErrorBox(
      "Failed to start desktop app",
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  stopDevServer();
  stopStaticServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
