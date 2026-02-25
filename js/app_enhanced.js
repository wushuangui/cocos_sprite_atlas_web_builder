/**
 * 增强版主应用程序 - 集成所有优化
 * 包含：状态管理、配置集中化、智能算法、用户体验、监控分析
 */

// 初始化全局增强模块
const smartSelector = new SmartAlgorithmSelector();
const uxEnhancer = new UserExperienceEnhancer();
const analytics = new MonitoringAnalytics();

// 全局状态管理
class AppState {
    constructor() {
        this.images = [];
        this.canvas = null;
        this.frames = null;
        this.atlases = [];
        this.currentAlgorithm = getConfig('algorithm.default');
        this.useMultiAtlas = false;
        this.isProcessing = false;

        // 性能优化器
        this.memoryManager = PerformanceOptimizer.memoryManager;
        this.batchProcessor = PerformanceOptimizer.batchProcessor;
        this.algorithmCache = PerformanceOptimizer.algorithmCache;
    }

    // 添加图片
    addImages(newImages) {
        this.images = [...this.images, ...newImages];
        this.updateUI();
    }

    // 清空状态
    clear() {
        // 释放内存
        if (this.canvas) {
            this.memoryManager.releaseCanvas(this.canvas);
        }
        this.atlases.forEach(atlas => {
            if (atlas.canvas) {
                this.memoryManager.releaseCanvas(atlas.canvas);
            }
        });

        this.images = [];
        this.canvas = null;
        this.frames = null;
        this.atlases = [];
        this.isProcessing = false;

        // 重置测试面板
        if (testFramePath) testFramePath.value = '';
        if (testResult) testResult.style.display = 'none';
        if (testPlaceholder) testPlaceholder.style.display = 'block';
        if (testInfo) testInfo.innerHTML = '';
        if (testCanvas) {
            const ctx = testCanvas.getContext('2d');
            if (ctx && testCanvas.width > 0 && testCanvas.height > 0) {
                ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
            }
        }

        this.updateUI();
    }

    // 设置图集结果
    setAtlasResult(canvas, frames, atlases) {
        // 释放旧canvas
        if (this.canvas) {
            this.memoryManager.releaseCanvas(this.canvas);
        }
        
        this.canvas = canvas;
        this.frames = frames;
        this.atlases = atlases || [{
            canvas: canvas,
            frames: frames,
            width: canvas.width,
            height: canvas.height
        }];
        
        if (canvas) {
            this.memoryManager.registerCanvas(canvas);
        }
        
        this.isProcessing = false;
        this.updateUI();
    }

    // 更新UI状态
    updateUI() {
        const hasImages = this.images.length > 0;
        const hasAtlas = this.canvas !== null;

        generateBtn.disabled = !hasImages || this.isProcessing;
        downloadBtn.disabled = !hasAtlas;
        clearBtn.disabled = !hasImages && !hasAtlas;
        imageCount.textContent = `(${this.images.length})`;

        // 更新图片列表
        this.updateImageList();

        // 更新图集预览
        if (hasAtlas) {
            this.updateAtlasPreview();
        }

        // 显示/隐藏测试面板
        if (hasAtlas && testPanel) {
            testPanel.style.display = 'block';
            this.updateAvailableTextures();
        } else if (testPanel) {
            testPanel.style.display = 'none';
        }
    }

    // 更新可用纹理列表
    updateAvailableTextures() {
        const availableTextures = document.getElementById('availableTextures');
        if (!availableTextures || !this.frames) return;

        const textureNames = this.frames.map(f => f.name).sort();
        if (textureNames.length === 0) {
            availableTextures.innerHTML = '';
            return;
        }

        const displayCount = Math.min(textureNames.length, 10);
        const displayNames = textureNames.slice(0, displayCount).join(', ');
        const moreCount = textureNames.length - displayCount;

        if (moreCount > 0) {
            availableTextures.innerHTML = `可用纹理 (${textureNames.length}): ${displayNames} 等...`;
        } else {
            availableTextures.innerHTML = `可用纹理: ${displayNames}`;
        }
    }

