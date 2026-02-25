/**
 * 性能优化模块 - 内存管理、分批处理、缓存机制
 */

// 内存管理器
class MemoryManager {
    constructor() {
        this.activeCanvases = new Set();
        this.imageCache = new Map();
        this.cleanupInterval = null;
        this.initCleanup();
    }

    // 注册canvas对象以便后续清理
    registerCanvas(canvas) {
        this.activeCanvases.add(canvas);
    }

    // 释放canvas内存
    releaseCanvas(canvas) {
        if (canvas && canvas.width > 1) {
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, 1, 1);
            }
        }
        this.activeCanvases.delete(canvas);
    }

    // 释放所有canvas内存
    releaseAllCanvases() {
        this.activeCanvases.forEach(canvas => {
            this.releaseCanvas(canvas);
        });
        this.activeCanvases.clear();
    }

    // 清理图片缓存
    clearImageCache() {
        this.imageCache.clear();
    }

    // 定期清理机制
    initCleanup() {
        this.cleanupInterval = setInterval(() => {
            if (this.activeCanvases.size > 50) {
                console.warn(`[MemoryManager] 检测到 ${this.activeCanvases.size} 个活跃canvas，执行清理`);
                this.releaseAllCanvases();
            }
        }, 30000); // 每30秒检查一次
    }

    // 销毁管理器
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.releaseAllCanvases();
        this.clearImageCache();
    }
}

// 分批处理器
class BatchProcessor {
    constructor(batchSize = 10, delay = 10) {
        this.batchSize = batchSize;
        this.delay = delay;
        this.processing = false;
        this.progressCallback = null;
    }

    // 设置进度回调
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    // 分批处理数组
    async processBatch(items, processor) {
        if (this.processing) {
            throw new Error('批处理正在进行中');
        }

        this.processing = true;
        const results = [];
        const totalItems = items.length;
        let processedItems = 0;

        try {
            for (let i = 0; i < totalItems; i += this.batchSize) {
                const batch = items.slice(i, i + this.batchSize);
                
                // 处理当前批次
                const batchResults = await Promise.all(
                    batch.map(item => processor(item))
                );
                
                results.push(...batchResults);
                processedItems += batch.length;

                // 更新进度
                if (this.progressCallback) {
                    const progress = (processedItems / totalItems) * 100;
                    this.progressCallback(progress, processedItems, totalItems);
                }

                // 批次间延迟，避免阻塞UI
                if (i + this.batchSize < totalItems) {
                    await this.sleep(this.delay);
                }
            }
        } finally {
            this.processing = false;
        }

        return results;
    }

    // 睡眠函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 取消处理
    cancel() {
        this.processing = false;
    }
}

// 算法缓存管理器
class AlgorithmCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
    }

    // 生成缓存键
    generateKey(images, algorithm, options) {
        // 基于图片尺寸和算法参数生成键
        const imageHashes = images
            .map(img => `${img.width}x${img.height}`)
            .sort()
            .join('|');
        
        const optionsHash = JSON.stringify({
            algorithm,
            padding: options.padding,
            maxWidth: options.maxWidth,
            usePowerOfTwo: options.usePowerOfTwo
        });

        return `${imageHashes}:${optionsHash}`;
    }

    // 获取缓存
    get(images, algorithm, options) {
        const key = this.generateKey(images, algorithm, options);
        const result = this.cache.get(key);
        
        if (result) {
            this.hits++;
            console.log(`[AlgorithmCache] 缓存命中: ${key}`);
            // 移到队列末尾（LRU）
            this.cache.delete(key);
            this.cache.set(key, result);
            return result;
        }
        
        this.misses++;
        return null;
    }

    // 设置缓存
    set(images, algorithm, options, result) {
        const key = this.generateKey(images, algorithm, options);
        
        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, result);
        console.log(`[AlgorithmCache] 缓存存储: ${key}`);
    }

    // 清除缓存
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    // 获取统计信息
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
        
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate}%`,
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
}

// 进度条管理器
class ProgressManager {
    constructor(container) {
        this.container = container;
        this.element = null;
        this.isVisible = false;
        this.createElement();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'progress-container';
        this.element.innerHTML = `
            <div class="progress-info">
                <span class="progress-message">处理中...</span>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar"></div>
            </div>
            <div class="progress-stats">
                <span class="progress-current">0</span> / <span class="progress-total">0</span>
            </div>
        `;
        this.element.style.display = 'none';
        this.container.appendChild(this.element);
    }

    show(message = '处理中...') {
        this.isVisible = true;
        this.element.style.display = 'block';
        this.element.querySelector('.progress-message').textContent = message;
        this.update(0, 0, 0);
    }

    update(progress, current, total) {
        if (!this.isVisible) return;

        const progressBar = this.element.querySelector('.progress-bar');
        const percentage = this.element.querySelector('.progress-percentage');
        const currentEl = this.element.querySelector('.progress-current');
        const totalEl = this.element.querySelector('.progress-total');

        progressBar.style.width = `${progress}%`;
        percentage.textContent = `${Math.round(progress)}%`;
        currentEl.textContent = current;
        totalEl.textContent = total;
    }

    hide() {
        this.isVisible = false;
        this.element.style.display = 'none';
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// 性能监控器
class PerformanceMonitor {
    static metrics = new Map();
    
    static startMeasure(name) {
        performance.mark(`${name}-start`);
    }
    
    static endMeasure(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measures = performance.getEntriesByName(name);
        const duration = measures[measures.length - 1].duration;
        
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name).push(duration);
        
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        
        // 清理性能条目
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
        
        return duration;
    }
    
    static getStats(name) {
        const durations = this.metrics.get(name) || [];
        if (durations.length === 0) return null;
        
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        return {
            name,
            count: durations.length,
            average: avg.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2)
        };
    }
    
    static getAllStats() {
        const stats = {};
        for (const [name, durations] of this.metrics) {
            stats[name] = this.getStats(name);
        }
        return stats;
    }
    
    static clear() {
        this.metrics.clear();
    }
}

// 导出优化器实例
const memoryManager = new MemoryManager();
const batchProcessor = new BatchProcessor(5, 20); // 每批5个，间隔20ms
const algorithmCache = new AlgorithmCache(50); // 最多缓存50个结果

// 全局性能优化器
class PerformanceOptimizer {
    static memoryManager = memoryManager;
    static batchProcessor = batchProcessor;
    static algorithmCache = algorithmCache;
    static progressManager = null;
    
    static initProgressManager(container) {
        this.progressManager = new ProgressManager(container);
    }
    
    static destroy() {
        memoryManager.destroy();
        if (this.progressManager) {
            this.progressManager.destroy();
        }
        PerformanceMonitor.clear();
    }
}

// 导出使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MemoryManager,
        BatchProcessor,
        AlgorithmCache,
        ProgressManager,
        PerformanceMonitor,
        PerformanceOptimizer
    };
} else {
    window.PerformanceOptimizer = PerformanceOptimizer;
}