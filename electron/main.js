const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    resizable: true,
    fullscreenable: true,
    backgroundColor: '#0a0a1a',
    title: 'Los Fragmentos de Nuestra Historia',
    icon: path.join(__dirname, '..', 'public', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.setMenuBarVisibility(false);
  mainWindow.maximize();

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'F11') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return;
    }

    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
  });
}

function getSavePath() {
  const saveDir = path.join(app.getPath('userData'), 'saves');
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
  return path.join(saveDir, 'save.json');
}

ipcMain.handle('save-game', async (_event, data) => {
  try {
    fs.writeFileSync(getSavePath(), JSON.stringify(data, null, 2));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-game', async () => {
  try {
    const p = getSavePath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
    return null;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('has-save', async () => {
  return fs.existsSync(getSavePath());
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
