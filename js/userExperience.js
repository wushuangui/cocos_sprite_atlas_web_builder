/**
 * 用户体验增强模块
 * 提供进度反馈、增强拖拽、详细错误信息等功能
 */

class UserExperienceEnhancer {
    constructor() {
        this.dragZone = null;
        this.dragState = {
            isDragging: false,
            fileCount: 0,
            totalSize: 0
        };
        this.progressQueue = [];
        this.currentProgress = null;
    }

    /**
     * 初始化拖拽增强
     * @param {HTMLElement} dropZone - 拖放区域
     * @param {Function} onFilesDrop - 文件拖放回调
     */
    initializeDragEnhancement(dropZone, onFilesDrop) {
        this.dragZone = dropZone;

        // 阻止默认行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // 拖入
        dropZone.addEventListener('dragenter', () => {
            this.dragState.isDragging = true;
            this.updateDragZoneVisual(true);
        });

        // 拖出
        dropZone.addEventListener('dragleave', (e) => {
            if (e.relatedTarget && !dropZone.contains(e.relatedTarget)) {
                this.dragState.isDragging = false;
                this.updateDragZoneVisual(false);
                this.clearDragPreview();
            }
        });

        // 拖悬停
        dropZone.addEventListener('dragover', (e) => {
            if (e.dataTransfer.files) {
                this.dragState.fileCount = e.dataTransfer.files.length;
                this.dragState.totalSize = this.calculateTotalSize(e.dataTransfer.files);
                this.showDragPreview();
            }
        });

        // 放置
        dropZone.addEventListener('drop', (e) => {
            this.dragState.isDragging = false;
            this.updateDragZoneVisual(false);
            this.clearDragPreview();

            const files = Array.from(e.dataTransfer.files);
            const imageFiles = this.filterImageFiles(files);

            if (imageFiles.length === 0) {
                this.showError('请拖放图片文件 (PNG, JPG)');
            } else if (imageFiles.length < files.length) {
                this.showWarning(`${imageFiles.length}/${files.length} 个文件是有效的图片`);
                onFilesDrop(imageFiles);
            } else {
                onFilesDrop(imageFiles);
            }
        });
    }

    /**
     * 更新拖拽区域视觉效果
     */
    updateDragZoneVisual(isDragging) {
        if (isDragging) {
            this.dragZone.classList.add('dragover-active');
            this.dragZone.style.transform = 'scale(1.02)';
            this.dragZone.style.transition = 'all 0.3s ease';
        } else {
            this.dragZone.classList.remove('dragover-active');
            this.dragZone.style.transform = '';
        }
    }

    /**
     * 显示拖拽预览信息
     */
    showDragPreview() {
        let previewElement = this.dragZone.querySelector('.drag-preview');
        if (!previewElement) {
            previewElement = document.createElement('div');
            previewElement.className = 'drag-preview';
            previewElement.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                font-size: 16px;
                z-index: 10;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                pointer-events: none;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                animation: fadeIn 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                min-width: 200px;
            `;
            this.dragZone.style.position = 'relative';
            this.dragZone.appendChild(previewElement);
        }

        const sizeText = this.formatFileSize(this.dragState.totalSize);
        const imageFiles = this.dragState.fileCount;
        const files = Array.from(this.dragZone.querySelectorAll('.drag-files-info')).reduce((acc, el) => acc, []);

        previewElement.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 18px; display: flex; align-items: center; gap: 8px; justify-content: center;">
                <span style="font-size: 24px;">📁</span>
                <span>${imageFiles} 个文件</span>
            </div>
            <div style="font-size: 14px; opacity: 0.9; font-weight: 400;">
                ${sizeText}
            </div>
            <div style="margin-top: 6px; font-size: 12px; opacity: 0.8; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                支持 PNG、JPG 格式
            </div>
            <div style="margin-top: 4px; font-size: 11px; opacity: 0.6;">
                放松鼠标以上传
            </div>
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -45%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            </style>
        `;
    }

    /**
     * 清除拖拽预览
     */
    clearDragPreview() {
        const previewElement = this.dragZone.querySelector('.drag-preview');
        if (previewElement) {
            previewElement.remove();
        }
        this.dragState.fileCount = 0;
        this.dragState.totalSize = 0;
    }

    /**
     * 过滤图片文件
     */
    filterImageFiles(files) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        return files.filter(file => allowedTypes.includes(file.type));
    }