    // 更新图片列表
    updateImageList() {
        imageList.innerHTML = '';
        this.images.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'image-item';
            div.innerHTML = `
                <img src="${item.img.src}" alt="${item.name}">
                <span>${item.name}</span>
                <div class="image-size">${item.width}×${item.height}</div>
                <button class="delete-btn" data-index="${index}" title="删除">×</button>
            `;

            // 添加删除按钮事件
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImage(index);
            });

            imageList.appendChild(div);
        });
    }

    // 删除单张图片
    removeImage(index) {
        if (index < 0 || index >= this.images.length) return;

        const removedImage = this.images[index];

        // 从数组中移除
        this.images.splice(index, 1);

        // 释放图片内存
        if (removedImage.img) {
            removedImage.img.src = '';
        }

        // 如果删除后没有图片了，清空图集
        if (this.images.length === 0) {
            this.clearAtlas();
        }

        // 更新UI
        this.updateUI();

        // 显示提示
        uxEnhancer.showInfo('图片已删除', `已移除: ${removedImage.name}`);

        // 跟踪操作
        analytics.trackAction('remove_image', {
            name: removedImage.name,
            remainingCount: this.images.length
        });
    }

    // 清空图集（保留图片）
    clearAtlas() {
        if (this.canvas) {
            this.memoryManager.releaseCanvas(this.canvas);
        }
        this.atlases.forEach(atlas => {
            if (atlas.canvas) {
                this.memoryManager.releaseCanvas(atlas.canvas);
            }
        });

        this.canvas = null;
        this.frames = null;
        this.atlases = [];

        // 重置测试面板
        if (testFramePath) testFramePath.value = '';
        if (testResult) testResult.style.display = 'none';
        if (testPlaceholder) testPlaceholder.style.display = 'block';
        if (testInfo) testInfo.innerHTML = '';
        if (testCanvas) {
            const ctx = testCanvas.getContext('2d');
            if (ctx && testCanvas.width > 0 && testCanvas.height > 0) {
                ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
            }
        }
    }

    // 更新图集预览
    updateAtlasPreview() {
        if (this.atlases.length === 1) {
            atlasPreview.innerHTML = '';
            atlasPreview.appendChild(this.canvas);
            showStats(this.canvas.width, this.canvas.height, this.images.length, this.images);
        } else {
            this.displayMultiAtlasPreview();
        }
    }

    // 显示多图集预览
    displayMultiAtlasPreview() {
        atlasPreview.innerHTML = '';

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'atlas-tabs';

        const contentContainer = document.createElement('div');
        contentContainer.className = 'atlas-content';

        this.atlases.forEach((atlas, index) => {
            const tab = document.createElement('button');
            tab.className = `atlas-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = `图集 ${index + 1}`;
            tab.onclick = () => this.switchAtlasTab(index);
            tabsContainer.appendChild(tab);

            const contentItem = document.createElement('div');
            contentItem.className = 'atlas-content-item';
            contentItem.style.display = index === 0 ? 'block' : 'none';
            contentItem.innerHTML = `
                <div class="atlas-info">
                    <div class="atlas-info-item"><strong>尺寸:</strong> ${atlas.width}×${atlas.height}</div>
                    <div class="atlas-info-item"><strong>图片数:</strong> ${atlas.frames.length} 张</div>
                </div>
            `;

            // 创建canvas副本以避免引用问题
            const canvasCopy = document.createElement('canvas');
            canvasCopy.width = atlas.canvas.width;
            canvasCopy.height = atlas.canvas.height;
            const ctx = canvasCopy.getContext('2d');
            ctx.drawImage(atlas.canvas, 0, 0);
            contentItem.appendChild(canvasCopy);
            contentContainer.appendChild(contentItem);
        });

        atlasPreview.appendChild(tabsContainer);
        atlasPreview.appendChild(contentContainer);

        this.displayMultiAtlasStats();
    }

    // 切换图集标签
    switchAtlasTab(index) {
        document.querySelectorAll('.atlas-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.atlas-content-item').forEach(c => c.style.display = 'none');

        document.querySelectorAll('.atlas-tab')[index].classList.add('active');
        document.querySelectorAll('.atlas-content-item')[index].style.display = 'block';

        this.canvas = this.atlases[index].canvas;
        this.frames = this.atlases[index].frames;

        // 切换图集时清除测试面板
        if (testFramePath) testFramePath.value = '';
        if (testResult) testResult.style.display = 'none';
        if (testPlaceholder) testPlaceholder.style.display = 'block';
        if (testInfo) testInfo.innerHTML = '';
        if (testCanvas) {
            const ctx = testCanvas.getContext('2d');
            if (ctx && testCanvas.width > 0 && testCanvas.height > 0) {
                ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
            }
        }

        showStatus(`已切换到图集 ${index + 1}`, 'success');
    }

    // 显示多图集统计
    displayMultiAtlasStats() {
        const totalImages = this.atlases.reduce((sum, atlas) => sum + atlas.frames.length, 0);
        const totalArea = this.atlases.reduce((sum, atlas) => sum + atlas.width * atlas.height, 0);
        const usedArea = this.atlases.reduce((sum, atlas) => 
            sum + atlas.frames.reduce((s, f) => s + f.width * f.height, 0), 0);
        const efficiency = ((usedArea / totalArea) * 100).toFixed(2);
        
        stats.innerHTML = `
            <h4>图集统计信息</h4>
            <div class="stats-info">
                <div class="stat-item">
                    <div class="stat-label">图集数量</div>
                    <div class="stat-value">${this.atlases.length} 个</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">总图片数</div>
                    <div class="stat-value">${totalImages} 张</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">空间利用率</div>
                    <div class="stat-value">${efficiency}%</div>
                </div>
            </div>
        `;
        stats.style.display = 'block';
    }
}

// 初始化应用状态
const appState = new AppState();

// DOM元素引用
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imageList = document.getElementById('imageList');
const atlasPreview = document.getElementById('atlasPreview');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const imageCount = document.getElementById('imageCount');
const status = document.getElementById('status');
const stats = document.getElementById('stats');

// 测试面板元素引用
const testPanel = document.getElementById('testPanel');
const testBtn = document.getElementById('testBtn');
const clearTestBtn = document.getElementById('clearTestBtn');
const testFramePath = document.getElementById('testFramePath');
const testResult = document.getElementById('testResult');
const testInfo = document.getElementById('testInfo');
const testCanvas = document.getElementById('testCanvas');
const testPlaceholder = document.getElementById('testPlaceholder');

// 初始化进度管理器
PerformanceOptimizer.initProgressManager(document.querySelector('.content'));

// 初始化拖拽增强
uxEnhancer.initializeDragEnhancement(dropZone, (files) => {
    analytics.trackAction('upload_images', {
        count: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });
    handleFiles(files);
});

// 事件监听器
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// 增强的文件处理
async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(file =>
        file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg'
    );

    if (imageFiles.length === 0) {
        showStatus('请选择有效的图片文件', 'error');
        return;
    }

    showStatus(`正在加载 ${imageFiles.length} 张图片...`, 'info');
    PerformanceOptimizer.progressManager.show('加载图片中...');

    try {
        PerformanceMonitor.startMeasure('loadImages');

        // 使用分批处理加载图片
        appState.batchProcessor.setProgressCallback((progress, current, total) => {
            PerformanceOptimizer.progressManager.update(progress, current, total);
        });

        const newImages = await appState.batchProcessor.processBatch(
            imageFiles,
            loadSingleImage
        );

        const duration = PerformanceMonitor.endMeasure('loadImages');

        appState.addImages(newImages);

        PerformanceOptimizer.progressManager.hide();
        showStatus(`成功加载 ${newImages.length} 张图片 (耗时 ${duration.toFixed(0)}ms)`, 'success');

        // 显示缓存统计
        const cacheStats = appState.algorithmCache.getStats();
        console.log('[Cache Stats]', cacheStats);

        // 更新算法建议
        updateAlgorithmSuggestion();

    } catch (error) {
        PerformanceOptimizer.progressManager.hide();

        // 跟踪错误
        analytics.trackError(error, {
            operation: '图片加载',
            step: 'loadImages',
            fileCount: imageFiles.length
        });

        // 显示详细错误信息
        uxEnhancer.showDetailedError(error, {
            operation: '图片加载',
            step: '读取和处理',
            fileCount: imageFiles.length
        });

        console.error('加载错误:', error);
    }
}

// 更新算法建议
function updateAlgorithmSuggestion() {
    if (appState.images.length === 0) return;

    const suggestionElement = document.getElementById('algorithmSuggestion');
    const currentAlgorithm = document.getElementById('algorithm').value;
    const selection = smartSelector.selectBestAlgorithm(appState.images);

    if (!suggestionElement) return;

    if (selection.algorithm !== currentAlgorithm) {
        const algorithmNames = {
            'maxRectangles': 'MaxRectangles',
            'shelf': 'Shelf'
        };

        // 计算得分差异
        const scoreDiff = selection.scores[currentAlgorithm === 'maxRectangles' ? 'maxRectangles' : 'shelf'] -
                         selection.scores[selection.algorithm];

        suggestionElement.style.display = 'block';
        suggestionElement.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 15px; border-radius: 8px; font-size: 13px; line-height: 1.5;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="font-size: 16px;">💡</span>
                    <span style="font-weight: 600;">建议使用 <strong>${algorithmNames[selection.algorithm]}</strong> 算法</span>
                </div>
                <div style="opacity: 0.9; margin-bottom: 6px;">
                    原因: ${selection.reason}
                </div>
                <div style="font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 8px;">
                    <span>置信度: <strong>${(selection.confidence * 100).toFixed(0)}%</strong></span>
                    <span>|</span>
                    <span>预期提升: <strong>+${Math.abs(scoreDiff).toFixed(1)}</strong> 分</span>
                </div>
            </div>
        `;
    } else {
        suggestionElement.style.display = 'none';
    }
}

// 监听算法选择变化
document.getElementById('algorithm')?.addEventListener('change', updateAlgorithmSuggestion);

// 单张图片加载函数
function loadSingleImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    img,
                    name: file.name.replace(/\.(png|jpe?g)$/i, ''),
                    width: img.width,
                    height: img.height,
                    file
                });
            };
            img.onerror = () => reject(new Error(`无法加载图片: ${file.name}`));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error(`无法读取文件: ${file.name}`));
        reader.readAsDataURL(file);
    });
}

