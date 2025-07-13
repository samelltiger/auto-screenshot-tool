const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class MacOCRManager {
  constructor() {
    this.platform = process.platform;
    this.tempDir = path.join(os.tmpdir(), 'screenshot-ocr');
  }

  async initialize() {
    // 确保临时目录存在
    await fs.ensureDir(this.tempDir);
    
    // 检查macOS版本和Vision框架可用性
    if (this.platform === 'darwin') {
      return await this.checkVisionAvailability();
    }
    return false;
  }

  // 检查Vision框架是否可用
  async checkVisionAvailability() {
    try {
      const version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      const versionParts = version.split('.').map(Number);
      
      // macOS 10.15+ 支持Vision框架
      if (versionParts[0] >= 11 || (versionParts[0] === 10 && versionParts[1] >= 15)) {
        console.log(`macOS ${version} 支持Vision OCR`);
        return true;
      } else {
        console.log(`macOS ${version} 不支持Vision OCR，需要10.15+`);
        return false;
      }
    } catch (error) {
      console.error('检查macOS版本失败:', error);
      return false;
    }
  }

  // 主要的文字提取方法
  async extractText(imagePath) {
    try {
      if (!await fs.pathExists(imagePath)) {
        throw new Error(`图片文件不存在: ${imagePath}`);
      }

      let text = '';
      
      switch (this.platform) {
        case 'darwin':
          text = await this.macVisionOCR(imagePath);
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

  // macOS Vision框架OCR实现
  async macVisionOCR(imagePath) {
    try {
      // 方法1: 使用Swift脚本调用Vision框架
      const swiftScript = this.createVisionSwiftScript(imagePath);
      const tempSwiftFile = path.join(this.tempDir, `ocr_${Date.now()}.swift`);
      
      await fs.writeFile(tempSwiftFile, swiftScript);
      
      try {
        const result = execSync(`swift "${tempSwiftFile}"`, {
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 1024 * 1024 // 1MB buffer
        });
        
        await fs.remove(tempSwiftFile);
        return result.trim();
        
      } catch (swiftError) {
        console.log('Swift方法失败，尝试Python方法');
        await fs.remove(tempSwiftFile);
        
        // 方法2: 使用Python + Objective-C桥接
        return await this.macPythonOCR(imagePath);
      }
      
    } catch (error) {
      console.error('macOS OCR失败:', error);
      
      // 方法3: 使用系统快捷指令（如果可用）
      try {
        return await this.macShortcutsOCR(imagePath);
      } catch (shortcutsError) {
        console.error('快捷指令OCR也失败:', shortcutsError);
        return '';
      }
    }
  }

  // 创建Swift脚本
  createVisionSwiftScript(imagePath) {
    return `
import Foundation
import Vision
import CoreImage
import AppKit

func extractTextFromImage(at path: String) -> String {
    guard let image = NSImage(contentsOfFile: path) else {
        print("ERROR: 无法加载图片")
        return ""
    }
    
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("ERROR: 无法转换为CGImage")
        return ""
    }
    
    let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    let request = VNRecognizeTextRequest()
    
    // 设置识别级别为精确模式
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    
    // 支持中英文
    request.recognitionLanguages = ["en-US", "zh-Hans", "zh-Hant"]
    
    do {
        try requestHandler.perform([request])
        
        guard let observations = request.results else {
            return ""
        }
        
        let recognizedStrings = observations.compactMap { observation in
            return observation.topCandidates(1).first?.string
        }
        
        return recognizedStrings.joined(separator: "\\n")
        
    } catch {
        print("ERROR: OCR处理失败 \\(error)")
        return ""
    }
}

// 获取命令行参数
guard CommandLine.arguments.count > 1 else {
    print("ERROR: 需要提供图片路径")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let result = extractTextFromImage(at: imagePath)
print(result)
`;
  }

  // Python方法（使用PyObjC）
  async macPythonOCR(imagePath) {
    try {
      const pythonScript = `
import sys
import os
sys.path.append('/System/Library/Frameworks/Python.framework/Versions/Current/Extras/lib/python')

try:
    import objc
    from Vision import VNImageRequestHandler, VNRecognizeTextRequest
    from Quartz import CGImageSourceCreateWithURL, CGImageSourceCreateImageAtIndex
    from CoreFoundation import CFURLCreateFromFileSystemRepresentation
    import Foundation
    
    def extract_text_from_image(image_path):
        # 加载图片
        image_path_bytes = image_path.encode('utf-8')
        image_url = CFURLCreateFromFileSystemRepresentation(
            None, image_path_bytes, len(image_path_bytes), False
        )
        
        image_source = CGImageSourceCreateWithURL(image_url, None)
        if not image_source:
            return ""
            
        image = CGImageSourceCreateImageAtIndex(image_source, 0, None)
        if not image:
            return ""
        
        # 创建Vision请求
        request = VNRecognizeTextRequest.alloc().init()
        request.setRecognitionLevel_(1)  # VNRequestTextRecognitionLevelAccurate
        request.setUsesLanguageCorrection_(True)
        
        # 执行OCR
        handler = VNImageRequestHandler.alloc().initWithCGImage_options_(image, {})
        success, error = handler.performRequests_error_([request], None)
        
        if not success:
            return ""
        
        results = request.results()
        if not results:
            return ""
        
        text_lines = []
        for result in results:
            candidates = result.topCandidates_(1)
            if candidates and len(candidates) > 0:
                text_lines.append(candidates[0].string())
        
        return '\\n'.join(text_lines)
    
    if __name__ == '__main__':
        if len(sys.argv) < 2:
            print("")
            sys.exit(1)
            
        image_path = sys.argv[1]
        if not os.path.exists(image_path):
            print("")
            sys.exit(1)
            
        text = extract_text_from_image(image_path)
        print(text)
        
except ImportError as e:
    print("")
except Exception as e:
    print("")
`;

      const tempPythonFile = path.join(this.tempDir, `ocr_${Date.now()}.py`);
      await fs.writeFile(tempPythonFile, pythonScript);
      
      try {
        const result = execSync(`python3 "${tempPythonFile}" "${imagePath}"`, {
          encoding: 'utf8',
          timeout: 30000
        });
        
        await fs.remove(tempPythonFile);
        return result.trim();
        
      } catch (pythonError) {
        await fs.remove(tempPythonFile);
        throw pythonError;
      }
      
    } catch (error) {
      console.error('Python OCR失败:', error);
      return '';
    }
  }

  // 使用系统快捷指令
  async macShortcutsOCR(imagePath) {
    try {
      // 检查是否有预设的OCR快捷指令
      const shortcuts = [
        'Extract Text from Image',
        'OCR Text',
        'Get Text from Image'
      ];
      
      for (const shortcut of shortcuts) {
        try {
          const result = execSync(`shortcuts run "${shortcut}" --input-path "${imagePath}"`, {
            encoding: 'utf8',
            timeout: 15000
          });
          
          if (result && result.trim()) {
            return result.trim();
          }
        } catch (error) {
          // 继续尝试下一个快捷指令
          continue;
        }
      }
      
      return '';
      
    } catch (error) {
      console.error('快捷指令OCR失败:', error);
      return '';
    }
  }

  // Windows OCR实现（保持原有实现）
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

  // 清理OCR文本
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\\r\\n/g, '\\n')
      .replace(/\\r/g, '\\n')
      .replace(/\\n\\s*\\n/g, '\\n')
      .replace(/^\\s+|\\s+$/g, '')
      .trim();
  }

  // 检查OCR功能是否可用
  async isOCRAvailable() {
    try {
      switch (this.platform) {
        case 'darwin':
          return await this.checkVisionAvailability();
          
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

  // 批量处理OCR
  async batchExtractText(imagePaths, callback) {
    const results = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      try {
        const text = await this.extractText(imagePath);
        results.push({ imagePath, text, success: true });
        
        if (callback) {
          callback(i + 1, imagePaths.length, imagePath, text);
        }
      } catch (error) {
        results.push({ imagePath, text: '', success: false, error: error.message });
        
        if (callback) {
          callback(i + 1, imagePaths.length, imagePath, null, error);
        }
      }
    }
    
    return results;
  }

  // 测试OCR功能
  async testOCR() {
    console.log('测试OCR功能...');
    console.log(`平台: ${this.platform}`);
    
    const available = await this.isOCRAvailable();
    console.log(`OCR可用性: ${available ? '✅ 可用' : '❌ 不可用'}`);
    
    if (available && this.platform === 'darwin') {
      console.log('macOS Vision框架OCR已就绪');
    } else if (available && this.platform === 'win32') {
      console.log('Windows OCR API已就绪');
    }
    
    return available;
  }
}

module.exports = MacOCRManager;