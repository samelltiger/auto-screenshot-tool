const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class OCRManager {
  constructor() {
    this.platform = process.platform;
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
          text = await this.macOCR(imagePath);
          break;
        case 'win32':
          text = await this.windowsOCR(imagePath);
          break;
        default:
          throw new Error(`不支持的平台: ${this.platform}`);
      }

      return this.cleanText(text);
    } catch (error) {
      console.error('OCR提取失败:', error);
      return '';
    }
  }

  // macOS OCR实现
  async macOCR(imagePath) {
    try {
      // 方法1: 使用系统的Live Text功能（macOS 12+）
      const script = `
        on run argv
          set imagePath to item 1 of argv
          set imageFile to POSIX file imagePath
          
          tell application "System Events"
            try
              -- 使用快捷指令进行OCR
              set ocrResult to do shell script "shortcuts run 'Extract Text from Image' --input-path '" & imagePath & "'"
              return ocrResult
            on error
              -- 如果快捷指令不可用，尝试使用Vision框架
              return my visionOCR(imagePath)
            end try
          end tell
        end run
        
        on visionOCR(imagePath)
          try
            set pythonScript to "
import Vision
import Quartz
import sys
import os

def extract_text_from_image(image_path):
    # 加载图片
    image_url = Quartz.CFURLCreateFromFileSystemRepresentation(None, image_path.encode('utf-8'), len(image_path.encode('utf-8')), False)
    image_source = Quartz.CGImageSourceCreateWithURL(image_url, None)
    image = Quartz.CGImageSourceCreateImageAtIndex(image_source, 0, None)
    
    # 创建Vision请求
    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    request.setUsesLanguageCorrection_(True)
    
    # 执行OCR
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(image, {})
    success = handler.performRequests_error_([request], None)
    
    if success[0]:
        results = request.results()
        text_lines = []
        for result in results:
            text_lines.append(result.topCandidates_(1)[0].string())
        return '\\n'.join(text_lines)
    return ''

if __name__ == '__main__':
    image_path = sys.argv[1]
    text = extract_text_from_image(image_path)
    print(text)
"
            return do shell script "python3 -c " & quoted form of pythonScript & " " & quoted form of imagePath
          on error errMsg
            return ""
          end try
        end visionOCR
      `;

      // 将AppleScript保存到临时文件
      const tempScript = path.join(require('os').tmpdir(), 'ocr_script.scpt');
      await fs.writeFile(tempScript, script);

      // 执行AppleScript
      const result = execSync(`osascript "${tempScript}" "${imagePath}"`, {
        encoding: 'utf8',
        timeout: 30000
      });

      // 清理临时文件
      await fs.remove(tempScript);

      return result.trim();

    } catch (error) {
      console.error('macOS OCR失败:', error);
      
      // 备用方案：使用textutil（如果可用）
      try {
        return await this.macTextUtilOCR(imagePath);
      } catch (fallbackError) {
        console.error('备用OCR方案也失败:', fallbackError);
        return '';
      }
    }
  }

  // macOS备用OCR方案
  async macTextUtilOCR(imagePath) {
    try {
      // 使用Swift脚本进行OCR
      const swiftScript = `
import Vision
import CoreImage
import Foundation

let imageURL = URL(fileURLWithPath: "${imagePath}")
guard let image = CIImage(contentsOf: imageURL) else {
    print("无法加载图片")
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(ciImage: image)

do {
    try handler.perform([request])
    
    guard let results = request.results else {
        print("")
        exit(0)
    }
    
    let text = results.compactMap { result in
        result.topCandidates(1).first?.string
    }.joined(separator: "\\n")
    
    print(text)
} catch {
    print("")
}
      `;

      const tempSwift = path.join(require('os').tmpdir(), 'ocr.swift');
      await fs.writeFile(tempSwift, swiftScript);

      const result = execSync(`swift "${tempSwift}"`, {
        encoding: 'utf8',
        timeout: 30000
      });

      await fs.remove(tempSwift);
      return result.trim();

    } catch (error) {
      console.error('Swift OCR失败:', error);
      return '';
    }
  }

  // Windows OCR实现
  async windowsOCR(imagePath) {
    try {
      const powershellScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.ApplicationModel.Core.CoreApplication, Windows.ApplicationModel, ContentType=WindowsRuntime]
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.RandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]

function Await([Windows.Foundation.IAsyncOperation[object]]$WinRtTask, [type]$ResultType) {
    $asTask = ([System.WindowsRuntimeSystemExtensions]::AsTask($WinRtTask))
    $netTask = $asTask -as [System.Threading.Tasks.Task[object]]
    $netTask.Wait()
    return $netTask.Result -as $ResultType
}

try {
    # 获取系统支持的OCR引擎
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    
    if ($ocrEngine -eq $null) {
        Write-Output ""
        exit 0
    }
    
    # 加载图片文件
    $imagePath = "${imagePath.replace(/\\/g, '\\\\')}"
    $storageFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)) ([Windows.Storage.StorageFile])
    
    # 打开图片流
    $stream = Await ($storageFile.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    
    # 执行OCR
    $ocrResult = Await ($ocrEngine.RecognizeAsync($stream)) ([Windows.Media.Ocr.OcrResult])
    
    # 提取文本
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
      .replace(/\\r\\n/g, '\\n')  // 统一换行符
      .replace(/\\r/g, '\\n')     // 统一换行符
      .replace(/\\n\\s*\\n/g, '\\n') // 删除多余空行
      .trim();                   // 删除首尾空白
  }

  // 检查OCR功能是否可用
  async isOCRAvailable() {
    try {
      switch (this.platform) {
        case 'darwin':
          // 检查macOS版本和Vision框架
          const macVersion = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
          const versionParts = macVersion.split('.').map(Number);
          return versionParts[0] >= 10 && versionParts[1] >= 15; // macOS 10.15+
          
        case 'win32':
          // 检查Windows版本
          const winVersion = execSync('ver', { encoding: 'utf8' });
          return winVersion.includes('10.') || winVersion.includes('11.'); // Windows 10+
          
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
}

module.exports = OCRManager;