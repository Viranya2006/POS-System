const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Printing
  printReceipt: (htmlContent, options) => ipcRenderer.invoke('print-receipt', htmlContent, options),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-sale', callback);
    ipcRenderer.on('menu-print', callback);
    ipcRenderer.on('navigate-to', callback);
    ipcRenderer.on('show-about', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Platform info
  platform: process.platform,
  
  // App version
  getVersion: () => '1.0.0'
});
