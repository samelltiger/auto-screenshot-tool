const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.defaultConfig = {
      // 截图设置
      captureInterval: 30,        // 截图间隔（秒）
      imageQuality: 'high',       // 图片质量：low, medium, high
      imageFormat: 'png',         // 图片格式：png, jpg
      
      // OCR设置
      enableOCR: true,           // 是否启用OCR
      ocrLanguage: 'auto',       // OCR语言：auto, zh, en
      ocrConfidence: 0.7,        // OCR置信度阈值
      
      // 文件管理
      retentionDays: 30,         // 文件保留天数
      autoCleanup: true,         // 自动清理过期文件
      maxStorageSize: 1024,      // 最大存储大小（MB）
      
      // 界面设置
      theme: 'light',            // 界面主题：light, dark
      language: 'zh-CN',         // 界面语言
      startMinimized: false,     // 启动时最小化
      
      // 系统设置
      autoStart: false,          // 开机自启动
      showNotifications: true,   // 显示通知
      soundEnabled: false,       // 声音提示
      
      // 快捷键
      hotkeys: {
        toggleCapture: 'CommandOrControl+Shift+S',
        quickCapture: 'CommandOrControl+Shift+X',
        showWindow: 'CommandOrControl+Shift+A'
      },
      
      // 其他
      lastUsedThemes: [],        // 最近使用的主题
      windowBounds: null         // 窗口位置和大小
    };
    
    this.config = { ...this.defaultConfig };
  }

  // 初始化配置
  async initialize() {
    try {
      await this.loadConfig();
      console.log('配置加载完成');
    } catch (error) {
      console.error('配置初始化失败:', error);
      await this.saveConfig(); // 保存默认配置
    }
  }

  // 加载配置文件
  async loadConfig() {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        // 合并默认配置和用户配置
        this.config = { ...this.defaultConfig, ...configData };
        
        // 验证配置的有效性
        this.validateConfig();
      } else {
        // 配置文件不存在，使用默认配置
        await this.saveConfig();
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      this.config = { ...this.defaultConfig };
    }
  }

  // 保存配置文件
  async saveConfig() {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
      console.log('配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  // 获取配置
  getConfig() {
    return { ...this.config };
  }

  // 获取特定配置项
  get(key) {
    return this.config[key];
  }

  // 更新配置
  async updateConfig(updates) {
    try {
      // 合并更新
      this.config = { ...this.config, ...updates };
      
      // 验证配置
      this.validateConfig();
      
      // 保存到文件
      await this.saveConfig();
      
      return true;
    } catch (error) {
      console.error('更新配置失败:', error);
      return false;
    }
  }

  // 设置单个配置项
  async set(key, value) {
    this.config[key] = value;
    await this.saveConfig();
  }

  // 重置为默认配置
  async resetToDefault() {
    this.config = { ...this.defaultConfig };
    await this.saveConfig();
    console.log('配置已重置为默认值');
  }

  // 验证配置的有效性
  validateConfig() {
    // 验证截图间隔
    if (this.config.captureInterval < 1 || this.config.captureInterval > 3600) {
      this.config.captureInterval = this.defaultConfig.captureInterval;
    }

    // 验证保留天数
    if (this.config.retentionDays < 1 || this.config.retentionDays > 365) {
      this.config.retentionDays = this.defaultConfig.retentionDays;
    }

    // 验证图片质量
    if (!['low', 'medium', 'high'].includes(this.config.imageQuality)) {
      this.config.imageQuality = this.defaultConfig.imageQuality;
    }

    // 验证图片格式
    if (!['png', 'jpg'].includes(this.config.imageFormat)) {
      this.config.imageFormat = this.defaultConfig.imageFormat;
    }

    // 验证主题
    if (!['light', 'dark'].includes(this.config.theme)) {
      this.config.theme = this.defaultConfig.theme;
    }

    // 验证OCR置信度
    if (this.config.ocrConfidence < 0 || this.config.ocrConfidence > 1) {
      this.config.ocrConfidence = this.defaultConfig.ocrConfidence;
    }

    // 验证最大存储大小
    if (this.config.maxStorageSize < 100 || this.config.maxStorageSize > 10240) {
      this.config.maxStorageSize = this.defaultConfig.maxStorageSize;
    }

    // 确保最近使用主题列表不超过10个
    if (Array.isArray(this.config.lastUsedThemes) && this.config.lastUsedThemes.length > 10) {
      this.config.lastUsedThemes = this.config.lastUsedThemes.slice(0, 10);
    }
  }

  // 添加最近使用的主题
  async addRecentTheme(theme) {
    if (!theme || typeof theme !== 'string') return;

    let themes = this.config.lastUsedThemes || [];
    
    // 移除已存在的相同主题
    themes = themes.filter(t => t !== theme);
    
    // 添加到开头
    themes.unshift(theme);
    
    // 保持最多10个
    themes = themes.slice(0, 10);
    
    this.config.lastUsedThemes = themes;
    await this.saveConfig();
  }

  // 获取最近使用的主题
  getRecentThemes() {
    return this.config.lastUsedThemes || [];
  }

  // 导出配置
  async exportConfig(exportPath) {
    try {
      const configToExport = {
        ...this.config,
        exportDate: new Date().toISOString(),
        version: require('../../package.json').version
      };
      
      await fs.writeJson(exportPath, configToExport, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('导出配置失败:', error);
      return false;
    }
  }

  // 导入配置
  async importConfig(importPath) {
    try {
      if (!await fs.pathExists(importPath)) {
        throw new Error('配置文件不存在');
      }

      const importedConfig = await fs.readJson(importPath);
      
      // 移除导出时添加的元数据
      delete importedConfig.exportDate;
      delete importedConfig.version;
      
      // 更新配置
      await this.updateConfig(importedConfig);
      
      return true;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }

  // 获取配置文件路径
  getConfigPath() {
    return this.configPath;
  }

  // 检查配置是否有效
  isValid() {
    try {
      this.validateConfig();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ConfigManager;