// 图集生成函数
async function generateAtlas() {
    if (appState.images.length === 0) {
        showStatus('请先选择图片', 'error');
        return;
    }

    const padding = parseInt(document.getElementById('padding').value) || 0;
    const maxWidth = parseInt(document.getElementById('maxWidth').value) || 2048;
    const usePowerOfTwo = document.getElementById('powerOfTwo').checked;
    const algorithm = document.getElementById('algorithm').value;

    appState.currentAlgorithm = algorithm;
    appState.isProcessing = true;
    appState.updateUI();

    // 智能算法选择建议
    const smartSelection = smartSelector.selectBestAlgorithm(appState.images);

    // 输出详细的算法对比信息
    console.log('[SmartSelector] ============ 算法分析报告 ============');
    console.log('[SmartSelector] 推荐算法:', smartSelection.algorithm);
    console.log('[SmartSelector] 当前算法:', algorithm);
    console.log('[SmartSelector] 原因:', smartSelection.reason);
    console.log('[SmartSelector] 置信度:', (smartSelection.confidence * 100).toFixed(1) + '%');

    if (smartSelection.features) {
        console.log('[SmartSelector] 图片特征分析:');
        console.log('  - 数量:', smartSelection.features.count);
        console.log('  - 总面积:', smartSelection.features.totalArea);
        console.log('  - 平均尺寸:', smartSelection.features.avgSize);
        console.log('  - 复杂度:', smartSelection.features.complexity);
        console.log('  - 方差:', smartSelection.features.variance);

        if (smartSelection.features.shapeDistribution) {
            console.log('  - 形状分布:', smartSelection.features.shapeDistribution);
        }
        if (smartSelection.features.distribution) {
            console.log('  - 尺寸分布:', smartSelection.features.distribution);
        }
    }

    console.log('[SmartSelector] 算法评分:');
    console.log('  - MaxRectangles:', smartSelection.scores.maxRectangles);
    console.log('  - Shelf:', smartSelection.scores.shelf);

    // 输出完整的对比报告
    const comparisonReport = smartSelector.generateComparisonReport(appState.images);
    console.log('[SmartSelector] 完整对比报告:', comparisonReport);
    console.log('[SmartSelector] ========================================');

    if (smartSelection.algorithm !== algorithm) {
        uxEnhancer.showInfo('算法建议已记录', `详情请查看控制台（F12）`);
    }

    showStatus('正在生成图集...', 'info');
    PerformanceOptimizer.progressManager.show('生成图集中...');

    // 使用增强进度条
    uxEnhancer.showEnhancedProgress('生成图集中...', 0, {
        algorithm: algorithm,
        imageCount: appState.images.length,
        padding: padding,
        maxWidth: maxWidth
    });

    try {
        const endMeasure = analytics.startMeasure('generateAtlas', {
            algorithm,
            imageCount: appState.images.length,
            padding,
            maxWidth,
            usePowerOfTwo
        });

        // 检查缓存
        const cacheKey = { padding, maxWidth, usePowerOfTwo };
        const cachedResult = appState.algorithmCache.get(appState.images, algorithm, cacheKey);

        let result;
        let fromCache = false;

        if (cachedResult) {
            console.log('[Cache] 使用缓存的图集结果');
            result = restoreFromCache(cachedResult);
            fromCache = true;
        } else {
            // 执行算法
            uxEnhancer.showEnhancedProgress('打包图片...', 20, {
                algorithm: algorithm,
                phase: 'packing'
            });

            if (algorithm === 'maxRectangles') {
                result = await generateWithMaxRectangles(appState.images, padding, maxWidth, usePowerOfTwo);
            } else {
                result = await generateWithShelf(appState.images, padding, maxWidth, usePowerOfTwo);
            }

            // 缓存结果（不缓存 canvas 对象，只缓存帧信息和尺寸）
            if (result) {
                const cacheData = {
                    frames: result.frames,
                    width: result.width,
                    height: result.height
                };
                appState.algorithmCache.set(appState.images, algorithm, cacheKey, cacheData);
            }
        }

        if (!result) {
            throw new Error('图集生成失败: 图片尺寸超过最大宽度限制');
        }

        // 验证结果
        uxEnhancer.showEnhancedProgress('验证结果...', 80, {
            phase: 'validation'
        });
        validateFrames(result.frames, result.canvas.width, result.canvas.height);

        const duration = endMeasure({
            success: true,
            fromCache,
            efficiency: calculateEfficiency(appState.images, result.canvas.width, result.canvas.height)
        });

        appState.setAtlasResult(result.canvas, result.frames, [{
            canvas: result.canvas,
            frames: result.frames,
            width: result.width,
            height: result.height
        }]);

        PerformanceOptimizer.progressManager.hide();
        uxEnhancer.hideEnhancedProgress();

        const sizeType = usePowerOfTwo ? '2的幂次方' : '原始';
        const efficiency = calculateEfficiency(appState.images, result.canvas.width, result.canvas.height);

        // 记录算法使用结果
        smartSelector.recordResult(algorithm, true, parseFloat(efficiency));

        // 跟踪用户行为
        analytics.trackAction('generate_atlas', {
            algorithm,
            padding,
            maxWidth,
            usePowerOfTwo,
            imageCount: appState.images.length,
            duration,
            efficiency: parseFloat(efficiency),
            fromCache,
            width: result.width,
            height: result.height
        });

        // 显示成功通知
        const cacheInfo = fromCache ? ' (缓存)' : '';
        uxEnhancer.showSuccess(
            `图集生成成功！`,
            `尺寸: ${result.width}×${result.height} (${sizeType}), 利用率: ${efficiency}%, 耗时: ${duration.toFixed(0)}ms${cacheInfo}`
        );

        showStatus(`图集生成成功！尺寸: ${result.width}×${result.height} (${sizeType}), 利用率: ${efficiency}% (耗时 ${duration.toFixed(0)}ms)`, 'success');

        // 显示性能统计
        const perfStats = PerformanceMonitor.getAllStats();
        console.log('[Performance Stats]', perfStats);

    } catch (error) {
        PerformanceOptimizer.progressManager.hide();
        uxEnhancer.hideEnhancedProgress();

        appState.isProcessing = false;
        appState.updateUI();

        // 跟踪错误
        analytics.trackError(error, {
            algorithm,
            imageCount: appState.images.length,
            operation: 'generate_atlas'
        });

        // 记录算法使用结果（失败）
        smartSelector.recordResult(algorithm, false, 0);

        // 显示详细错误通知
        uxEnhancer.showDetailedError(error, {
            operation: '图集生成',
            step: '处理中',
            algorithm: algorithm,
            imageCount: appState.images.length
        });

        showStatus('图集生成失败: ' + error.message, 'error');
        console.error('生成错误:', error);
    }
}

