const { app, BrowserWindow, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow = null;
let backend = null;

if (process.platform === 'win32') app.setAppUserModelId('com.profesor.ia');

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function startBackend() {
  // El backend se ejecuta dentro del proceso Electron para que la aplicación
  // no dependa de Node instalado ni de una terminal separada.
  process.env.PROFESOR_IA_DATA_DIR = path.join(app.getPath('userData'), 'data');
  process.env.PROFESOR_IA_STATIC_DIR = path.join(__dirname, '..', 'client', 'dist');
  const serverEntry = path.join(__dirname, '..', 'server', 'src', 'index.js');
  const module = await import(pathToFileURL(serverEntry).href);
  backend = await module.startServer({ port: 0, host: '127.0.0.1' });
  const address = backend.address();
  const port = typeof address === 'object' && address ? address.port : 3001;
  return `http://127.0.0.1:${port}`;
}

function configurePermissions() {
  const permissionHandler = (webContents, permission, callback) => {
    const url = webContents.getURL();
    const trusted = isLocalUrl(url) || url.startsWith('capacitor://');
    if (trusted && ['media', 'audioCapture', 'clipboard-sanitized-write', 'fullscreen'].includes(permission)) {
      callback(true);
      return;
    }
    callback(false);
  };
  session.defaultSession.setPermissionRequestHandler(permissionHandler);
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return isLocalUrl(requestingOrigin) && ['media', 'audioCapture', 'clipboard-sanitized-write', 'fullscreen'].includes(permission);
  });
}

async function waitForVite(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite todavía está arrancando.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Vite no respondió a tiempo. Ejecuta nuevamente `npm run electron:dev`.');
}

async function createWindow() {
  configurePermissions();
  const backendUrl = await startBackend();
  const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173';
  const isDevRenderer = !app.isPackaged || process.env.ELECTRON_RENDERER_URL;
  if (isDevRenderer) await waitForVite(rendererUrl);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: '#020617',
    title: 'Profesor IA',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  const loadUrl = isDevRenderer ? rendererUrl : backendUrl;
  await mainWindow.loadURL(loadUrl);
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error('No se pudo iniciar Profesor IA:', error);
    await shell.openPath(path.join(__dirname, '..', 'INICIAR-PROFESOR-IA.bat'));
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  if (backend) {
    const serverModule = await import(pathToFileURL(path.join(__dirname, '..', 'server', 'src', 'index.js')).href).catch(() => null);
    await serverModule?.stopServer?.();
  }
});
