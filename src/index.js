'use strict';

// nodejsのモジュール
const path = require('path');
const fs = require('fs');

// npmのモジュール
const upath = require('upath');

// Electronのモジュール
const electron = require("electron");
const app = electron.app;
const Tray = electron.Tray;
const Menu = electron.Menu;
const BrowserWindow = electron.BrowserWindow;
const globalShortcut = electron.globalShortcut;
const ipcMain = electron.ipcMain;

// WindowはGCされないようにグローバル宣言
let settingsWindow = null;
let invisibleWindow = null;
// trayIconもGCされないようにグローバル宣言
let trayIconPath = upath.join(__dirname, "images", "icon.png");
let trayIcon = null;
// 設定データがGCされないようにグローバル宣言
let settings = null;
// 設定ファイルのパス
let settingsPath = path.join(app.getPath('userData'), "node_yuisekintv_se_settings.json");

// アプリの起動時に実行される処理
app.on('ready', function() {
  console.log(settingsPath);
  // 設定ファイルをロードする
  if(fs.existsSync(settingsPath)){
    settings =  JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }else{
    // 設定ファイルがなかったら生成して設置する
    settings = {
      '1': null,
      '2': null,
      '3': null,
      '4': null,
      '5': null,
      '6': null,
      '7': null,
      '8': null,
      '9': null,
      '0': null
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
  }

  // タスクトレイにアイコンを表示する
  createTray();
  // ショートカットキーを初期化する
  reloadGlobalHotkeySettings();
});

// アプリの全Windowが閉じたときの処理を上書きして終了しないようにする
app.on('window-all-closed', () => {

});

ipcMain.on('update-settings', (event, data)=>{
  console.log('update-settings: ');
  console.log(data);
  settings = data;
  fs.writeFileSync(settingsPath, JSON.stringify(data));
  if(settingsWindow){
    settingsWindow.webContents.send('current-settings', settings);
  }
  reloadGlobalHotkeySettings();
})


function reloadGlobalHotkeySettings(){
  for (var i = 1; i <= 9; i++) {
    const registerTarget = 'Shift+Ctrl+Alt+' + i;
    const musicFilePath = settings['' + i];
    globalShortcut.register(registerTarget, () => {
      showInvisiblePlayerWindow(musicFilePath);
    });
  }

  globalShortcut.register('Shift+Ctrl+Alt+0', () => {
    if (invisibleWindow !== null) {
      invisibleWindow.close();
      invisibleWindow = null;
    }
  });
}

// SE再生のために不可視のWindowを生成する関数
function showInvisiblePlayerWindow(mp3path){
  if (invisibleWindow!==null){
    invisibleWindow = null;
  }
  invisibleWindow = new BrowserWindow({
    width: 0,
    height: 0,
    transparent: true,
    frame: false,
    titleBarStyle: 'hidden',
    // require等nodeの機能を使うために必要
    webPreferences: {
      nodeIntegration: true
    }
  });
  // メニューバーは不要
  invisibleWindow.setMenu(null);
  // タスクバーにアイコンを表示しない
  invisibleWindow.setSkipTaskbar(true);
  // ローカルファイルをロード
  invisibleWindow.loadURL(`file://${__dirname}/invisible.html`);
  // 画面が表示されたタイミングでの処理
  setTimeout(() => {
    console.log('invisible.html show');
    invisibleWindow.webContents.send('play-music', mp3path);
  }, 500);
  // 画面閉じたらnullにしとく
  invisibleWindow.on('closed', () => {
    console.log('invisible.html closed');
    invisibleWindow = null;
  });
}

// 設定画面を表示する関数
function showSettingsWindow(){
  settingsWindow = new BrowserWindow({
    width: 900,
    height: 1000,
    webPreferences: {
      nodeIntegration: true
    }
  });
  settingsWindow.setMenu(null);
  settingsWindow.loadURL(`file://${__dirname}/settings.html`);
  setTimeout(() => {
    console.log('settings.html show');
    settingsWindow.webContents.send('current-settings', settings);
  }, 500);
  settingsWindow.on('closed', () => {
    console.log('settings.html closed');
    settingsWindow = null;
  });
}

// タスクトレイにアイコンを表示する関数
function createTray(){
  // タスクトレイに表示するアイコンを指定（必須）
  trayIcon = new Tray(trayIconPath);
  // タスクトレイアイコンにマウスを載せたときのタイトルを指定
  trayIcon.setToolTip('YuisekinTV SE');

  // タスクトレイアイコンを右クリックした際のメニューを定義する
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '設定',
      click (menuItem){
        showSettingsWindow();
      }
    },
    {
      type: 'separator'
    },
    {
      label: '終了',
      click (menuItem){
        app.quit();
      }
    }
  ]);
  // 右クリック時に表示するメニューをセットする
  trayIcon.setContextMenu(contextMenu);
  // タスクトレイアイコンをクリックしたときの処理
  trayIcon.on('click', () => {
    showSettingsWindow();
  });
}