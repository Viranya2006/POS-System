const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { pathToFileURL } = require('url')

// Keep a global reference of the window object
let mainWindow

const isDev = !app.isPackaged

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false
    },
    show: false,
    titleBarStyle: 'default'
  })

  // Load the app
  if (isDev) {
    const startUrl = 'http://localhost:5173'
    console.log('Loading URL:', startUrl)
    mainWindow.loadURL(startUrl)
  } else {
    // Create local server and load from it
    createLocalServer().then((serverUrl) => {
      console.log('Loading from local server:', serverUrl)
      mainWindow.loadURL(serverUrl)
    }).catch((error) => {
      console.error('Failed to create local server:', error)
      // Fallback to file protocol
      const indexPath = path.join(__dirname, 'dist', 'index.html')
      const startUrl = pathToFileURL(indexPath).href
      console.log('Fallback to file URL:', startUrl)
      mainWindow.loadURL(startUrl)
    })
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Open DevTools only in development
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Add debugging and error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('Failed to load:', errorCode, errorDescription, validatedURL)
    if (isDev && validatedURL.includes('localhost:5173')) {
      console.log('Dev server not ready, retrying in 2 seconds...')
      setTimeout(() => {
        mainWindow.loadURL(startUrl).catch(console.error)
      }, 2000)
    }
  })

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully')
  })

  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console.${level}: ${message}`)
  })

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Create a simple HTTP server for production
function createLocalServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url)
      
      // Handle SPA routing - if file doesn't exist and no extension, serve index.html
      if (!fs.existsSync(filePath) && !path.extname(req.url)) {
        filePath = path.join(__dirname, 'dist', 'index.html')
      }
      
      // Get file extension for content type
      const ext = path.extname(filePath).toLowerCase()
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      }
      
      const contentType = contentTypes[ext] || 'application/octet-stream'
      
      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            // For SPA routing, serve index.html for unknown routes
            const indexPath = path.join(__dirname, 'dist', 'index.html')
            fs.readFile(indexPath, (indexError, indexContent) => {
              if (indexError) {
                res.writeHead(404)
                res.end('File not found')
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(indexContent, 'utf-8')
              }
            })
          } else {
            res.writeHead(500)
            res.end('Server error: ' + error.code)
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(content, 'utf-8')
        }
      })
    })
    
    server.listen(0, 'localhost', () => {
      const port = server.address().port
      console.log('Local server running on port:', port)
      resolve(`http://localhost:${port}`)
    })
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for printing
ipcMain.handle('print-receipt', async (event, htmlContent, options = {}) => {
  try {
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
    
    const printOptions = {
      silent: options.silent || false,
      printBackground: true,
      margins: {
        marginType: 'custom',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    }

    if (options.paperSize === 'thermal') {
      printOptions.pageSize = {
        width: 80000, // 80mm in micrometers
        height: 200000 // Auto height
      }
    }

    await printWindow.webContents.print(printOptions)
    printWindow.close()
    
    return { success: true }
  } catch (error) {
    console.error('Print error:', error)
    return { success: false, error: error.message }
  }
})

// IPC handler for showing save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

// IPC handler for showing open dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})
