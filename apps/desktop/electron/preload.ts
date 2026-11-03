// Minimal secure preload script
// Context Isolation is enabled, Node Integration is disabled.
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, scoped desktop APIs to renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  maximize: () => ipcRenderer.send('window-control', 'maximize'),
  close: () => ipcRenderer.send('window-control', 'close'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateStatus: (callback: (status: { event: string; info?: any }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});