    /**
     * 分析文件类型分布
     */
    analyzeFiles(files) {
        const types = {
            'image/png': { count: 0, name: 'PNG' },
            'image/jpeg': { count: 0, name: 'JPG' },
            'image/jpg': { count: 0, name: 'JPG' },
            'other': { count: 0, name: '其他' }
        };

        files.forEach(file => {
            if (types[file.type]) {
                types[file.type].count++;
            } else {
                types['other'].count++;
            }
        });

        return Object.entries(types)
            .filter(([_, info]) => info.count > 0)
            .map(([_, info]) => `${info.name}: ${info.count}`)
            .join(', ');
    }

    /**
     * 显示文件拖拽详情
     */
    showDragDetails(files) {
        const fileTypes = this.analyzeFiles(files);
        const sizeText = this.formatFileSize(this.calculateTotalSize(files));

        return {
            count: files.length,
            size: sizeText,
            types: fileTypes
        };
    }

    /**
     * 计算文件总大小
     */
    calculateTotalSize(files) {
        return Array.from(files).reduce((sum, file) => sum + file.size, 0);
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 显示增强进度
     */
    showEnhancedProgress(message, progress, details = {}) {
        let progressContainer = document.querySelector('.enhanced-progress-container');

        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'enhanced-progress-container';
            progressContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 1000;
                min-width: 320px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;
            document.body.appendChild(progressContainer);
        }

        const progressColor = progress < 30 ? '#ff6b6b' : progress < 70 ? '#feca57' : '#1dd1a1';
        const progressIcon = progress < 30 ? '🔄' : progress < 70 ? '⚙️' : '🎯';

        progressContainer.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 15px; animation: spin 2s linear infinite;">
                    ${progressIcon}
                </div>
                <div style="font-weight: 600; margin-bottom: 10px; color: #333; font-size: 16px;">${message}</div>
                <div style="margin-bottom: 20px;">
                    <div style="background: #e0e0e0; border-radius: 10px; overflow: hidden; height: 12px; position: relative;">
                        <div style="
                            width: ${progress}%;
                            background: ${progressColor};
                            height: 100%;
                            transition: width 0.3s ease;
                            position: relative;
                        "></div>
                    </div>
                    <div style="margin-top: 8px; font-size: 18px; font-weight: 600; color: ${progressColor};">
                        ${Math.round(progress)}%
                    </div>
                </div>
                ${this.renderProgressDetails(details)}
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        return progressContainer;
    }

    /**
     * 更新增强进度（带阶段信息）
     */
    updateEnhancedProgress(message, progress, current, total, details = {}) {
        const progressContainer = document.querySelector('.enhanced-progress-container');
        if (!progressContainer) {
            return this.showEnhancedProgress(message, progress, details);
        }

        const progressColor = progress < 30 ? '#ff6b6b' : progress < 70 ? '#feca57' : '#1dd1a1';
        const progressIcon = progress < 30 ? '🔄' : progress < 70 ? '⚙️' : '🎯';

        const currentAndTotal = current !== undefined && total !== undefined
            ? `<div style="font-size: 14px; color: #666; margin-top: 4px;">${current} / ${total}</div>`
            : '';

        progressContainer.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 15px; animation: spin 2s linear infinite;">
                    ${progressIcon}
                </div>
                <div style="font-weight: 600; margin-bottom: 10px; color: #333; font-size: 16px;">${message}</div>
                <div style="margin-bottom: 20px;">
                    <div style="background: #e0e0e0; border-radius: 10px; overflow: hidden; height: 12px;">
                        <div style="
                            width: ${progress}%;
                            background: ${progressColor};
                            height: 100%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    <div style="margin-top: 8px; font-size: 18px; font-weight: 600; color: ${progressColor};">
                        ${Math.round(progress)}%
                        ${currentAndTotal}
                    </div>
                </div>
                ${this.renderProgressDetails(details)}
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        return progressContainer;
    }

