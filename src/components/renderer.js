const { ipcRenderer } = require('electron');

class ScreenshotApp {
    constructor() {
        this.isCapturing = false;
        this.currentConfig = null;
        this.currentImages = [];
        this.currentImageIndex = 0;
        
        this.init();
    }

    async init() {
        // 绑定事件监听器
        this.bindEvents();
        
        // 监听主进程的状态更新事件
        this.listenToMainProcess();
        
        // 加载初始数据
        await this.loadConfig();
        await this.updateStatistics();
        await this.updateCaptureStatus(); // 初始化时更新截图状态
        await this.loadRecentThemes();
        await this.checkOCRStatus(); // 检查OCR状态
        
        // 设置当前日期
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date-picker').value = today;
        
        // 加载今天的图片
        await this.loadGalleryImages(today);
        
        console.log('应用初始化完成');
    }

    // 监听主进程事件
    listenToMainProcess() {
        // 监听状态更新事件
        ipcRenderer.on('status:update', async () => {
            await this.updateStatistics();
            this.updateCaptureStatus();
        });

        // 监听图片库刷新事件
        ipcRenderer.on('gallery:refresh', async () => {
            const currentDate = document.getElementById('date-picker').value;
            await this.loadGalleryImages(currentDate);
        });

        // 监听OCR完成事件
        ipcRenderer.on('ocr:completed', (event, data) => {
            this.showNotification('OCR完成', `识别到文本: ${data.ocrText}`);
        });
    }

    bindEvents() {
        // 导航标签切换
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 控制面板事件
        document.getElementById('interval-slider').addEventListener('input', (e) => {
            document.getElementById('interval-value').textContent = e.target.value;
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            this.startCapture();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopCapture();
        });

        document.getElementById('capture-once-btn').addEventListener('click', () => {
            this.captureOnce();
        });

        document.getElementById('theme-history-btn').addEventListener('click', () => {
            this.toggleRecentThemes();
        });

        // 快速操作
        document.getElementById('open-folder-btn').addEventListener('click', () => {
            this.openScreenshotFolder();
        });

        document.getElementById('cleanup-btn').addEventListener('click', () => {
            this.cleanupFiles();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // 图片浏览事件
        document.getElementById('date-picker').addEventListener('change', (e) => {
            this.loadGalleryImages(e.target.value);
        });

        document.getElementById('today-btn').addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date-picker').value = today;
            this.loadGalleryImages(today);
        });

        document.getElementById('prev-day-btn').addEventListener('click', () => {
            this.changeDate(-1);
        });

        document.getElementById('next-day-btn').addEventListener('click', () => {
            this.changeDate(1);
        });

        // 搜索事件
        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('clear-search-btn').addEventListener('click', () => {
            this.clearSearch();
        });

        // 设置事件
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('reset-settings-btn').addEventListener('click', () => {
            this.resetSettings();
        });

        document.getElementById('export-config-btn').addEventListener('click', () => {
            this.exportConfig();
        });

        document.getElementById('import-config-btn').addEventListener('click', () => {
            this.importConfig();
        });

        // OCR测试
        document.getElementById('test-ocr-btn').addEventListener('click', () => {
            this.testOCR();
        });

        // 模态框事件
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('image-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        document.getElementById('copy-ocr-btn').addEventListener('click', () => {
            this.copyOCRText();
        });

        document.getElementById('open-file-btn').addEventListener('click', () => {
            this.openCurrentImageFile();
        });

        document.getElementById('delete-image-btn').addEventListener('click', () => {
            this.deleteCurrentImage();
        });