// MaxRectangles算法生成
async function generateWithMaxRectangles(images, padding, maxWidth, usePowerOfTwo) {
    return new Promise((resolve) => {
        setTimeout(() => {
            PerformanceMonitor.startMeasure('maxRectanglesAlgorithm');
            const result = packImagesWithMaxRectangles(images, padding, maxWidth, usePowerOfTwo);
            PerformanceMonitor.endMeasure('maxRectanglesAlgorithm');
            resolve(result);
        }, 10);
    });
}

// Shelf算法生成
async function generateWithShelf(images, padding, maxWidth, usePowerOfTwo) {
    return new Promise((resolve) => {
        setTimeout(() => {
            PerformanceMonitor.startMeasure('shelfAlgorithm');
            const result = packImages(images, padding, maxWidth, usePowerOfTwo);
            PerformanceMonitor.endMeasure('shelfAlgorithm');
            resolve(result);
        }, 10);
    });
}

// 从缓存恢复图集结果
function restoreFromCache(cacheData) {
    const { frames, width, height } = cacheData;

    // 创建新的 canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 绘制所有帧（frames 中已包含 img 引用）
    for (const frame of frames) {
        if (!frame.img) {
            console.warn(`[Restore] 帧 ${frame.name} 缺少图片引用`);
            continue;
        }

        if (frame.rotated) {
            ctx.save();
            ctx.translate(frame.x + frame.width / 2, frame.y + frame.height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(
                frame.img,
                0, 0, frame.originalWidth, frame.originalHeight,
                -frame.originalWidth / 2, -frame.originalHeight / 2,
                frame.originalWidth, frame.originalHeight
            );
            ctx.restore();
        } else {
            ctx.drawImage(frame.img, frame.x, frame.y, frame.width, frame.height);
        }
    }

    return {
        canvas,
        frames,
        width,
        height
    };
}

// 帧验证函数
function validateFrames(frames, atlasWidth, atlasHeight) {
    for (const frame of frames) {
        const right = frame.x + frame.width;
        const bottom = frame.y + frame.height;

        if (frame.x < 0 || frame.y < 0) {
            throw new Error(`帧 ${frame.name} 位置无效: (${frame.x}, ${frame.y})`);
        }
        if (right > atlasWidth) {
            throw new Error(`帧 ${frame.name} 超出宽度: 右边界 ${right} > 图集宽度 ${atlasWidth}`);
        }
        if (bottom > atlasHeight) {
            throw new Error(`帧 ${frame.name} 超出高度: 下边界 ${bottom} > 图集高度 ${atlasHeight}`);
        }
        if (frame.width > atlasWidth || frame.height > atlasHeight) {
            throw new Error(`帧 ${frame.name} 尺寸过大: ${frame.width}×${frame.height}`);
        }
    }
}

// 计算空间利用率
function calculateEfficiency(images, atlasWidth, atlasHeight) {
    const totalArea = atlasWidth * atlasHeight;
    const usedArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
    return ((usedArea / totalArea) * 100).toFixed(2);
}

// 显示统计信息
function showStats(width, height, count, images) {
    const totalArea = width * height;
    const usedArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
    const efficiency = ((usedArea / totalArea) * 100).toFixed(2);

    stats.innerHTML = `
        <h4>图集统计信息</h4>
        <div class="stats-info">
            <div class="stat-item">
                <div class="stat-label">图集尺寸</div>
                <div class="stat-value">${width} × ${height}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">图片数量</div>
                <div class="stat-value">${count} 张</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">空间利用率</div>
                <div class="stat-value">${efficiency}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">最大图片</div>
                <div class="stat-value">${Math.max(...images.map(i => i.width))} × ${Math.max(...images.map(i => i.height))}</div>
            </div>
        </div>
    `;
    stats.style.display = 'block';
}

// 显示下载对话框
function showDownloadDialog() {
    if (!appState.canvas || !appState.frames) {
        showStatus('请先生成图集', 'error');
        return;
    }

    const defaultName = document.getElementById('atlasName').value.trim() || 'sprite_atlas';
    const exportFileName = document.getElementById('exportFileName');
    const fileHint = document.getElementById('fileHint');
    const downloadModal = document.getElementById('downloadModal');

    if (exportFileName) {
        exportFileName.value = defaultName;
        updateFilePreview();
        exportFileName.focus();
    }

    if (downloadModal) {
        downloadModal.style.display = 'block';
    }
}

// 隐藏下载对话框
function hideDownloadDialog() {
    const downloadModal = document.getElementById('downloadModal');
    downloadModal.style.display = 'none';
}

// 获取导出格式
function getExportFormat() {
    const radio = document.querySelector('input[name="exportFormat"]:checked');
    return radio ? radio.value : 'zip';
}

// 更新文件预览
function updateFilePreview() {
    const exportFileName = document.getElementById('exportFileName');
    const filePreview = document.getElementById('filePreview');
    const fileHint = document.getElementById('fileHint');
    
    const fileName = exportFileName.value.trim() || 'sprite_atlas';
    const format = getExportFormat();
    
    if (format === 'zip') {
        filePreview.textContent = `${fileName}.zip`;
        fileHint.innerHTML = `导出的文件为: <span id="filePreview">${fileName}.zip</span> (包含 .png 和 .plist)`;
    } else {
        fileHint.innerHTML = `导出的文件为: <span id="filePreview">${fileName}.png</span> 和 <span>${fileName}.plist</span>`;
    }
}

// 确认下载
async function confirmDownload() {
    if (!appState.canvas || !appState.frames) {
        showStatus('请先生成图集', 'error');
        return;
    }

    const exportFileName = document.getElementById('exportFileName');
    const downloadModal = document.getElementById('downloadModal');
    
    const atlasName = exportFileName.value.trim() || 'sprite_atlas';
    const format = getExportFormat();

    if (!atlasName || atlasName.length === 0) {
        showStatus('请输入文件名称', 'error');
        return;
    }

    const plistContent = generatePlist(atlasName, appState.canvas.width, appState.canvas.height, appState.frames);

    if (format === 'zip') {
        // 生成ZIP压缩包
        try {
            const zip = new JSZip();
            
            // 将canvas转换为blob并添加到zip
            const pngBlob = await new Promise(resolve => {
                appState.canvas.toBlob(resolve, 'image/png');
            });
            
            zip.file(`${atlasName}.png`, pngBlob);
            zip.file(`${atlasName}.plist`, plistContent);
            
            // 生成zip文件
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `${atlasName}.zip`);
            
            hideDownloadDialog();
            showStatus(`图集压缩包导出成功！文件名: ${atlasName}.zip`, 'success');
        } catch (error) {
            showStatus('压缩包生成失败: ' + error.message, 'error');
        }
    } else {
        // 单独下载文件
        appState.canvas.toBlob(function(blob) {
            saveAs(blob, `${atlasName}.png`);
            const plistBlob = new Blob([plistContent], { type: 'application/xml' });
            saveAs(plistBlob, `${atlasName}.plist`);
            hideDownloadDialog();
            showStatus(`图集导出成功！文件名: ${atlasName}`, 'success');
        }, 'image/png');
    }
}

