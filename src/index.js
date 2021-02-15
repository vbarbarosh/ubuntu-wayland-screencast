const dbus = require('dbus');
const electron = require('electron');
const path = require('path');

main();

async function main()
{
    const dbus_session = dbus.getBus('session');

    await electron.app.whenReady();

    electron.ipcMain.handle('start_screencast', function (event) {
        dbus_session.getInterface('org.gnome.Shell', '/org/gnome/Shell/Screencast', 'org.gnome.Shell.Screencast', function (error, iface) {
            // https://gitlab.gnome.org/GNOME/gnome-shell/blob/master/data/dbus-interfaces/org.gnome.Shell.Screencast.xml#L38
            const file_template = path.resolve(process.cwd(), 'a.webm');
            const options = {};
            iface.Screencast(file_template, options, function (error, [success, filename_used]) {
                console.log({error, success, filename_used});
            });
        });
    });
    electron.ipcMain.handle('stop_screencast', function (event) {
        dbus_session.getInterface('org.gnome.Shell', '/org/gnome/Shell/Screencast', 'org.gnome.Shell.Screencast', function (error, iface) {
            // https://gitlab.gnome.org/GNOME/gnome-shell/blob/master/data/dbus-interfaces/org.gnome.Shell.Screencast.xml#L90
            iface.StopScreencast(function (error, success) {
                // noinspection EqualityComparisonWithCoercionJS
                if (error && error.dbusName == 'org.freedesktop.DBus.Error.NoReply') {
                    // {
                    //     error: DBusError: Did not receive a reply. Possible causes include: the remote application did not send a reply, the message bus security policy blocked the reply, the reply timeout expired, or the network connection was broken.
                    //     at new DBusError ([...]/ubuntu-wayland-screencast/node_modules/dbus/lib/error.js:9:9)
                    //     at createError ([...]/ubuntu-wayland-screencast/node_modules/dbus/lib/bus.js:243:9) {
                    //     dbusName: 'org.freedesktop.DBus.Error.NoReply'
                    // }
                    console.log('org.freedesktop.DBus.Error.NoReply');
                }
                else {
                    console.log({error, success});
                }
            });
        });
    });

    const win = new electron.BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            // (node:127005) electron: The default of contextIsolation
            // is deprecated and will be changing from false to true
            // in a future release of Electron. See
            // https://github.com/electron/electron/issues/23506 for
            // more information
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.resolve(__dirname, 'renderer.js'),
        },
        backgroundColor: 'white',
    });
    // win.webContents.openDevTools();

    win.loadFile(path.resolve(__dirname, 'index.html'));
    await once(win, {
        closed: function () {
            console.log('__closed');
        },
        // blur: function () {
        //     console.log('__blur');
        // },
    });

    dbus_session.disconnect();
    electron.app.exit(0);
}

async function once(inst, spec)
{
    const listeners = [];
    return new Promise(function (resolve) {
        Object.keys(spec).forEach(function (name) {
            async function handler(...args) {
                listeners.forEach(v => inst.off(v.name, v.handler));
                resolve(await spec[name](...args));
            }
            listeners.push({name, handler});
            inst.on(name, handler);
        });
    });
}
