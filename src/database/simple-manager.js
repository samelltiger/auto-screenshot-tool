const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

class SimpleDatabaseManager {
  constructor() {
    this.dataFile = path.join(app.getPath('userData'), 'screenshots.json');
    this.data = {
      screenshots: [],
      themes: []
    };
  }

  async initialize() {
    // 确保用户数据目录存在
    await fs.ensureDir(path.dirname(this.dataFile));
    
    // 加载数据
    await this.loadData();
    
    console.log('简化数据库初始化完成:', this.dataFile);
  }

  async loadData() {
    try {
      if (await fs.pathExists(this.dataFile)) {
        this.data = await fs.readJson(this.dataFile);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      this.data = { screenshots: [], themes: [] };
    }
  }

  async saveData() {
    try {
      await fs.writeJson(this.dataFile, this.data, { spaces: 2 });
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }

  // 插入截图记录
  async insertScreenshot(screenshotData) {
    const id = Date.now() + Math.random();
    const screenshot = {
      id,
      ...screenshotData,
      created_at: new Date().toISOString()
    };
    
    this.data.screenshots.push(screenshot);
    await this.saveData();
    
    // 更新主题使用记录
    if (screenshotData.theme) {
      await this.updateThemeUsage(screenshotData.theme);
    }
    
    return id;
  }

  // 更新OCR文本
  async updateOCRText(screenshotId, ocrText) {
    const screenshot = this.data.screenshots.find(s => s.id === screenshotId);
    if (screenshot) {
      screenshot.ocr_text = ocrText;
      await this.saveData();
    }
  }

  // 搜索截图
  async searchScreenshots(query) {
    let results = this.data.screenshots;

    if (query.theme) {
      results = results.filter(s => 
        s.theme && s.theme.toLowerCase().includes(query.theme.toLowerCase())
      );
    }

    if (query.dateFrom) {
      // 将开始日期设置为当天的00:00:00，确保包含当天的所有数据
      const fromDate = new Date(query.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const fromTime = fromDate.getTime();
      results = results.filter(s => s.timestamp >= fromTime);
    }

    if (query.dateTo) {
      // 将结束日期设置为当天的23:59:59.999，确保包含当天的所有数据
      const toDate = new Date(query.dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();
      results = results.filter(s => s.timestamp <= toTime);
    }

    if (query.ocrText) {
      results = results.filter(s => 
        s.ocr_text && s.ocr_text.toLowerCase().includes(query.ocrText.toLowerCase())
      );
    }

    // 按时间降序排序并限制数量
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // 根据日期获取截图
  async getScreenshotsByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.data.screenshots
      .filter(s => s.timestamp >= startOfDay.getTime() && s.timestamp <= endOfDay.getTime())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // 删除截图记录
  async deleteScreenshot(id) {
    const index = this.data.screenshots.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.screenshots.splice(index, 1);
      await this.saveData();
      return true;
    }
    return false;
  }

  // 删除指定日期之前的记录
  async deleteOldScreenshots(daysToKeep) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const beforeCount = this.data.screenshots.length;
    this.data.screenshots = this.data.screenshots.filter(
      s => s.timestamp >= cutoffDate.getTime()
    );
    
    await this.saveData();
    return beforeCount - this.data.screenshots.length;
  }

  // 获取主题列表
  async getThemes() {
    return this.data.themes.sort((a, b) => b.use_count - a.use_count);
  }

  // 更新主题使用记录
  async updateThemeUsage(themeName) {
    let theme = this.data.themes.find(t => t.name === themeName);
    
    if (theme) {
      theme.use_count++;
      theme.last_used = new Date().toISOString();
    } else {
      theme = {
        id: Date.now() + Math.random(),
        name: themeName,
        use_count: 1,
        last_used: new Date().toISOString()
      };
      this.data.themes.push(theme);
    }
    
    await this.saveData();
  }

  // 获取统计信息
  async getStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayScreenshots = this.data.screenshots.filter(
      s => s.timestamp >= today.getTime()
    );

    // 计算总文件大小，支持 fileSize 和 file_size 两种字段名
    const totalSize = this.data.screenshots.reduce(
      (sum, s) => sum + (s.fileSize || s.file_size || 0), 0
    );

    return {
      total: this.data.screenshots.length,
      totalSize,
      today: todayScreenshots.length
    };
  }

  // 关闭数据库连接（JSON版本不需要）
  close() {
    // 无需操作
  }
}

module.exports = SimpleDatabaseManager;