// 生成PLIST内容
function generatePlist(atlasName, width, height, frames) {
    const plistHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>frames</key>
  <dict>`;

    const plistFooter = `  </dict>
  <key>metadata</key>
  <dict>
    <key>format</key>
    <integer>2</integer>
    <key>size</key>
    <string>{${width},${height}}</string>
    <key>textureFileName</key>
    <string>${atlasName}.png</string>
  </dict>
</dict>
</plist>`;

    let framesContent = '';
    frames.forEach(frame => {
        const frameName = frame.name + '.png';
        const frameX = Math.round(frame.x);
        const frameY = Math.round(frame.y);
        const frameWidth = Math.round(frame.width);
        const frameHeight = Math.round(frame.height);
        const originalWidth = Math.round(frame.originalWidth);
        const originalHeight = Math.round(frame.originalHeight);
        const offsetX = Math.round(frame.offsetX || 0);
        const offsetY = Math.round(frame.offsetY || 0);
        const rotated = frame.rotated || false;

        framesContent += `
    <key>${frameName}</key>
    <dict>
      <key>frame</key>
      <string>{{${frameX},${frameY}},{${frameWidth},${frameHeight}}}</string>
      <key>offset</key>
      <string>{${offsetX},${offsetY}}</string>
      <key>rotated</key>
      <${rotated}/>
      <key>sourceColorRect</key>
      <string>{{0,0},{${originalWidth},${originalHeight}}}</string>
      <key>sourceSize</key>
      <string>{${originalWidth},${originalHeight}}</string>
    </dict>`;
    });

    return plistHeader + framesContent + plistFooter;
}

// 状态显示函数
function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';

    // 自动隐藏成功消息
    if (type === 'success') {
        setTimeout(() => {
            if (status.textContent === message) {
                status.style.display = 'none';
            }
        }, 5000);
    }
}

// 测试纹理函数
function testTexture() {
    if (!appState.canvas || !appState.frames) {
        showStatus('请先生成图集', 'error');
        return;
    }

    if (!testFramePath) {
        showStatus('测试面板元素未找到', 'error');
        return;
    }

    const framePath = testFramePath.value.trim();
    if (!framePath) {
        showStatus('请输入纹理路径', 'error');
        return;
    }

    const frameName = framePath.replace(/\.png$/i, '');
    const frame = appState.frames.find(f => f.name === frameName);

    if (!frame) {
        // 显示可用的纹理列表帮助用户
        const availableFrames = appState.frames.map(f => f.name).join(', ');
        showStatus(`未找到纹理: ${framePath}。可用的纹理: ${availableFrames}`, 'error');
        return;
    }

    if (!testCanvas) {
        showStatus('测试画布元素未找到', 'error');
        return;
    }

    testResult.style.display = 'block';
    if (testPlaceholder) testPlaceholder.style.display = 'none';

    const displayWidth = frame.originalWidth + 40;
    const displayHeight = frame.originalHeight + 40;

    const ctx = testCanvas.getContext('2d');
    testCanvas.width = displayWidth;
    testCanvas.height = displayHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);

    // 绘制透明格背景
    ctx.fillStyle = '#e0e0e0';
    for (let i = 0; i < testCanvas.width; i += 10) {
        for (let j = 0; j < testCanvas.height; j += 10) {
            if ((i + j) % 20 === 0) {
                ctx.fillRect(i, j, 10, 10);
            }
        }
    }

    if (frame.rotated) {
        // 旋转的图片：创建一个临时canvas来还原旋转
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frame.originalWidth;
        tempCanvas.height = frame.originalHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // 在临时canvas上绘制旋转后的图片，然后旋转回来
        tempCtx.translate(frame.originalWidth / 2, frame.originalHeight / 2);
        tempCtx.rotate(Math.PI / 2);
        tempCtx.drawImage(
            appState.canvas,
            frame.x, frame.y, frame.width, frame.height,
            -frame.width / 2, -frame.height / 2, frame.width, frame.height
        );

        // 将还原后的图片绘制到测试canvas
        ctx.drawImage(tempCanvas, 20, 20);
    } else {
        ctx.drawImage(
            appState.canvas,
            frame.x, frame.y, frame.width, frame.height,
            20, 20, frame.width, frame.height
        );
    }

    // 绘制边框
    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, frame.originalWidth, frame.originalHeight);

    // 显示纹理信息
    if (testInfo) {
        testInfo.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
                <div><strong>名称:</strong> ${frame.name}.png</div>
                <div><strong>位置:</strong> (${Math.round(frame.x)}, ${Math.round(frame.y)})</div>
                <div><strong>尺寸:</strong> ${Math.round(frame.width)} × ${Math.round(frame.height)}</div>
                <div><strong>原始:</strong> ${frame.originalWidth} × ${frame.originalHeight}</div>
                <div><strong>旋转:</strong> ${frame.rotated ? '是 (90°)' : '否'}</div>
                <div><strong>偏移:</strong> (${frame.offsetX}, ${frame.offsetY})</div>
            </div>
        `;
    }

    showStatus(`成功获取纹理: ${framePath}`, 'success');
}

