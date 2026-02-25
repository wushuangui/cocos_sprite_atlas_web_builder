/**
 * 监控和分析模块
 * 提供性能监控、使用统计、数据分析等功能
 */

class MonitoringAnalytics {
    constructor() {
        this.metrics = {
            performance: new Map(),
            userActions: [],
            sessions: [],
            errors: []
        };

        this.currentSession = {
            startTime: null,
            imagesUploaded: 0,
            atlasesGenerated: 0,
            algorithmsUsed: {},
            errorsCount: 0
        };

        this.isEnabled = true;
        this.init();
    }

    /**
     * 初始化监控
     */
    init() {
        this.startSession();
        this.setupErrorTracking();
        this.setupPerformanceMonitoring();
    }

    /**
     * 开始新的会话
     */
    startSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            imagesUploaded: 0,
            atlasesGenerated: 0,
            algorithmsUsed: {},
            errorsCount: 0,
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        };

        this.metrics.sessions.push(this.currentSession);
        console.log('[Monitoring] 新会话已开始:', this.currentSession.id);
    }

    /**
     * 生成会话 ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 跟踪性能指标
     */
    trackPerformance(name, duration, metadata = {}) {
        if (!this.isEnabled) return;

        if (!this.metrics.performance.has(name)) {
            this.metrics.performance.set(name, []);
        }

        const metric = {
            duration,
            timestamp: Date.now(),
            metadata
        };

        this.metrics.performance.get(name).push(metric);

        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`, metadata);
    }

    /**
     * 开始性能测量
     */
    startMeasure(name, metadata = {}) {
        if (!this.isEnabled) return () => {};

        const startTime = performance.now();
        const startMark = `${name}-start-${Date.now()}`;

        performance.mark(startMark);

        return (endMetadata = {}) => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            performance.mark(startMark.replace('-start-', '-end-'));
            performance.measure(name, startMark, startMark.replace('-start-', '-end-'));

            this.trackPerformance(name, duration, { ...metadata, ...endMetadata });

            // 清理性能标记
            performance.clearMarks(startMark);
            performance.clearMarks(startMark.replace('-start-', '-end-'));
            performance.clearMeasures(name);

            return duration;
        };
    }

    /**
     * 跟踪用户行为
     */
    trackAction(action, data = {}) {
        if (!this.isEnabled) return;

        const userAction = {
            action,
            timestamp: Date.now(),
            sessionId: this.currentSession.id,
            data
        };

        this.metrics.userActions.push(userAction);

        // 更新会话统计
        switch (action) {
            case 'upload_images':
                this.currentSession.imagesUploaded += data.count || 0;
                break;
            case 'generate_atlas':
                this.currentSession.atlasesGenerated++;
                if (data.algorithm) {
                    this.currentSession.algorithmsUsed[data.algorithm] =
                        (this.currentSession.algorithmsUsed[data.algorithm] || 0) + 1;
                }
                break;
        }

        console.log('[Action]', action, data);
    }

    /**
     * 跟踪错误
     */
    trackError(error, context = {}) {
        if (!this.isEnabled) return;

        const errorRecord = {
            message: error.message || error,
            stack: error.stack,
            timestamp: Date.now(),
            sessionId: this.currentSession.id,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.metrics.errors.push(errorRecord);
        this.currentSession.errorsCount++;

        console.error('[Error]', error.message, context);
    }

    /**
     * 设置错误跟踪
     */
    setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.trackError(event.error, {
                type: 'runtime',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(new Error(event.reason), {
                type: 'promise',
                promise: event.promise
            });
        });
    }

    /**
     * 设置性能监控
     */
    setupPerformanceMonitoring() {
        // 监控页面加载性能
        if (document.readyState === 'complete') {
            this.reportPageLoadMetrics();
        } else {
            window.addEventListener('load', () => this.reportPageLoadMetrics());
        }

        // 监控内存使用（如果支持）
        if (performance.memory) {
            setInterval(() => {
                const memoryUsage = {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
                this.trackPerformance('memory_usage', memoryUsage.usedJSHeapSize, memoryUsage);
            }, 60000); // 每分钟记录一次
        }
    }

    /**
     * 报告页面加载指标
     */
    reportPageLoadMetrics() {
        if (!performance.timing) return;

        const timing = performance.timing;
        const metrics = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            ttfb: timing.responseStart - timing.requestStart,
            download: timing.responseEnd - timing.responseStart,
            domParse: timing.domComplete - timing.domLoading,
            domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
            loadComplete: timing.loadEventEnd - timing.navigationStart
        };

        for (const [name, value] of Object.entries(metrics)) {
            if (value > 0) {
                this.trackPerformance(`page_${name}`, value);
            }
        }
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats(metricName) {
        if (!this.metrics.performance.has(metricName)) {
            return null;
        }

        const measurements = this.metrics.performance.get(metricName);
        const values = measurements.map(m => m.duration);

        return {
            name: metricName,
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            median: this.calculateMedian(values),
            p95: this.calculatePercentile(values, 95),
            p99: this.calculatePercentile(values, 99)
        };
    }

    /**
     * 获取所有性能统计
     */
    getAllPerformanceStats() {
        const stats = {};
        for (const [name, measurements] of this.metrics.performance) {
            stats[name] = this.getPerformanceStats(name);
        }
        return stats;
    }

    /**
     * 计算中位数
     */
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * 计算百分位数
     */
    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    /**
     * 获取用户行为统计
     */
    getActionStats() {
        const stats = {
            total: this.metrics.userActions.length,
            byType: {},
            timeline: this.metrics.userActions.slice(-100) // 最近100个行为
        };

        for (const action of this.metrics.userActions) {
            if (!stats.byType[action.action]) {
                stats.byType[action.action] = { count: 0, last: null };
            }
            stats.byType[action.action].count++;
            stats.byType[action.action].last = action.timestamp;
        }

        return stats;
    }

    /**
     * 获取会话统计
     */
    getSessionStats() {
        return {
            current: this.currentSession,
            total: this.metrics.sessions.length,
            duration: Date.now() - this.currentSession.startTime,
            summary: {
                totalImages: this.metrics.sessions.reduce((sum, s) => sum + s.imagesUploaded, 0),
                totalAtlases: this.metrics.sessions.reduce((sum, s) => sum + s.atlasesGenerated, 0),
                totalErrors: this.metrics.sessions.reduce((sum, s) => sum + s.errorsCount, 0)
            }
        };
    }

    /**
     * 获取错误统计
     */
    getErrorStats() {
        const stats = {
            total: this.metrics.errors.length,
            byType: {},
            recent: this.metrics.errors.slice(-10)
        };

        for (const error of this.metrics.errors) {
            const type = error.context.type || 'unknown';
            if (!stats.byType[type]) {
                stats.byType[type] = { count: 0, messages: new Set() };
            }
            stats.byType[type].count++;
            stats.byType[type].messages.add(error.message);
        }

        // 转换 Set 为 Array
        for (const type in stats.byType) {
            stats.byType[type].messages = Array.from(stats.byType[type].messages);
        }

        return stats;
    }

    /**
     * 生成性能报告
     */
    generateReport() {
        return {
            timestamp: new Date().toISOString(),
            session: this.getSessionStats(),
            performance: this.getAllPerformanceStats(),
            actions: this.getActionStats(),
            errors: this.getErrorStats(),
            system: {
                userAgent: navigator.userAgent,
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                language: navigator.language,
                platform: navigator.platform,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };
    }

    /**
     * 导出数据
     */
    exportData(format = 'json') {
        const data = this.generateReport();

        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.exportToCSV(data);
            default:
                return JSON.stringify(data, null, 2);
        }
    }

    /**
     * 导出为 CSV
     */
    exportToCSV(data) {
        // 简化的 CSV 导出
        let csv = 'Timestamp,Metric,Value\n';
        for (const [name, measurements] of this.metrics.performance) {
            for (const m of measurements) {
                csv += `${new Date(m.timestamp).toISOString()},${name},${m.duration.toFixed(2)}\n`;
            }
        }
        return csv;
    }

    /**
     * 清除数据
     */
    clearData(type = 'all') {
        switch (type) {
            case 'performance':
                this.metrics.performance.clear();
                break;
            case 'actions':
                this.metrics.userActions = [];
                break;
            case 'errors':
                this.metrics.errors = [];
                break;
            case 'sessions':
                this.metrics.sessions = [];
                this.startSession();
                break;
            case 'all':
                this.metrics.performance.clear();
                this.metrics.userActions = [];
                this.metrics.errors = [];
                this.metrics.sessions = [];
                this.startSession();
                break;
        }
    }

    /**
     * 启用/禁用监控
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`[Monitoring] 监控已${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 获取实时仪表盘数据
     */
    getDashboardData() {
        return {
            sessionDuration: Math.floor((Date.now() - this.currentSession.startTime) / 1000),
            imagesUploaded: this.currentSession.imagesUploaded,
            atlasesGenerated: this.currentSession.atlasesGenerated,
            errorsCount: this.currentSession.errorsCount,
            recentPerformance: this.getRecentPerformanceMetrics(),
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }

    /**
     * 获取最近性能指标
     */
    getRecentPerformanceMetrics() {
        const metrics = {};
        for (const [name, measurements] of this.metrics.performance) {
            if (measurements.length > 0) {
                const recent = measurements.slice(-5);
                metrics[name] = {
                    avg: recent.reduce((sum, m) => sum + m.duration, 0) / recent.length,
                    last: recent[recent.length - 1].duration
                };
            }
        }
        return metrics;
    }

    /**
     * 创建性能图表
     */
    createPerformanceChart(metricName) {
        const measurements = this.metrics.performance.get(metricName);
        if (!measurements || measurements.length === 0) {
            console.log(`[Monitoring] 没有找到指标: ${metricName}`);
            return null;
        }

        // 简化的数据准备，实际应用中可以使用图表库如 Chart.js
        return {
            labels: measurements.map(m => new Date(m.timestamp).toLocaleTimeString()),
            values: measurements.map(m => m.duration),
            min: Math.min(...measurements.map(m => m.duration)),
            max: Math.max(...measurements.map(m => m.duration)),
            avg: measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MonitoringAnalytics };
} else {
    window.MonitoringAnalytics = MonitoringAnalytics;
}
