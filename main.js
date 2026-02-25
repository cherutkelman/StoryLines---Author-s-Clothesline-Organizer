
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "StoryLines - מארגן עלילה לסופרים",
    backgroundColor: '#fdf6e3',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // IPC handler for file dialog
  ipcMain.handle('open-image-dialog', async () => {
    console.log('Main: open-image-dialog called');
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }
      ]
    });

    console.log('Main: dialog result:', result);

    if (result.canceled || result.filePaths.length === 0) {
      console.log('Main: dialog canceled');
      return null;
    }

    const filePath = result.filePaths[0];
    console.log('Main: selected path:', filePath);

    try {
      const data = fs.readFileSync(filePath);
      const extension = path.extname(filePath).substring(1);
      const base64 = data.toString('base64');
      const dataUrl = `data:image/${extension};base64,${base64}`;
      console.log('Main: file read and converted to base64');
      return dataUrl;
    } catch (error) {
      console.error('Main: error reading file:', error);
      throw error;
    }
  });

  // In production, load the built index.html
  // In development, you might want to load the vite dev server URL
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Remove the default menu bar for a cleaner look
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