// 清除测试函数
function clearTest() {
    testResult.style.display = 'none';
    testFramePath.value = '';
    testPlaceholder.style.display = 'block';
    testInfo.innerHTML = '';
    const ctx = testCanvas.getContext('2d');
    if (testCanvas.width > 0 && testCanvas.height > 0) {
        ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
    }
    showStatus('测试面板已清除', 'success');
}

// 按钮事件处理
clearBtn.addEventListener('click', () => {
    appState.clear();
    atlasPreview.innerHTML = '<div class="placeholder">生成图集后在此预览</div>';
    stats.style.display = 'none';
    status.style.display = 'none';
    fileInput.value = '';

    // 隐藏测试面板
    if (testPanel) {
        testPanel.style.display = 'none';
    }
});

generateBtn.addEventListener('click', generateAtlas);

// 下载功能（保持原有逻辑，但使用优化后的状态）
downloadBtn.addEventListener('click', () => {
    if (!appState.canvas || !appState.frames) {
        showStatus('请先生成图集', 'error');
        return;
    }
    
    // 触发下载逻辑
    showDownloadDialog();
});

// 下载对话框事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    const exportFileName = document.getElementById('exportFileName');

    if (modalOverlay) {
        modalOverlay.addEventListener('click', hideDownloadDialog);
    }
    if (modalClose) {
        modalClose.addEventListener('click', hideDownloadDialog);
    }
    if (modalCancel) {
        modalCancel.addEventListener('click', hideDownloadDialog);
    }
    if (modalConfirm) {
        modalConfirm.addEventListener('click', confirmDownload);
    }
    if (exportFileName) {
        exportFileName.addEventListener('input', updateFilePreview);
    }

    // 导出格式单选按钮事件
    document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
        radio.addEventListener('change', updateFilePreview);
    });

    // 测试面板事件监听器
    if (testBtn) {
        testBtn.addEventListener('click', testTexture);
    }
    if (clearTestBtn) {
        clearTestBtn.addEventListener('click', clearTest);
    }
});