        // OCR置信度滑块
        document.getElementById('ocr-confidence').addEventListener('input', (e) => {
            document.getElementById('confidence-value').textContent = e.target.value;
        });
    }

    // 标签切换
    switchTab(tabName) {
        // 更新导航按钮状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 切换内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // 根据标签页执行特定操作
        switch(tabName) {
            case 'gallery':
                this.refreshGallery();
                break;
            case 'search':
                this.initSearch();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // 开始截图
    async startCapture() {
        const interval = parseInt(document.getElementById('interval-slider').value);
        const theme = document.getElementById('theme-input').value.trim();

        try {
            const result = await ipcRenderer.invoke('screenshot:start', interval, theme);
            if (result) {
                this.isCapturing = true;
                this.updateCaptureStatus();
                this.showNotification('开始截图', '自动截图已启动');
                
                // 添加主题到历史记录
                if (theme) {
                    await this.addRecentTheme(theme);
                }
            }
        } catch (error) {
            console.error('启动截图失败:', error);
            this.showNotification('错误', '启动截图失败');
        }
    }

    // 停止截图
    async stopCapture() {
        try {
            const result = await ipcRenderer.invoke('screenshot:stop');
            if (result) {
                this.isCapturing = false;
                this.updateCaptureStatus();
                this.showNotification('停止截图', '自动截图已停止');
            }
        } catch (error) {
            console.error('停止截图失败:', error);
        }
    }

    // 立即截图
    async captureOnce() {
        const theme = document.getElementById('theme-input').value.trim();
        
        try {
            const result = await ipcRenderer.invoke('screenshot:captureOnce', theme);
            if (result.success) {
                this.showNotification('截图成功', '已保存截图');
                await this.updateStatistics();
                
                // 如果当前在浏览今天的图片，刷新图片列表
                const currentDate = document.getElementById('date-picker').value;
                const today = new Date().toISOString().split('T')[0];
                if (currentDate === today) {
                    await this.loadGalleryImages(today);
                }
            }
        } catch (error) {
            console.error('立即截图失败:', error);
            this.showNotification('错误', '截图失败');
        }
    }

    // 更新截图状态显示
    async updateCaptureStatus() {
        try {
            // 获取当前截图状态
            const status = await ipcRenderer.invoke('screenshot:getStatus');
            
            const statusElement = document.getElementById('capture-status');
            const startBtn = document.getElementById('start-btn');
            const stopBtn = document.getElementById('stop-btn');
            const themeElement = document.getElementById('current-theme');

            if (status && status.isCapturing) {
                this.isCapturing = true;
                statusElement.textContent = '进行中';
                statusElement.style.color = '#28a745';
                startBtn.disabled = true;
                stopBtn.disabled = false;
            } else {
                this.isCapturing = false;
                statusElement.textContent = '已停止';
                statusElement.style.color = '#6c757d';
                startBtn.disabled = false;
                stopBtn.disabled = true;
            }

            const theme = document.getElementById('theme-input').value.trim();
            themeElement.textContent = theme || '无';
        } catch (error) {
            console.error('更新截图状态失败:', error);
        }
    }

    // 切换最近使用的主题显示
    toggleRecentThemes() {
        const recentThemes = document.getElementById('recent-themes');
        if (recentThemes.style.display === 'none') {
            recentThemes.style.display = 'block';
            this.loadRecentThemes();
        } else {
            recentThemes.style.display = 'none';
        }
    }

    // 加载最近使用的主题
    async loadRecentThemes() {
        try {
            const themes = await ipcRenderer.invoke('themes:getRecent');
            const container = document.getElementById('recent-themes');
            
            if (themes && themes.length > 0) {
                container.innerHTML = themes.map(theme => 
                    `<span class="theme-tag" onclick="app.selectTheme('${theme}')">${theme}</span>`
                ).join('');
            } else {
                container.innerHTML = '<p style="color: #6c757d; font-size: 0.8rem;">暂无历史主题</p>';
            }
        } catch (error) {
            console.error('加载主题历史失败:', error);
        }
    }

    // 选择主题
    selectTheme(theme) {
        document.getElementById('theme-input').value = theme;
        document.getElementById('recent-themes').style.display = 'none';
        this.updateCaptureStatus();
    }

    // 添加最近主题
    async addRecentTheme(theme) {
        try {
            await ipcRenderer.invoke('themes:addRecent', theme);
        } catch (error) {
            console.error('添加主题失败:', error);
        }
    }

    // 加载配置
    async loadConfig() {
        try {
            this.currentConfig = await ipcRenderer.invoke('config:get');
            this.applyConfig();
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    // 应用配置到界面
    applyConfig() {
        if (!this.currentConfig) return;

        // 应用界面主题
        if (this.currentConfig.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // 设置默认值
        document.getElementById('interval-slider').value = this.currentConfig.captureInterval;
        document.getElementById('interval-value').textContent = this.currentConfig.captureInterval;
    }

    // 更新统计信息
    async updateStatistics() {
        try {
            const stats = await ipcRenderer.invoke('screenshots:getStatistics');
            document.getElementById('today-count').textContent = stats.today;
            document.getElementById('total-count').textContent = stats.total;
            
            // 更新存储信息
            const storageInfo = this.formatFileSize(stats.totalSize || 0);
            document.getElementById('storage-info').textContent = `存储空间: ${storageInfo}`;
        } catch (error) {
            console.error('更新统计信息失败:', error);
        }
    }

    // 加载图片浏览器
    async loadGalleryImages(date) {
        try {
            const images = await ipcRenderer.invoke('screenshots:getByDate', date);
            this.currentImages = images;
            this.renderGallery(images);
        } catch (error) {
            console.error('加载图片失败:', error);
        }
    }

    // 渲染图片网格
    renderGallery(images) {
        const container = document.getElementById('gallery-grid');
        
        if (!images || images.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6c757d;">该日期没有截图</p>';
            return;
        }

        container.innerHTML = images.map((image, index) => `
            <div class="gallery-item" onclick="app.openImageModal(${index})">
                <img src="file://${image.filepath}" alt="截图">
                <div class="gallery-item-info">
                    <div class="gallery-item-time">${this.formatTime(image.timestamp)}</div>
                    <div class="gallery-item-theme">${image.theme || '无主题'}</div>
                </div>
            </div>
        `).join('');
    }

    // 打开图片模态框
    openImageModal(index) {
        this.currentImageIndex = index;
        const image = this.currentImages[index];
        
        document.getElementById('modal-image').src = `file://${image.filepath}`;
        document.getElementById('image-title').textContent = image.filename;
        document.getElementById('image-time').textContent = this.formatDateTime(image.timestamp);
        document.getElementById('image-theme').textContent = image.theme || '无';
        document.getElementById('image-ocr').value = image.ocr_text || '无文字识别结果';
        
        document.getElementById('image-modal').style.display = 'block';
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('image-modal').style.display = 'none';
    }

    // 复制OCR文本
    copyOCRText() {
        const ocrText = document.getElementById('image-ocr').value;
        if (ocrText && ocrText !== '无文字识别结果') {
            navigator.clipboard.writeText(ocrText).then(() => {
                this.showNotification('复制成功', 'OCR文本已复制到剪贴板');
            });
        }
    }

    // 在文件夹中显示当前图片
    async openCurrentImageFile() {
        const image = this.currentImages[this.currentImageIndex];
        if (image) {
            await ipcRenderer.invoke('file:openInExplorer', image.filepath);
        }
    }

    // 删除当前图片
    async deleteCurrentImage() {
        if (!confirm('确定要删除这张截图吗？此操作无法撤销。')) {
            return;
        }

        const image = this.currentImages[this.currentImageIndex];
        if (image) {
            try {
                const success = await ipcRenderer.invoke('file:delete', image.filepath);
                if (success) {
                    // 从数据库删除记录
                    await ipcRenderer.invoke('screenshots:delete', image.id);
                    
                    // 更新界面
                    this.closeModal();
                    const currentDate = document.getElementById('date-picker').value;
                    await this.loadGalleryImages(currentDate);
                    await this.updateStatistics();
                    
                    this.showNotification('删除成功', '截图已删除');
                } else {
                    this.showNotification('删除失败', '无法删除文件');
                }
            } catch (error) {
                console.error('删除图片失败:', error);
                this.showNotification('删除失败', '删除过程中发生错误');
            }
        }
    }

    // 改变日期
    changeDate(delta) {
        const datePicker = document.getElementById('date-picker');
        const currentDate = new Date(datePicker.value);
        currentDate.setDate(currentDate.getDate() + delta);
        
        const newDate = currentDate.toISOString().split('T')[0];
        datePicker.value = newDate;
        this.loadGalleryImages(newDate);
    }

    // 刷新图片浏览器
    async refreshGallery() {
        const currentDate = document.getElementById('date-picker').value;
        await this.loadGalleryImages(currentDate);
    }

    // 执行搜索
    async performSearch() {
        const query = {
            theme: document.getElementById('search-theme').value.trim(),
            ocrText: document.getElementById('search-ocr').value.trim(),
            dateFrom: document.getElementById('search-date-from').value,
            dateTo: document.getElementById('search-date-to').value,
            limit: 50
        };

        try {
            const results = await ipcRenderer.invoke('screenshots:search', query);
            this.renderSearchResults(results);
        } catch (error) {
            console.error('搜索失败:', error);
            this.showNotification('搜索失败', '搜索过程中发生错误');
        }
    }

    // 渲染搜索结果
    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        
        if (!results || results.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">未找到匹配的截图</p>';
            return;
        }

        container.innerHTML = `
            <h4>搜索结果 (${results.length})</h4>
            <div class="gallery-grid">
                ${results.map((image, index) => `
                    <div class="gallery-item" onclick="app.openSearchImageModal(${index})">
                        <img src="file://${image.filepath}" alt="截图">
                        <div class="gallery-item-info">
                            <div class="gallery-item-time">${this.formatDateTime(image.timestamp)}</div>
                            <div class="gallery-item-theme">${image.theme || '无主题'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.searchResults = results;
    }

    // 打开搜索结果图片模态框
    openSearchImageModal(index) {
        this.currentImageIndex = index;
        this.currentImages = this.searchResults;
        this.openImageModal(index);
    }

    // 清空搜索
    clearSearch() {
        document.getElementById('search-theme').value = '';
        document.getElementById('search-ocr').value = '';
        document.getElementById('search-date-from').value = '';
        document.getElementById('search-date-to').value = '';
        document.getElementById('search-results').innerHTML = '';
    }

    // 初始化搜索页面
    initSearch() {
        // 设置默认日期范围为最近一周
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('search-date-to').value = today.toISOString().split('T')[0];
        document.getElementById('search-date-from').value = weekAgo.toISOString().split('T')[0];
    }

    // 加载设置
    loadSettings() {
        if (!this.currentConfig) return;

        document.getElementById('default-interval').value = this.currentConfig.captureInterval;
        document.getElementById('retention-days').value = this.currentConfig.retentionDays;
        document.getElementById('auto-cleanup').checked = this.currentConfig.autoCleanup;
        document.getElementById('enable-ocr').checked = this.currentConfig.enableOCR;
        document.getElementById('ocr-confidence').value = this.currentConfig.ocrConfidence;
        document.getElementById('confidence-value').textContent = this.currentConfig.ocrConfidence;
        document.getElementById('app-theme').value = this.currentConfig.theme;
        document.getElementById('show-notifications').checked = this.currentConfig.showNotifications;
        document.getElementById('auto-start').checked = this.currentConfig.autoStart;
    }

    // 保存设置
    async saveSettings() {
        const config = {
            captureInterval: parseInt(document.getElementById('default-interval').value),
            retentionDays: parseInt(document.getElementById('retention-days').value),
            autoCleanup: document.getElementById('auto-cleanup').checked,
            enableOCR: document.getElementById('enable-ocr').checked,
            ocrConfidence: parseFloat(document.getElementById('ocr-confidence').value),
            theme: document.getElementById('app-theme').value,
            showNotifications: document.getElementById('show-notifications').checked,
            autoStart: document.getElementById('auto-start').checked
        };

        try {
            const success = await ipcRenderer.invoke('config:update', config);
            if (success) {
                this.currentConfig = { ...this.currentConfig, ...config };
                this.applyConfig();
                this.showNotification('保存成功', '设置已保存');
            } else {
                this.showNotification('保存失败', '无法保存设置');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showNotification('保存失败', '保存过程中发生错误');
        }
    }

    // 重置设置
    async resetSettings() {
        if (!confirm('确定要重置所有设置为默认值吗？')) {
            return;
        }

        try {
            await ipcRenderer.invoke('config:reset');
            await this.loadConfig();
            this.loadSettings();
            this.showNotification('重置成功', '设置已重置为默认值');
        } catch (error) {
            console.error('重置设置失败:', error);
            this.showNotification('重置失败', '重置过程中发生错误');
        }
    }

    // 导出配置
    async exportConfig() {
        try {
            const result = await ipcRenderer.invoke('config:export');
            if (result) {
                this.showNotification('导出成功', '配置已导出');
            }
        } catch (error) {
            console.error('导出配置失败:', error);
            this.showNotification('导出失败', '导出过程中发生错误');
        }
    }

    // 导入配置
    async importConfig() {
        try {
            const result = await ipcRenderer.invoke('config:import');
            if (result) {
                await this.loadConfig();
                this.loadSettings();
                this.showNotification('导入成功', '配置已导入');
            }
        } catch (error) {
            console.error('导入配置失败:', error);
            this.showNotification('导入失败', '导入过程中发生错误');
        }
    }

    // 打开截图文件夹
    async openScreenshotFolder() {
        try {
            await ipcRenderer.invoke('file:openScreenshotFolder');
        } catch (error) {
            console.error('打开文件夹失败:', error);
        }
    }

    // 清理文件
    async cleanupFiles() {
        if (!confirm('确定要清理过期文件吗？此操作无法撤销。')) {
            return;
        }

        try {
            const retentionDays = this.currentConfig?.retentionDays || 30;
            const result = await ipcRenderer.invoke('files:cleanup', retentionDays);
            
            if (result.success) {
                this.showNotification('清理完成', `已删除 ${result.deletedCount} 个文件`);
                await this.updateStatistics();
            } else {
                this.showNotification('清理失败', result.error || '清理过程中发生错误');
            }
        } catch (error) {
            console.error('清理文件失败:', error);
            this.showNotification('清理失败', '清理过程中发生错误');
        }
    }

    // 导出数据
    async exportData() {
        try {
            const result = await ipcRenderer.invoke('data:export');
            if (result) {
                this.showNotification('导出成功', '数据已导出');
            }
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showNotification('导出失败', '导出过程中发生错误');
        }
    }

    // 显示通知
    showNotification(title, message) {
        if (!this.currentConfig?.showNotifications) return;
        
        // 这里可以使用浏览器的通知API或自定义通知组件
        console.log(`通知: ${title} - ${message}`);
        
        // 简单的状态栏消息显示
        const statusElement = document.getElementById('app-status');
        const originalText = statusElement.textContent;
        statusElement.textContent = `${title}: ${message}`;
        statusElement.style.color = '#28a745';
        
        setTimeout(() => {
            statusElement.textContent = originalText;
            statusElement.style.color = '';
        }, 3000);
    }

    // 格式化时间
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }

    // 格式化日期时间
    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString('zh-CN');
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 检查OCR状态
    async checkOCRStatus() {
        try {
            const available = await ipcRenderer.invoke('ocr:isAvailable');
            const statusElement = document.getElementById('ocr-status');
            
            if (available) {
                statusElement.textContent = '✅ OCR功能可用';
                statusElement.style.color = '#28a745';
            } else {
                statusElement.textContent = '❌ OCR功能不可用';
                statusElement.style.color = '#dc3545';
            }
        } catch (error) {
            console.error('检查OCR状态失败:', error);
            const statusElement = document.getElementById('ocr-status');
            statusElement.textContent = '❓ 检查失败';
            statusElement.style.color = '#ffc107';
        }
    }

    // 测试OCR功能
    async testOCR() {
        const testBtn = document.getElementById('test-ocr-btn');
        const statusElement = document.getElementById('ocr-status');
        
        try {
            testBtn.disabled = true;
            testBtn.textContent = '测试中...';
            statusElement.textContent = '正在测试OCR功能...';
            statusElement.style.color = '#007bff';
            
            const result = await ipcRenderer.invoke('ocr:test');
            
            if (result) {
                statusElement.textContent = '✅ OCR测试通过';
                statusElement.style.color = '#28a745';
                this.showNotification('OCR测试', 'OCR功能正常工作');
            } else {
                statusElement.textContent = '❌ OCR测试失败';
                statusElement.style.color = '#dc3545';
                this.showNotification('OCR测试', 'OCR功能测试失败');
            }
            
        } catch (error) {
            console.error('OCR测试失败:', error);
            statusElement.textContent = '❌ 测试出错';
            statusElement.style.color = '#dc3545';
            this.showNotification('OCR测试', '测试过程中发生错误');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '测试OCR功能';
        }
    }
}

// 初始化应用
const app = new ScreenshotApp();

// 全局快捷键监听
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + S: 切换截图
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (app.isCapturing) {
            app.stopCapture();
        } else {
            app.startCapture();
        }
    }
    
    // Ctrl/Cmd + Shift + X: 立即截图
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        app.captureOnce();
    }
    
    // ESC: 关闭模态框
    if (e.key === 'Escape') {
        app.closeModal();
    }
});