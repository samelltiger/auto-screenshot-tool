const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath('userData'), 'screenshots.db');
  }

  async initialize() {
    // 确保用户数据目录存在
    await fs.ensureDir(path.dirname(this.dbPath));
    
    // 连接数据库
    this.db = new Database(this.dbPath);
    
    // 创建表结构
    await this.createTables();
    
    console.log('数据库初始化完成:', this.dbPath);
  }

  async createTables() {
    // 截图记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        theme TEXT,
        ocr_text TEXT,
        file_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(filepath)
      )
    `);

    // 主题历史表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
        use_count INTEGER DEFAULT 1
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON screenshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_screenshots_theme ON screenshots(theme);
      CREATE INDEX IF NOT EXISTS idx_screenshots_ocr_text ON screenshots(ocr_text);
      CREATE INDEX IF NOT EXISTS idx_themes_last_used ON themes(last_used);
    `);
  }

  // 插入截图记录
  async insertScreenshot(screenshotData) {
    const stmt = this.db.prepare(`
      INSERT INTO screenshots (filename, filepath, timestamp, theme, ocr_text, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        screenshotData.filename,
        screenshotData.filepath,
        screenshotData.timestamp,
        screenshotData.theme || null,
        screenshotData.ocrText || null,
        screenshotData.fileSize || 0
      );
      
      // 更新主题使用记录
      if (screenshotData.theme) {
        await this.updateThemeUsage(screenshotData.theme);
      }
      
      return result.lastInsertRowid;
    } catch (error) {
      console.error('插入截图记录失败:', error);
      throw error;
    }
  }

  // 更新OCR文本
  async updateOCRText(screenshotId, ocrText) {
    const stmt = this.db.prepare('UPDATE screenshots SET ocr_text = ? WHERE id = ?');
    return stmt.run(ocrText, screenshotId);
  }

  // 搜索截图
  async searchScreenshots(query) {
    let sql = 'SELECT * FROM screenshots WHERE 1=1';
    const params = [];

    if (query.theme) {
      sql += ' AND theme LIKE ?';
      params.push(`%${query.theme}%`);
    }

    if (query.dateFrom) {
      sql += ' AND timestamp >= ?';
      params.push(new Date(query.dateFrom).getTime());
    }

    if (query.dateTo) {
      sql += ' AND timestamp <= ?';
      params.push(new Date(query.dateTo).getTime());
    }

    if (query.ocrText) {
      sql += ' AND ocr_text LIKE ?';
      params.push(`%${query.ocrText}%`);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(query.limit || 100);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // 根据日期获取截图
  async getScreenshotsByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stmt = this.db.prepare(`
      SELECT * FROM screenshots 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);

    return stmt.all(startOfDay.getTime(), endOfDay.getTime());
  }

  // 删除截图记录
  async deleteScreenshot(id) {
    const stmt = this.db.prepare('DELETE FROM screenshots WHERE id = ?');
    return stmt.run(id);
  }

  // 删除指定日期之前的记录
  async deleteOldScreenshots(daysToKeep) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const stmt = this.db.prepare('DELETE FROM screenshots WHERE timestamp < ?');
    return stmt.run(cutoffDate.getTime());
  }

  // 获取主题列表
  async getThemes() {
    const stmt = this.db.prepare('SELECT * FROM themes ORDER BY use_count DESC, last_used DESC');
    return stmt.all();
  }

  // 更新主题使用记录
  async updateThemeUsage(themeName) {
    const checkStmt = this.db.prepare('SELECT id, use_count FROM themes WHERE name = ?');
    const existing = checkStmt.get(themeName);

    if (existing) {
      const updateStmt = this.db.prepare('UPDATE themes SET use_count = ?, last_used = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(existing.use_count + 1, existing.id);
    } else {
      const insertStmt = this.db.prepare('INSERT INTO themes (name) VALUES (?)');
      insertStmt.run(themeName);
    }
  }

  // 获取统计信息
  async getStatistics() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM screenshots');
    const sizeStmt = this.db.prepare('SELECT SUM(file_size) as totalSize FROM screenshots');
    const todayStmt = this.db.prepare(`
      SELECT COUNT(*) as today FROM screenshots 
      WHERE timestamp >= ?
    `);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return {
      total: totalStmt.get().total,
      totalSize: sizeStmt.get().totalSize || 0,
      today: todayStmt.get(startOfToday.getTime()).today
    };
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;