// 窗口关闭时清理资源
window.addEventListener('beforeunload', () => {
    PerformanceOptimizer.destroy();
});

// 初始化UI
appState.updateUI();

// 监控面板功能
const monitoringPanel = document.getElementById('monitoringPanel');
const closeMonitoringPanel = document.getElementById('closeMonitoringPanel');
const exportMonitoringDataBtn = document.getElementById('exportMonitoringData');

// 添加监控面板按钮到控制面板
const controlPanel = document.querySelector('.control-panel');
if (controlPanel) {
    const monitorBtn = document.createElement('button');
    monitorBtn.id = 'showMonitoringPanel';
    monitorBtn.className = 'btn-monitor';
    monitorBtn.style.cssText = 'width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;';
    monitorBtn.innerHTML = '<span>📊</span> 查看性能监控';
    monitorBtn.onclick = showMonitoringPanel;
    controlPanel.appendChild(monitorBtn);
}

// 显示监控面板
function showMonitoringPanel() {
    if (!monitoringPanel) return;
    monitoringPanel.style.display = 'block';
    updateMonitoringPanel();
}

// 隐藏监控面板
function hideMonitoringPanel() {
    if (monitoringPanel) {
        monitoringPanel.style.display = 'none';
    }
}

// 更新监控面板数据
function updateMonitoringPanel() {
    const dashboardData = analytics.getDashboardData();

    // 更新基本指标
    document.getElementById('monitoringSessionDuration').textContent = dashboardData.sessionDuration + 's';
    document.getElementById('monitoringImagesUploaded').textContent = dashboardData.imagesUploaded;
    document.getElementById('monitoringAtlasesGenerated').textContent = dashboardData.atlasesGenerated;
    document.getElementById('monitoringErrorsCount').textContent = dashboardData.errorsCount;

    // 更新算法使用统计
    const algStats = smartSelector.getStatistics();
    const algHtml = Object.entries(algStats).map(([name, stat]) => {
        if (name === 'summary') return '';
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px; margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>${name}</span>
                    <span>${stat.usage}次</span>
                </div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 3px;">
                    成功率: ${(stat.successRate * 100).toFixed(1)}%
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('monitoringAlgorithmsStats').innerHTML = algHtml || '<div style="opacity: 0.5;">暂无数据</div>';

    // 更新性能指标
    const perfStats = analytics.getAllPerformanceStats();
    const perfHtml = Object.entries(perfStats).map(([name, stat]) => {
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px; margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>${name}</span>
                    <span>平均 ${stat.avg.toFixed(2)}ms</span>
                </div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 3px;">
                    最大: ${stat.max.toFixed(2)}ms / 最小: ${stat.min.toFixed(2)}ms (${stat.count}次)
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('monitoringPerformanceStats').innerHTML = perfHtml || '<div style="opacity: 0.5;">暂无数据</div>';

    // 更新内存信息
    if (dashboardData.memoryUsage) {
        const memoryHtml = `
            <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px;">
                <div style="font-size: 11px;">内存使用: ${dashboardData.memoryUsage.used}MB / ${dashboardData.memoryUsage.total}MB (限制: ${dashboardData.memoryUsage.limit}MB)</div>
            </div>
        `;
        // 可以添加到面板中显示
    }
}

// 导出监控数据
function exportMonitoringData() {
    const data = analytics.exportData('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    uxEnhancer.showSuccess('监控数据已导出', '文件已保存到下载目录');
}

// 事件监听器
if (closeMonitoringPanel) {
    closeMonitoringPanel.addEventListener('click', hideMonitoringPanel);
}

if (exportMonitoringDataBtn) {
    exportMonitoringDataBtn.addEventListener('click', exportMonitoringData);
}

// 定期更新监控面板数据（如果面板可见）
setInterval(() => {
    if (monitoringPanel && monitoringPanel.style.display !== 'none') {
        updateMonitoringPanel();
    }
}, 2000); // 每2秒更新一次