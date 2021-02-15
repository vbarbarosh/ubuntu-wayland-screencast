const electron = require('electron');

electron.contextBridge.exposeInMainWorld('gateway', {
    start_screencast: function () {
        return electron.ipcRenderer.invoke('start_screencast');
    },
    stop_screencast: function () {
        return electron.ipcRenderer.invoke('stop_screencast');
    },
});
