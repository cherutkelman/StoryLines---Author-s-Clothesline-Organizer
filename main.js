
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { autoUpdater } = require('electron-updater');

function focusStoryLinesWindow() {
  const win = BrowserWindow.getAllWindows().find(window => {
    return window && !window.isDestroyed() && window.isVisible();
  }) || BrowserWindow.getAllWindows().find(window => {
    return window && !window.isDestroyed();
  });

  if (!win) {
    return;
  }

  if (win.isMinimized()) {
    win.restore();
  }

  win.show();

  if (typeof app.focus === 'function') {
    app.focus();
  }

  win.focus();

  // Windows/Chrome sometimes prevent normal focus stealing.
  // Bring the app above the browser briefly, then immediately restore normal behavior.
  win.setAlwaysOnTop(true);
  win.show();
  win.focus();

  setTimeout(() => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(false);
      win.focus();
    }
  }, 700);
}

function startOAuthCodeListener(redirectUri) {
  let redirectUrl;

  try {
    redirectUrl = new URL(redirectUri);
  } catch (error) {
    throw new Error('Invalid OAuth redirect URI');
  }

  if (redirectUrl.protocol !== 'http:' || redirectUrl.hostname !== '127.0.0.1') {
    throw new Error('OAuth redirect URI must use http://127.0.0.1');
  }

  const port = Number(redirectUrl.port || 80);
  let settled = false;
  let resolveReady;
  let rejectReady;
  let server;

  const readyPromise = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const codePromise = new Promise((resolve, reject) => {
    const finish = (error, code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      if (server) {
        server.close(() => {
          if (error) {
            reject(error);
          } else {
            resolve(code);
          }
        });
        return;
      }

      if (error) {
        reject(error);
      } else {
        resolve(code);
      }
    };

    const timeoutId = setTimeout(() => {
      finish(new Error('OAuth callback timed out'));
    }, 5 * 60 * 1000);

    server = http.createServer((req, res) => {
      try {
        const callbackUrl = new URL(req.url || '/', redirectUri);
        const error = callbackUrl.searchParams.get('error');
        const code = callbackUrl.searchParams.get('code');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Google sign-in failed</h1><p>You can return to StoryLines.</p>');
          finish(new Error(`OAuth callback error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Missing authorization code</h1><p>You can return to StoryLines.</p>');
          finish(new Error('OAuth callback did not include a code'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!doctype html>
          <html lang="he" dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>StoryLines</title>
          </head>
          <body>
            <h1>ההתחברות הושלמה</h1>
            <p id="fallback" style="display:none;">החיבור ל־StoryLines יתרחש תוך זמן קצר.</p>

            <script>
              setTimeout(function () {
                window.open('', '_self');
                window.close();
              }, 300);

              setTimeout(function () {
                var fallback = document.getElementById('fallback');
                if (fallback) {
                  fallback.style.display = 'block';
                }
              }, 1200);
            </script>
          </body>
          </html>
          `);
        focusStoryLinesWindow();  
        finish(null, code);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Google sign-in failed</h1><p>You can return to StoryLines.</p>');
        finish(error);
      }
    });

    server.on('error', (error) => {
      console.error('Main: OAuth callback server error:', error);
      rejectReady(error);
      finish(error);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Main: OAuth callback server listening on 127.0.0.1:${port}`);
      resolveReady();
    });
  });

  return { readyPromise, codePromise };
}

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

  // Auto-update check
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    win.webContents.send('update_available');
  });

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded');
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

  ipcMain.handle('open-external-url', async (_event, url) => {
    try {
      console.log('Main: open-external-url called');
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new Error('Invalid external URL');
      }

      const authUrl = new URL(url);
      const redirectUri = authUrl.searchParams.get('redirect_uri');
      if (!redirectUri) {
        throw new Error('Missing OAuth redirect URI');
      }

      const { readyPromise, codePromise } = startOAuthCodeListener(redirectUri);
      try {
        await readyPromise;
      } catch (error) {
        codePromise.catch(() => {});
        throw error;
      }
      await shell.openExternal(url);
      return await codePromise;
    } catch (error) {
      console.error('Main: error opening external URL:', error);
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

  ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
  });
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
