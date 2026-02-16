
const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

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
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'עדכון זמין',
      message: 'יש גרסה חדשה של StoryLines.',
      detail: 'רוצה להוריד את העדכון עכשיו?',
      buttons: ['הורד עכשיו', 'אחר כך'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    // אפשר להשאיר ריק כדי לא להציק
  });

  autoUpdater.on('error', (err) => {
    // אפשר להדפיס לקונסול בלבד, כדי לא להבהיל משתמשים
    console.error('autoUpdater error:', err);
  });

  // בדיקה בעת פתיחת האפליקציה
  autoUpdater.checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
