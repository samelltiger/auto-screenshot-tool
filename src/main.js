const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const ScreenshotManager = require('./utils/screenshot');
const DatabaseManager = require('./database/simple-manager');
const OCRManager = require('./ocr/simple-manager');
const ConfigManager = require('./utils/config');

class AutoScreenshotApp {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.screenshotManager = null;
    this.databaseManager = null;
    this.ocrManager = null;
    this.configManager = null;
  }

  async initialize() {
    // 初始化配置
    this.configManager = new ConfigManager();
    await this.configManager.initialize();

    // 初始化数据库
    this.databaseManager = new DatabaseManager();
    await this.databaseManager.initialize();

    // 初始化截图管理器
    this.screenshotManager = new ScreenshotManager(this.databaseManager, this.configManager, this);
    await this.screenshotManager.initialize();
    
    // 初始化OCR管理器
    this.ocrManager = new OCRManager();
    await this.ocrManager.initialize();
    
    // 测试OCR功能
    await this.ocrManager.testOCR();

    // 创建主窗口
    this.createMainWindow();
    
    // 创建系统托盘
    this.createTray();
    
    // 设置IPC事件监听
    this.setupIPC();
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      // icon: path.join(__dirname, 'assets/icons/app.png'),
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, 'components/index.html'));

    // 窗口关闭时隐藏到托盘
    this.mainWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault();
        this.mainWindow.hide();
        
        // 显示通知提示用户应用仍在运行
        if (this.tray) {
          this.showTrayNotification('自动截图工具', '应用已最小化到托盘，双击图标可重新打开');
        }
      }
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });
  }

  createTray() {
    try {
      // 尝试使用图标文件，如果失败则使用系统默认
      let trayIconPath;
      
      // 根据平台选择合适的图标
      if (process.platform === 'darwin') {
        // macOS 使用模板图标
        trayIconPath = path.join(__dirname, 'assets/icons/tray.png');
      } else {
        // Windows 使用 png 文件
        trayIconPath = path.join(__dirname, 'assets/icons/tray.png');
      }

      // 检查文件是否存在，如果不存在创建一个简单的图标
      if (!require('fs').existsSync(trayIconPath)) {
        console.log('图标文件不存在，使用默认配置');
        // 使用 nativeImage 创建一个简单的图标
        const { nativeImage } = require('electron');
        const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwcLGQrBQsLBQsLBQsLCwsLCwsLBQsLCwsLCwsLBQsLCwsLCwsLCwsLCwsLBQsLCwsLCwsLCwsLBQsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBQsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBQsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBQsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBQsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBQsLCw=');
        this.tray = new Tray(icon);
      } else {
        this.tray = new Tray(trayIconPath);
      }
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示主窗口',
          click: () => {
            this.showMainWindow();
          }
        },
        {
          label: this.screenshotManager && this.screenshotManager.getStatus().isCapturing ? '停止截图' : '开始截图',
          click: async () => {
            if (this.screenshotManager) {
              const status = this.screenshotManager.getStatus();
              if (status.isCapturing) {
                this.screenshotManager.stopCapture();
                this.showTrayNotification('截图已停止', '自动截图功能已关闭');
              } else {
                const result = await this.screenshotManager.startCapture(30, '');
                if (result) {
                  this.showTrayNotification('截图已开始', '每30秒自动截图一次');
                }
              }
              this.updateTrayMenu();
            }
          }
        },
        {
          label: '立即截图',
          click: async () => {
            if (this.screenshotManager) {
              const result = await this.screenshotManager.captureOnce('');
              
              // 显示截图成功通知
              if (result.success) {
                this.showTrayNotification('截图成功', `已保存: ${result.filename || '截图文件'}`);
                
                // 通知前端更新状态
                if (this.mainWindow) {
                  this.mainWindow.webContents.send('status:update');
                  this.mainWindow.webContents.send('gallery:refresh');
                }
              } else {
                this.showTrayNotification('截图失败', result.error || '未知错误');
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            app.isQuiting = true;
            app.quit();
          }
        }
      ]);

      this.tray.setContextMenu(contextMenu);
      this.tray.setToolTip('自动截图工具');
      
      // 双击托盘图标显示主窗口
      this.tray.on('double-click', () => {
        this.showMainWindow();
      });

      // 单击托盘图标也显示主窗口 (Windows)
      this.tray.on('click', () => {
        this.showMainWindow();
      });

      console.log('托盘图标创建成功');
      
    } catch (error) {
      console.error('创建托盘图标失败:', error);
    }
  }

  // 显示主窗口
  showMainWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  // 更新托盘菜单
  updateTrayMenu() {
    if (!this.tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.showMainWindow();
        }
      },
      {
        label: this.screenshotManager && this.screenshotManager.getStatus().isCapturing ? '停止截图' : '开始截图',
        click: async () => {
          if (this.screenshotManager) {
            const status = this.screenshotManager.getStatus();
            if (status.isCapturing) {
              this.screenshotManager.stopCapture();
              this.showTrayNotification('截图已停止', '自动截图功能已关闭');
            } else {
              const result = await this.screenshotManager.startCapture(30, '');
              if (result) {
                this.showTrayNotification('截图已开始', '每30秒自动截图一次');
              }
            }
            this.updateTrayMenu();
          }
        }
      },
      {
        label: '立即截图',
        click: async () => {
          if (this.screenshotManager) {
            const result = await this.screenshotManager.captureOnce('');
            
            // 显示截图成功通知
            if (result.success) {
              this.showTrayNotification('截图成功', `已保存: ${result.filename || '截图文件'}`);
              
              // 通知前端更新状态
              if (this.mainWindow) {
                this.mainWindow.webContents.send('status:update');
                this.mainWindow.webContents.send('gallery:refresh');
              }
            } else {
              this.showTrayNotification('截图失败', result.error || '未知错误');
            }
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  // 显示托盘通知
  showTrayNotification(title, message) {
    try {
      if (process.platform === 'darwin') {
        // macOS 显示通知
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
          new Notification({
            title: title,
            body: message,
            silent: false
          }).show();
        }
      } else {
        // Windows 显示气球提示
        if (this.tray) {
          this.tray.displayBalloon({
            title: title,
            content: message
          });
        }
      }
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }

  setupIPC() {
    // 截图控制
    ipcMain.handle('screenshot:start', async (event, interval, theme) => {
      const result = await this.screenshotManager.startCapture(interval, theme);
      // 通知前端更新状态
      if (this.mainWindow) {
        this.mainWindow.webContents.send('status:update');
      }
      return result;
    });

    ipcMain.handle('screenshot:stop', async () => {
      const result = this.screenshotManager.stopCapture();
      // 通知前端更新状态
      if (this.mainWindow) {
        this.mainWindow.webContents.send('status:update');
      }
      return result;
    });

    ipcMain.handle('screenshot:setTheme', async (event, theme) => {
      const result = this.screenshotManager.setCurrentTheme(theme);
      // 通知前端更新状态
      if (this.mainWindow) {
        this.mainWindow.webContents.send('status:update');
      }
      return result;
    });

    // 图片搜索
    ipcMain.handle('screenshots:search', async (event, query) => {
      return await this.databaseManager.searchScreenshots(query);
    });

    ipcMain.handle('screenshots:getByDate', async (event, date) => {
      return await this.databaseManager.getScreenshotsByDate(date);
    });

    // OCR功能
    ipcMain.handle('ocr:extractText', async (event, imagePath) => {
      return await this.ocrManager.extractText(imagePath);
    });

    ipcMain.handle('ocr:isAvailable', async () => {
      return await this.ocrManager.isOCRAvailable();
    });

    ipcMain.handle('ocr:test', async () => {
      return await this.ocrManager.testOCR();
    });

    // 配置管理
    ipcMain.handle('config:get', async () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('config:update', async (event, config) => {
      return await this.configManager.updateConfig(config);
    });

    ipcMain.handle('config:reset', async () => {
      return await this.configManager.resetToDefault();
    });

    ipcMain.handle('config:export', async () => {
      try {
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: '导出配置',
          defaultPath: 'screenshot-config.json',
          filters: [{ name: 'JSON文件', extensions: ['json'] }]
        });
        
        if (!result.canceled) {
          return await this.configManager.exportConfig(result.filePath);
        }
        return false;
      } catch (error) {
        console.error('导出配置失败:', error);
        return false;
      }
    });

    ipcMain.handle('config:import', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          title: '导入配置',
          filters: [{ name: 'JSON文件', extensions: ['json'] }],
          properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          return await this.configManager.importConfig(result.filePaths[0]);
        }
        return false;
      } catch (error) {
        console.error('导入配置失败:', error);
        return false;
      }
    });

    // 主题管理
    ipcMain.handle('themes:getRecent', async () => {
      return this.configManager.getRecentThemes();
    });

    ipcMain.handle('themes:addRecent', async (event, theme) => {
      return await this.configManager.addRecentTheme(theme);
    });

    // 统计信息
    ipcMain.handle('screenshots:getStatistics', async () => {
      return await this.databaseManager.getStatistics();
    });

    // 截图管理
    ipcMain.handle('screenshots:delete', async (event, id) => {
      return await this.databaseManager.deleteScreenshot(id);
    });

    ipcMain.handle('screenshot:captureOnce', async (event, theme) => {
      const result = await this.screenshotManager.captureOnce(theme);
      // 通知前端更新状态和刷新图片
      if (this.mainWindow) {
        this.mainWindow.webContents.send('status:update');
        this.mainWindow.webContents.send('gallery:refresh');
      }
      return result;
    });

    ipcMain.handle('screenshot:getStatus', async () => {
      return this.screenshotManager.getStatus();
    });

    // 文件操作
    ipcMain.handle('file:openInExplorer', async (event, filePath) => {
      shell.showItemInFolder(filePath);
    });

    ipcMain.handle('file:openScreenshotFolder', async () => {
      const screenshotsDir = this.screenshotManager.getStatus().screenshotsDir;
      shell.openPath(screenshotsDir);
    });

    ipcMain.handle('file:delete', async (event, filePath) => {
      try {
        await fs.remove(filePath);
        return true;
      } catch (error) {
        console.error('删除文件失败:', error);
        return false;
      }
    });

    ipcMain.handle('files:cleanup', async (event, daysToKeep) => {
      return await this.screenshotManager.cleanupOldFiles(daysToKeep);
    });

    // 数据导出
    ipcMain.handle('data:export', async () => {
      try {
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: '导出数据',
          defaultPath: 'screenshot-data.zip',
          filters: [{ name: 'ZIP文件', extensions: ['zip'] }]
        });
        
        if (!result.canceled) {
          // 这里可以实现数据打包导出逻辑
          console.log('导出数据到:', result.filePath);
          return true;
        }
        return false;
      } catch (error) {
        console.error('导出数据失败:', error);
        return false;
      }
    });
  }
}

// 应用程序初始化
app.whenReady().then(async () => {
  const autoScreenshotApp = new AutoScreenshotApp();
  await autoScreenshotApp.initialize();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      autoScreenshotApp.createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理应用退出
app.on('before-quit', () => {
  app.isQuiting = true;
});