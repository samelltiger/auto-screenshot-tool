const screenshot = require('screenshot-desktop');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { app } = require('electron');
const sharp = require('sharp');

class ScreenshotManager {
  constructor(databaseManager, configManager, mainApp = null) {
    this.databaseManager = databaseManager;
    this.configManager = configManager;
    this.mainApp = mainApp; // 引用主应用实例，用于更新托盘菜单
    this.isCapturing = false;
    this.captureInterval = null;
    this.currentTheme = '';
    this.screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    this.screenshotCount = 0; // 添加截图计数器
  }

  async initialize() {
    // 确保截图目录存在
    await fs.ensureDir(this.screenshotsDir);
  }

  // 开始定时截图
  async startCapture(intervalSeconds = 30, theme = '') {
    if (this.isCapturing) {
      console.log('截图已在进行中');
      return false;
    }

    this.currentTheme = theme;
    this.isCapturing = true;

    // 立即截取一张
    await this.takeScreenshot();

    // 设置定时器
    this.captureInterval = setInterval(async () => {
      try {
        await this.takeScreenshot();
      } catch (error) {
        console.error('定时截图失败:', error);
      }
    }, intervalSeconds * 1000);

    console.log(`开始定时截图，间隔: ${intervalSeconds}秒, 主题: ${theme || '无'}`);
    
    // 更新托盘菜单
    if (this.mainApp && this.mainApp.updateTrayMenu) {
      this.mainApp.updateTrayMenu();
    }
    
    return true;
  }

  // 停止截图
  stopCapture() {
    if (!this.isCapturing) {
      console.log('截图未在进行中');
      return false;
    }

    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.isCapturing = false;
    console.log('已停止截图');
    
    // 更新托盘菜单
    if (this.mainApp && this.mainApp.updateTrayMenu) {
      this.mainApp.updateTrayMenu();
    }
    
    return true;
  }

  // 设置当前主题
  setCurrentTheme(theme) {
    this.currentTheme = theme;
    console.log('当前主题已设置为:', theme || '无');
  }

  // 执行单次截图
  async takeScreenshot() {
    try {
      const now = moment();
      const dateFolder = now.format('YYYY-MM-DD');
      const timestamp = now.format('HHmmss');
      
      // 创建日期文件夹
      const dayDir = path.join(this.screenshotsDir, dateFolder);
      await fs.ensureDir(dayDir);

      // 生成文件名
      const filename = this.currentTheme 
        ? `${timestamp}_${this.sanitizeFilename(this.currentTheme)}.jpg`
        : `${timestamp}.jpg`;
      
      const filepath = path.join(dayDir, filename);

      // 截图
      const imgBuffer = await screenshot({ format: 'png' });
      // await fs.writeFile(filepath, imgBuffer);

      // 使用 sharp 优化并转换为 jpg
      const optimizedBuffer = await sharp(imgBuffer)
        .jpeg({
          quality: 85, // 质量设置，可根据需要调整 (1-100)
          progressive: true, // 渐进式JPEG
          mozjpeg: true // 使用mozjpeg优化
        })
        .toBuffer();

      await fs.writeFile(filepath, optimizedBuffer);

      // 获取文件大小
      const stats = await fs.stat(filepath);

      // 保存到数据库
      const screenshotData = {
        filename,
        filepath,
        timestamp: now.valueOf(),
        theme: this.currentTheme || null,
        fileSize: stats.size
      };

      const screenshotId = await this.databaseManager.insertScreenshot(screenshotData);
      
      console.log(`截图保存成功: ${filename}`);
      
      // 异步进行OCR处理
      // this.processOCR(screenshotId, filepath).catch(error => {
      //   console.error('OCR处理失败:', error);
      // });
      // 增加截图计数
      this.screenshotCount++;

      // 每5张截图进行一次OCR处理
      if (this.screenshotCount % 5 === 0) {
        // 异步进行OCR处理
        this.processOCR(screenshotId, filepath).catch(error => {
          console.error('OCR处理失败:', error);
        });
      } else {
        console.log(`跳过OCR处理（第${this.screenshotCount}张，每5张处理一次）`);
      }

      // 通知主应用更新状态
      if (this.mainApp && this.mainApp.mainWindow) {
        this.mainApp.mainWindow.webContents.send('status:update');
        this.mainApp.mainWindow.webContents.send('gallery:refresh');
      }

      return {
        success: true,
        screenshotId,
        filepath,
        filename
      };

    } catch (error) {
      console.error('截图失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // OCR处理（异步）
  async processOCR(screenshotId, filepath) {
    try {
      const config = this.configManager.getConfig();
      if (!config.enableOCR) {
        return;
      }

      // 使用主应用的OCR管理器
      if (this.mainApp && this.mainApp.ocrManager) {
        const ocrText = await this.mainApp.ocrManager.extractText(filepath);
        
        if (ocrText && ocrText.trim()) {
          await this.databaseManager.updateOCRText(screenshotId, ocrText);
          console.log(`OCR处理完成: ${screenshotId}, 识别文本长度: ${ocrText.length}`);
          
          // 通知前端OCR完成（如果需要实时显示）
          if (this.mainApp && this.mainApp.mainWindow) {
            this.mainApp.mainWindow.webContents.send('ocr:completed', {
              screenshotId,
              ocrText: ocrText.substring(0, 100) + (ocrText.length > 100 ? '...' : '')
            });
          }
        } else {
          console.log(`OCR处理完成: ${screenshotId}, 未识别到文本`);
        }
      }
    } catch (error) {
      console.error('OCR处理错误:', error);
    }
  }

  // 清理文件名中的非法字符
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:\"/\\|?*]/g, '_') // 替换非法字符
      .replace(/\\s+/g, '_') // 替换空格
      .substring(0, 50); // 限制长度
  }

  // 获取截图状态
  getStatus() {
    return {
      isCapturing: this.isCapturing,
      currentTheme: this.currentTheme,
      screenshotsDir: this.screenshotsDir
    };
  }

  // 手动触发单次截图
  async captureOnce(theme = '') {
    const originalTheme = this.currentTheme;
    if (theme) {
      this.currentTheme = theme;
    }

    const result = await this.takeScreenshot();
    
    if (theme) {
      this.currentTheme = originalTheme;
    }

    return result;
  }

  // 清理过期文件
  async cleanupOldFiles(daysToKeep) {
    try {
      const cutoffDate = moment().subtract(daysToKeep, 'days');
      const dirs = await fs.readdir(this.screenshotsDir);
      
      let deletedCount = 0;
      let deletedSize = 0;

      for (const dir of dirs) {
        const dirPath = path.join(this.screenshotsDir, dir);
        const stat = await fs.stat(dirPath);
        
        if (stat.isDirectory()) {
          const dirDate = moment(dir, 'YYYY-MM-DD');
          if (dirDate.isValid() && dirDate.isBefore(cutoffDate)) {
            // 计算要删除的文件统计
            const files = await fs.readdir(dirPath);
            for (const file of files) {
              const filePath = path.join(dirPath, file);
              const fileStat = await fs.stat(filePath);
              if (fileStat.isFile()) {
                deletedCount++;
                deletedSize += fileStat.size;
              }
            }
            
            // 删除整个目录
            await fs.remove(dirPath);
            console.log(`删除过期目录: ${dir}`);
          }
        }
      }

      // 同时清理数据库中的记录
      await this.databaseManager.deleteOldScreenshots(daysToKeep);
      // 清理后重置计数器
      this.screenshotCount = 0;

      return {
        deletedCount,
        deletedSize,
        success: true
      };

    } catch (error) {
      console.error('清理文件失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ScreenshotManager;