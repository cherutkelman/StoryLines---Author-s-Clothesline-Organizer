

const { app, BrowserWindow, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
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

autoUpdater.on("checking-for-update", () => {
  console.log("[updater] checking-for-update");
});

autoUpdater.on("update-available", () => {
  console.log("[updater] update-available");
  dialog.showMessageBox({
    type: "info",
    title: "עדכון זמין",
    message: "נמצאה גרסה חדשה. להוריד עכשיו?",
    buttons: ["כן", "לא"],
    defaultId: 0
  }).then((r) => {
    if (r.response === 0) autoUpdater.downloadUpdate();
  });
});

autoUpdater.on("update-not-available", () => {
  console.log("[updater] update-not-available");
  dialog.showMessageBox({
    type: "info",
    title: "אין עדכון",
    message: "אין כרגע עדכון זמין."
  });
});

autoUpdater.on("error", (err) => {
  console.error("[updater] error", err);
  dialog.showMessageBox({
    type: "error",
    title: "שגיאת עדכון",
    message: String(err)
  });
});

autoUpdater.on("update-downloaded", () => {
  console.log("[updater] update-downloaded");
  dialog.showMessageBox({
    type: "info",
    title: "העדכון ירד",
    message: "העדכון הורד. התוכנה תיסגר ותעדכן.",
    buttons: ["אישור"]
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

  autoUpdater.checkForUpdates(); // בדיקת עדכון בהפעלה

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
