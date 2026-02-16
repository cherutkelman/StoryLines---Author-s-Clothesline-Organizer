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

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  win.setMenuBarVisibility(false);
}

// לא להוריד אוטומטית
autoUpdater.autoDownload = false;

app.whenReady().then(() => {
  createWindow();

  // בדיקת עדכון בעת פתיחה
  autoUpdater.checkForUpdates();

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

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'העדכון מוכן',
      message: 'העדכון הורד בהצלחה.',
      detail: 'להפעיל מחדש ולהתקין עכשיו?',
      buttons: ['כן', 'לא'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('autoUpdater error:', err);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
