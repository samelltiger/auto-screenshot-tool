const fs = require('fs-extra');
const crypto = require('crypto');
const sharp = require('sharp');

class ImageSimilarityDetector {
  constructor() {
    this.lastImageHash = null;
    this.lastImagePath = null;
  }

  /**
   * 计算两张图片的相似度
   * @param {string} imagePath1 第一张图片路径
   * @param {string} imagePath2 第二张图片路径
   * @param {Object} options 选项参数
   * @returns {Promise<number>} 相似度百分比 (0-100)
   */
  async calculateSimilarity(imagePath1, imagePath2, options = {}) {
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(imagePath1) || !await fs.pathExists(imagePath2)) {
        console.log('图片文件不存在，跳过相似度检测');
        return 0;
      }

      // 使用感知哈希算法比较图片
      const hash1 = await this.calculatePerceptualHash(imagePath1);
      const hash2 = await this.calculatePerceptualHash(imagePath2);
      
      // 计算汉明距离
      const hammingDistance = this.calculateHammingDistance(hash1, hash2);
      
      // 转换为相似度百分比
      const similarity = ((64 - hammingDistance) / 64) * 100;
      
      console.log(`图片相似度检测: ${similarity.toFixed(2)}%`);
      return Math.max(0, Math.min(100, similarity));
    } catch (error) {
      console.error('计算图片相似度失败:', error);
      return 0; // 出错时返回0，表示不相似
    }
  }

  /**
   * 计算图片的感知哈希
   * @param {string} imagePath 图片路径
   * @returns {Promise<string>} 感知哈希值
   */
  async calculatePerceptualHash(imagePath) {
    try {
      // 使用 sharp 处理图片：缩放到8x8，转换为灰度
      const { data, info } = await sharp(imagePath)
        .resize(8, 8)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // 计算像素平均值
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const average = sum / data.length;
      
      // 生成哈希
      let hash = '';
      for (let i = 0; i < data.length; i++) {
        hash += data[i] >= average ? '1' : '0';
      }
      
      return hash;
    } catch (error) {
      console.error('计算感知哈希失败:', error);
      return '0'.repeat(64); // 返回默认哈希
    }
  }

  /**
   * 计算两个哈希值的汉明距离
   * @param {string} hash1 第一个哈希值
   * @param {string} hash2 第二个哈希值
   * @returns {number} 汉明距离
   */
  calculateHammingDistance(hash1, hash2) {
    if (hash1.length !== hash2.length) {
      return Math.max(hash1.length, hash2.length);
    }
    
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    
    return distance;
  }

  /**
   * 检查新截图是否应该保存（基于与上一张图片的相似度）
   * @param {string} newImagePath 新截图路径
   * @param {number} threshold 相似度阈值 (80-99)
   * @returns {Promise<boolean>} 是否应该保存
   */
  async shouldSaveImage(newImagePath, threshold = 98) {
    try {
      // 如果没有上一张图片，直接保存
      if (!this.lastImagePath || !await fs.pathExists(this.lastImagePath)) {
        await this.updateLastImage(newImagePath);
        return true;
      }

      // 计算与上一张图片的相似度
      const similarity = await this.calculateSimilarity(this.lastImagePath, newImagePath);
      
      // 如果相似度低于阈值，则保存
      const shouldSave = similarity < threshold;
      
      if (shouldSave) {
        console.log(`图片相似度${similarity.toFixed(2)}% < ${threshold}%，保存截图`);
        await this.updateLastImage(newImagePath);
      } else {
        console.log(`图片相似度${similarity.toFixed(2)}% >= ${threshold}%，跳过重复截图`);
      }
      
      return shouldSave;
    } catch (error) {
      console.error('相似度检测失败:', error);
      // 出错时默认保存
      await this.updateLastImage(newImagePath);
      return true;
    }
  }

  /**
   * 更新上一张图片的记录
   * @param {string} imagePath 图片路径
   */
  async updateLastImage(imagePath) {
    this.lastImagePath = imagePath;
    try {
      this.lastImageHash = await this.calculatePerceptualHash(imagePath);
    } catch (error) {
      console.error('更新上一张图片记录失败:', error);
      this.lastImageHash = null;
    }
  }

  /**
   * 重置状态（用于开始新的截图会话）
   */
  reset() {
    this.lastImagePath = null;
    this.lastImageHash = null;
    console.log('图片相似度检测器已重置');
  }

  /**
   * 简单的文件哈希比较（备用方案）
   * @param {string} imagePath1 
   * @param {string} imagePath2 
   * @returns {Promise<boolean>} 是否为相同文件
   */
  async areFilesIdentical(imagePath1, imagePath2) {
    try {
      const hash1 = await this.calculateFileHash(imagePath1);
      const hash2 = await this.calculateFileHash(imagePath2);
      return hash1 === hash2;
    } catch (error) {
      console.error('文件哈希比较失败:', error);
      return false;
    }
  }

  /**
   * 计算文件的MD5哈希
   * @param {string} filePath 文件路径
   * @returns {Promise<string>} MD5哈希值
   */
  async calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }
}

module.exports = ImageSimilarityDetector;