    /**
     * 渲染进度详情
     */
    renderProgressDetails(details) {
        if (!details || Object.keys(details).length === 0) return '';

        const detailsHtml = Object.entries(details).map(([key, value]) => {
            const label = this.formatDetailLabel(key);
            const formattedValue = this.formatDetailValue(key, value);
            return `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #666; font-size: 13px;">${label}:</span>
                <span style="font-weight: 600; font-size: 13px; color: #333;">${formattedValue}</span>
            </div>`;
        }).join('');

        return `<div style="text-align: left; background: #f8f9fa; padding: 12px; border-radius: 8px; margin-top: 10px;">${detailsHtml}</div>`;
    }

    /**
     * 格式化详情标签
     */
    formatDetailLabel(key) {
        const labels = {
            algorithm: '算法',
            phase: '阶段',
            imageCount: '图片数量',
            padding: '间距',
            maxWidth: '最大宽度',
            current: '当前',
            total: '总数',
            step: '步骤'
        };
        return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    /**
     * 格式化详情值
     */
    formatDetailValue(key, value) {
        if (key === 'maxWidth' || key === 'padding') {
            return `${value}px`;
        }
        return value;
    }

    /**
     * 隐藏增强进度
     */
    hideEnhancedProgress() {
        const progressContainer = document.querySelector('.enhanced-progress-container');
        if (progressContainer) {
            progressContainer.style.opacity = '0';
            progressContainer.style.transition = 'opacity 0.3s ease';
            setTimeout(() => progressContainer.remove(), 300);
        }
    }

    /**
     * 显示错误信息
     */
    showError(message, details = null) {
        return this.showNotification('error', message, details);
    }

    /**
     * 显示警告信息
     */
    showWarning(message, details = null) {
        return this.showNotification('warning', message, details);
    }

    /**
     * 显示成功信息
     */
    showSuccess(message, details = null) {
        return this.showNotification('success', message, details);
    }

    /**
     * 显示信息提示
     */
    showInfo(message, details = null) {
        return this.showNotification('info', message, details);
    }

    /**
     * 显示详细错误信息
     */
    showDetailedError(error, context = {}) {
        const message = error.message || '发生未知错误';
        const details = this.formatErrorDetails(error, context);

        // 在控制台输出完整错误信息
        console.error('[Detailed Error]', {
            message,
            error,
            context,
            stack: error.stack
        });

        return this.showNotification('error', message, details);
    }

    /**
     * 格式化错误详情
     */
    formatErrorDetails(error, context) {
        let details = '';

        // 添加上下文信息
        if (context.operation) {
            details += `<strong>操作:</strong> ${context.operation}<br>`;
        }
        if (context.step) {
            details += `<strong>步骤:</strong> ${context.step}<br>`;
        }
        if (context.file) {
            details += `<strong>文件:</strong> ${context.file}<br>`;
        }
        if (context.algorithm) {
            details += `<strong>算法:</strong> ${context.algorithm}<br>`;
        }

        // 添加错误类型
        if (error.name && error.name !== 'Error') {
            details += `<strong>类型:</strong> ${error.name}<br>`;
        }

        // 添加建议
        const suggestion = this.getErrorSuggestion(error);
        if (suggestion) {
            details += `<br><strong>💡 建议:</strong> ${suggestion}`;
        }

        return details;
    }

    /**
     * 获取错误建议
     */
    getErrorSuggestion(error) {
        const message = error.message || '';

        if (message.includes('超出宽度') || message.includes('超出高度')) {
            return '尝试增大最大宽度设置，或减少图片数量和尺寸';
        }
        if (message.includes('内存') || message.includes('memory')) {
            return '尝试减少一次性处理的图片数量，或关闭其他浏览器标签页';
        }
        if (message.includes('加载图片') || message.includes('load image')) {
            return '请检查图片文件是否损坏，尝试重新选择文件';
        }
        if (message.includes('生成失败') || message.includes('generate')) {
            return '检查图片格式是否支持（PNG、JPG），尝试调整算法参数';
        }

        return null;
    }

    /**
     * 显示通知
     */
    showNotification(type, message, details = null) {
        const icons = {
            error: '❌',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };

        const colors = {
            error: { bg: '#ff6b6b', border: '#ee5a5a', iconBg: '#ff5252' },
            warning: { bg: '#feca57', border: '#f0b429', iconBg: '#ffb300' },
            success: { bg: '#1dd1a1', border: '#10ac84', iconBg: '#00b894' },
            info: { bg: '#54a0ff', border: '#2e86de', iconBg: '#0984e3' }
        };

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            color: #333;
            padding: 0;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 1001;
            max-width: 400px;
            min-width: 300px;
            animation: slideIn 0.3s ease;
            border: 1px solid rgba(0,0,0,0.08);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
        `;

        let content = `
            <div style="display: flex; align-items: stretch;">
                <div style="background: ${colors[type].bg}; width: 4px; flex-shrink: 0;"></div>
                <div style="flex: 1; padding: 16px 18px; min-width: 0;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="
                            background: ${colors[type].iconBg};
                            color: white;
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 14px;
                            flex-shrink: 0;
                            margin-top: 2px;
                        ">${icons[type]}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; word-break: break-word; font-size: 15px; color: #2d3436; line-height: 1.4;">${message}</div>
                            ${details ? `<div style="margin-top: 6px; font-size: 13px; line-height: 1.5; color: #636e72; word-break: break-word;">${details}</div>` : ''}
                        </div>
                        <button style="
                            background: rgba(0,0,0,0.05);
                            border: none;
                            color: #636e72;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 16px;
                            line-height: 1;
                            flex-shrink: 0;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-top: 2px;
                            flex: 0 0 auto;
                        " onmouseover="this.style.background='rgba(0,0,0,0.1)'; this.style.color='#2d3436'" onmouseout="this.style.background='rgba(0,0,0,0.05)'; this.style.color='#636e72'">&times;</button>
                    </div>
                </div>
            </div>
        `;

        notification.innerHTML = content;

        // 添加动画样式
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // 关闭按钮事件
        notification.querySelector('button').addEventListener('click', () => {
            this.closeNotification(notification);
        });

        document.body.appendChild(notification);

        // 自动关闭
        const autoCloseTime = type === 'error' || type === 'warning' ? 8000 : 5000;
        setTimeout(() => this.closeNotification(notification), autoCloseTime);

        return notification;
    }

    /**
     * 关闭通知
     */
    closeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }

    /**
     * 显示加载动画
     */
    showLoading(message = '加载中...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1002;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div class="spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <div style="font-size: 16px;">${message}</div>
            </div>
        `;

        if (!document.querySelector('#spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * 隐藏加载动画
     */
    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    /**
     * 创建工具提示
     */
    createTooltip(element, content, position = 'top') {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = content;
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;

        element.style.position = 'relative';
        element.appendChild(tooltip);

        element.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            this.positionTooltip(tooltip, element, position);
        });

        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    }

    /**
     * 定位工具提示
     */
    positionTooltip(tooltip, element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        switch (position) {
            case 'top':
                tooltip.style.bottom = '100%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.marginBottom = '5px';
                break;
            case 'bottom':
                tooltip.style.top = '100%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.marginTop = '5px';
                break;
            case 'left':
                tooltip.style.right = '100%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translateY(-50%)';
                tooltip.style.marginRight = '5px';
                break;
            case 'right':
                tooltip.style.left = '100%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translateY(-50%)';
                tooltip.style.marginLeft = '5px';
                break;
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.clearDragPreview();
        this.hideEnhancedProgress();
        this.hideLoading();
        document.querySelectorAll('.notification').forEach(n => n.remove());
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserExperienceEnhancer };
} else {
    window.UserExperienceEnhancer = UserExperienceEnhancer;
}
