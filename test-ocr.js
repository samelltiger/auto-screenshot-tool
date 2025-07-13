#!/usr/bin/env node

const path = require('path');
const OCRManager = require('./src/ocr/simple-manager');

async function testOCR() {
    console.log('🔍 开始OCR功能测试...\n');
    
    const ocrManager = new OCRManager();
    await ocrManager.initialize();
    
    const testImagePath = path.join(__dirname, 'test-ocr.png');
    console.log(`测试图片路径: ${testImagePath}\n`);
    
    try {
        console.log('⏳ 正在进行OCR识别...');
        const startTime = Date.now();
        
        const result = await ocrManager.extractText(testImagePath);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️  OCR处理时间: ${duration}ms\n`);
        
        if (result && result.trim()) {
            console.log('✅ OCR识别成功!');
            console.log('📄 识别结果:');
            console.log('=' .repeat(40));
            console.log(result);
            console.log('=' .repeat(40));
            console.log(`📊 识别文本长度: ${result.length} 字符\n`);
        } else {
            console.log('❌ OCR识别失败 - 未检测到文字内容\n');
        }
        
    } catch (error) {
        console.error('❌ OCR测试失败:', error.message);
    }
}

// 运行测试
testOCR().then(() => {
    console.log('🎉 OCR测试完成');
    process.exit(0);
}).catch(error => {
    console.error('💥 测试过程出错:', error);
    process.exit(1);
});