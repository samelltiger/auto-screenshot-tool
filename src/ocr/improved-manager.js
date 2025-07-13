const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class ImprovedOCRManager {
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
      const versionParts = version.split('.').map(Number);
      
      if (versionParts[0] >= 11 || (versionParts[0] === 10 && versionParts[1] >= 15)) {
        console.log(`macOS ${version} 支持OCR功能`);
        
        // 检查可用的OCR方法
        const methods = await this.detectAvailableMethods();
        console.log('可用的OCR方法:', methods);
        
        return methods.length > 0;
      }
      
      return false;
    } catch (error) {
      console.error('检查macOS能力失败:', error);
      return false;
    }
  }

  async detectAvailableMethods() {
    const availableMethods = [];
    
    // 1. 检查快捷指令
    try {
      execSync('shortcuts list', { encoding: 'utf8', timeout: 5000 });
      availableMethods.push('shortcuts');
    } catch (error) {
      console.log('快捷指令不可用');
    }
    
    // 2. 检查Python PyObjC
    try {
      execSync('python3 -c "import objc; import Vision"', { encoding: 'utf8', timeout: 5000 });
      availableMethods.push('python-objc');
    } catch (error) {
      console.log('Python PyObjC不可用');
    }
    
    // 3. 检查Objective-C编译
    try {
      execSync('which clang', { encoding: 'utf8', timeout: 5000 });
      availableMethods.push('objective-c');
    } catch (error) {
      console.log('Objective-C编译器不可用');
    }
    
    // 4. AppleScript方法总是可用
    availableMethods.push('applescript');
    
    return availableMethods;
  }

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
    // 方法1: 使用快捷指令
    try {
      const result = await this.shortcutsOCR(imagePath);
      if (result && result.trim()) {
        console.log('快捷指令OCR成功');
        return result;
      }
    } catch (error) {
      console.log('快捷指令OCR失败，尝试下一种方法');
    }

    // 方法2: 使用Python PyObjC
    try {
      const result = await this.pythonOCR(imagePath);
      if (result && result.trim()) {
        console.log('Python OCR成功');
        return result;
      }
    } catch (error) {
      console.log('Python OCR失败，尝试下一种方法');
    }

    // 方法3: 使用Objective-C
    try {
      const result = await this.objectiveCOCR(imagePath);
      if (result && result.trim()) {
        console.log('Objective-C OCR成功');
        return result;
      }
    } catch (error) {
      console.log('Objective-C OCR失败，尝试下一种方法');
    }

    // 方法4: 使用AppleScript (最后的备用方案)
    try {
      const result = await this.applescriptOCR(imagePath);
      if (result && result.trim()) {
        console.log('AppleScript OCR成功');
        return result;
      }
    } catch (error) {
      console.log('AppleScript OCR失败');
    }

    console.log('所有OCR方法都失败了');
    return '';
  }

  // 快捷指令方法
  async shortcutsOCR(imagePath) {
    const shortcuts = [
      'Extract Text from Image',
      'OCR Text', 
      'Get Text from Image',
      'Text Recognition'
    ];

    for (const shortcut of shortcuts) {
      try {
        const result = execSync(`shortcuts run "${shortcut}" --input-path "${imagePath}"`, {
          encoding: 'utf8',
          timeout: 20000
        });
        
        if (result && result.trim()) {
          return result.trim();
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('没有可用的快捷指令');
  }

  // Python PyObjC方法
  async pythonOCR(imagePath) {
    const pythonScript = `#!/usr/bin/env python3
import sys
import os

try:
    import objc
    from Vision import VNImageRequestHandler, VNRecognizeTextRequest
    from Quartz import CGImageSourceCreateWithURL, CGImageSourceCreateImageAtIndex
    from CoreFoundation import CFURLCreateFromFileSystemRepresentation
    import Foundation
    
    def extract_text_from_image(image_path):
        try:
            # 创建图片URL
            image_path_bytes = image_path.encode('utf-8')
            image_url = CFURLCreateFromFileSystemRepresentation(
                None, image_path_bytes, len(image_path_bytes), False
            )
            
            if not image_url:
                return ""
                
            # 加载图片
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
            
            # 设置识别语言
            languages = ["en-US", "zh-Hans", "zh-Hant"]
            request.setRecognitionLanguages_(languages)
            
            # 执行OCR
            handler = VNImageRequestHandler.alloc().initWithCGImage_options_(image, {})
            success, error = handler.performRequests_error_([request], None)
            
            if not success or error:
                return ""
            
            results = request.results()
            if not results:
                return ""
            
            text_lines = []
            for result in results:
                candidates = result.topCandidates_(1)
                if candidates and len(candidates) > 0:
                    text_lines.append(str(candidates[0].string()))
            
            return '\\n'.join(text_lines)
            
        except Exception as e:
            return ""
    
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
        
except ImportError:
    print("")
except Exception:
    print("")
`;

    const tempFile = path.join(this.tempDir, `python_ocr_${Date.now()}.py`);
    await fs.writeFile(tempFile, pythonScript);
    
    try {
      const result = execSync(`python3 "${tempFile}" "${imagePath}"`, {
        encoding: 'utf8',
        timeout: 30000
      });
      
      await fs.remove(tempFile);
      return result.trim();
      
    } catch (error) {
      await fs.remove(tempFile);
      throw error;
    }
  }

  // Objective-C方法
  async objectiveCOCR(imagePath) {
    const objcCode = `
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <AppKit/AppKit.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        if (argc < 2) {
            printf("");
            return 1;
        }
        
        NSString *imagePath = [NSString stringWithUTF8String:argv[1]];
        NSURL *imageURL = [NSURL fileURLWithPath:imagePath];
        
        NSImage *image = [[NSImage alloc] initWithContentsOfURL:imageURL];
        if (!image) {
            printf("");
            return 1;
        }
        
        CGImageRef cgImage = [image CGImageForProposedRect:nil context:nil hints:nil];
        if (!cgImage) {
            printf("");
            return 1;
        }
        
        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
        VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
        
        request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        request.usesLanguageCorrection = YES;
        request.recognitionLanguages = @[@"en-US", @"zh-Hans", @"zh-Hant"];
        
        NSError *error;
        BOOL success = [handler performRequests:@[request] error:&error];
        
        if (!success || error) {
            printf("");
            return 1;
        }
        
        NSMutableArray *textLines = [NSMutableArray array];
        for (VNRecognizedTextObservation *observation in request.results) {
            VNRecognizedText *recognizedText = [observation topCandidates:1].firstObject;
            if (recognizedText) {
                [textLines addObject:recognizedText.string];
            }
        }
        
        NSString *result = [textLines componentsJoinedByString:@"\\n"];
        printf("%s", result.UTF8String);
    }
    return 0;
}
`;

    const tempFile = path.join(this.tempDir, `objc_ocr_${Date.now()}.m`);
    const binaryFile = path.join(this.tempDir, `objc_ocr_${Date.now()}`);
    
    await fs.writeFile(tempFile, objcCode);
    
    try {
      // 编译Objective-C代码
      execSync(`clang -framework Foundation -framework Vision -framework AppKit "${tempFile}" -o "${binaryFile}"`, {
        timeout: 15000
      });
      
      // 执行编译后的程序
      const result = execSync(`"${binaryFile}" "${imagePath}"`, {
        encoding: 'utf8',
        timeout: 30000
      });
      
      // 清理临时文件
      await fs.remove(tempFile);
      await fs.remove(binaryFile);
      
      return result.trim();
      
    } catch (error) {
      // 清理临时文件
      try {
        await fs.remove(tempFile);
        await fs.remove(binaryFile);
      } catch (cleanupError) {
        // 忽略清理错误
      }
      throw error;
    }
  }

  // AppleScript方法
  async applescriptOCR(imagePath) {
    const script = `
    on run argv
        set imagePath to item 1 of argv
        set imageFile to POSIX file imagePath
        
        tell application "System Events"
            try
                -- 尝试使用系统的OCR能力
                set theText to do shell script "echo '暂不支持AppleScript OCR'"
                return theText
            on error
                return ""
            end try
        end tell
    end run
    `;

    const tempScript = path.join(this.tempDir, `applescript_ocr_${Date.now()}.scpt`);
    await fs.writeFile(tempScript, script);
    
    try {
      const result = execSync(`osascript "${tempScript}" "${imagePath}"`, {
        encoding: 'utf8',
        timeout: 30000
      });
      
      await fs.remove(tempScript);
      return result.trim();
      
    } catch (error) {
      await fs.remove(tempScript);
      throw error;
    }
  }

  // Windows OCR (保持不变)
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
      .replace(/^\\s+|\\s+$/g, '')
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
    console.log('测试OCR功能...');
    console.log(`平台: ${this.platform}`);
    
    const available = await this.isOCRAvailable();
    console.log(`OCR可用性: ${available ? '✅ 可用' : '❌ 不可用'}`);
    
    if (available && this.platform === 'darwin') {
      const methods = await this.detectAvailableMethods();
      console.log('检测到的OCR方法:', methods.join(', '));
    }
    
    return available;
  }

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

module.exports = ImprovedOCRManager;