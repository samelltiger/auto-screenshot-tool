const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class SimpleOCRManager {
  constructor() {
    this.platform = process.platform;
    this.tempDir = path.join(os.tmpdir(), 'screenshot-ocr');
  }

  async initialize() {
    await fs.ensureDir(this.tempDir);
    
    if (this.platform === 'darwin') {
      return await this.checkMacOSCapabilities();
    }
    return false;
  }

  async checkMacOSCapabilities() {
    try {
      const version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      console.log(`macOS ${version} OCR功能检查`);
      
      // 检查可用的方法
      const methods = [];
      
      // 检查是否有textutil命令（系统内置）
      try {
        execSync('which textutil', { encoding: 'utf8' });
        methods.push('textutil');
      } catch (error) {
        console.log('textutil不可用');
      }
      
      // 检查screencapture命令
      try {
        execSync('which screencapture', { encoding: 'utf8' });
        methods.push('screencapture');
      } catch (error) {
        console.log('screencapture不可用');
      }
      
      console.log('可用的方法:', methods);
      return methods.length > 0;
      
    } catch (error) {
      console.error('检查macOS能力失败:', error);
      return false;
    }
  }

  async extractText(imagePath) {
    try {
      if (!await fs.pathExists(imagePath)) {
        throw new Error(`图片文件不存在: ${imagePath}`);
      }

      console.log(`开始OCR处理: ${imagePath}`);
      
      let text = '';
      
      switch (this.platform) {
        case 'darwin':
          text = await this.macOCR(imagePath);
          break;
        case 'win32':
          text = await this.windowsOCR(imagePath);
          break;
        default:
          console.log(`平台 ${this.platform} 暂不支持OCR`);
          return '';
      }

      return this.cleanText(text);
      
    } catch (error) {
      console.error('OCR提取失败:', error);
      return '';
    }
  }

  async macOCR(imagePath) {
    // 方法1: 尝试使用pdfimages + tesseract
    try {
      const result = await this.tesseractOCR(imagePath);
      if (result && result.trim()) {
        console.log('Tesseract OCR成功');
        return result;
      }
    } catch (error) {
      console.log('Tesseract不可用，尝试其他方法');
    }

    // 方法2: 简单的图像信息提取（占位符）
    try {
      const result = await this.basicImageInfo(imagePath);
      if (result && result.trim()) {
        console.log('基础图像信息提取成功');
        return result;
      }
    } catch (error) {
      console.log('基础图像信息提取失败');
    }

    // 方法3: 返回默认提示
    return this.generatePlaceholderText(imagePath);
  }

  // 尝试使用Tesseract OCR（如果已安装）
  async tesseractOCR(imagePath) {
    try {
      // 检查tesseract是否可用
      execSync('which tesseract', { encoding: 'utf8' });
      
      const outputPath = path.join(this.tempDir, `tesseract_${Date.now()}`);
      
      // 运行tesseract
      execSync(`tesseract "${imagePath}" "${outputPath}" -l eng+chi_sim+chi_tra`, {
        timeout: 30000
      });
      
      const resultFile = outputPath + '.txt';
      
      if (await fs.pathExists(resultFile)) {
        const text = await fs.readFile(resultFile, 'utf8');
        await fs.remove(resultFile);
        return text;
      }
      
      return '';
      
    } catch (error) {
      throw new Error('Tesseract不可用');
    }
  }

  // 基础图像信息提取
  async basicImageInfo(imagePath) {
    try {
      // 使用file命令获取图像信息
      const fileInfo = execSync(`file "${imagePath}"`, { encoding: 'utf8' });
      
      // 使用mdls获取元数据（如果可用）
      try {
        const metadata = execSync(`mdls "${imagePath}"`, { encoding: 'utf8' });
        
        // 查找可能的文本相关元数据
        const lines = metadata.split('\n');
        const textLines = lines.filter(line => 
          line.includes('kMDItemTextContent') || 
          line.includes('kMDItemDescription') ||
          line.includes('kMDItemTitle')
        );
        
        if (textLines.length > 0) {
          return textLines.join('\n');
        }
        
      } catch (mdlsError) {
        console.log('mdls命令失败');
      }
      
      // 如果没有找到文本内容，返回文件信息
      return `图像文件信息: ${fileInfo}`;
      
    } catch (error) {
      throw new Error('基础图像信息提取失败');
    }
  }

  // 生成占位符文本
  generatePlaceholderText(imagePath) {
    const fileName = path.basename(imagePath);
    const timestamp = new Date().toLocaleString();
    
    return `OCR占位符文本
文件名: ${fileName}
处理时间: ${timestamp}
注意: 当前使用简化的OCR实现
建议: 安装tesseract以获得更好的OCR效果
命令: brew install tesseract tesseract-lang`;
  }

  // Windows OCR（保持不变）
  async windowsOCR(imagePath) {
    try {
      const powershellScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.ApplicationModel.Core.CoreApplication, Windows.ApplicationModel, ContentType=WindowsRuntime]
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]

function Await([Windows.Foundation.IAsyncOperation[object]]$WinRtTask, [type]$ResultType) {
    $asTask = ([System.WindowsRuntimeSystemExtensions]::AsTask($WinRtTask))
    $netTask = $asTask -as [System.Threading.Tasks.Task[object]]
    $netTask.Wait()
    return $netTask.Result -as $ResultType
}

try {
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    
    if ($ocrEngine -eq $null) {
        Write-Output ""
        exit 0
    }
    
    $imagePath = "${imagePath.replace(/\\/g, '\\\\')}"
    $storageFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)) ([Windows.Storage.StorageFile])
    $stream = Await ($storageFile.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    $ocrResult = Await ($ocrEngine.RecognizeAsync($stream)) ([Windows.Media.Ocr.OcrResult])
    
    $lines = @()
    foreach ($line in $ocrResult.Lines) {
        $words = @()
        foreach ($word in $line.Words) {
            $words += $word.Text
        }
        $lines += ($words -join " ")
    }
    
    $text = $lines -join "\\n"
    Write-Output $text
    
    $stream.Dispose()
    
} catch {
    Write-Output ""
}
      `;

      const result = execSync(`powershell -Command "${powershellScript}"`, {
        encoding: 'utf8',
        timeout: 30000
      });

      return result.trim();

    } catch (error) {
      console.error('Windows OCR失败:', error);
      return '';
    }
  }

  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\\r\\n/g, '\\n')
      .replace(/\\r/g, '\\n')
      .replace(/\\n\\s*\\n/g, '\\n')
      .trim();
  }

  async isOCRAvailable() {
    try {
      switch (this.platform) {
        case 'darwin':
          return await this.checkMacOSCapabilities();
          
        case 'win32':
          const winVersion = execSync('ver', { encoding: 'utf8' });
          return winVersion.includes('10.') || winVersion.includes('11.');
          
        default:
          return false;
      }
    } catch (error) {
      console.error('检查OCR可用性失败:', error);
      return false;
    }
  }

  async testOCR() {
    console.log('测试简化OCR功能...');
    console.log(`平台: ${this.platform}`);
    
    const available = await this.isOCRAvailable();
    console.log(`OCR可用性: ${available ? '✅ 可用' : '❌ 不可用'}`);
    
    // 检查Tesseract
    try {
      execSync('which tesseract', { encoding: 'utf8' });
      console.log('✅ Tesseract OCR可用');
    } catch (error) {
      console.log('⚠️  Tesseract未安装，使用简化实现');
      console.log('💡 建议安装: brew install tesseract tesseract-lang');
    }
    
    return available;
  }

  // 安装指南
  getInstallationGuide() {
    if (this.platform === 'darwin') {
      return {
        title: 'macOS OCR增强安装指南',
        steps: [
          '1. 安装Homebrew (如果未安装):',
          '   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
          '',
          '2. 安装Tesseract OCR:',
          '   brew install tesseract tesseract-lang',
          '',
          '3. 验证安装:',
          '   tesseract --version',
          '',
          '安装后重启应用即可获得高精度OCR功能'
        ]
      };
    }
    
    return null;
  }
}

module.exports = SimpleOCRManager;