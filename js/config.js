/**
 * 集中化配置管理模块
 * 统一管理应用程序的配置项
 */

const AppConfig = {
    // 算法配置
    algorithm: {
        default: 'maxRectangles',
        options: ['maxRectangles', 'shelf'],
        cacheEnabled: true,
        maxCacheSize: 50
    },

    // 图集配置
    atlas: {
        defaultPadding: 2,
        defaultMaxWidth: 2048,
        defaultPowerOfTwo: true,
        maxHeight: 4096,
        minSize: 256,
        maxSize: 2048
    },

    // 性能配置
    performance: {
        batchSize: 5,
        batchDelay: 20,
        maxConcurrentLoads: 10,
        memoryWarningThreshold: 50,
        cleanupInterval: 30000
    },

    // UI 配置
    ui: {
        autoShowTestPanel: true,
        showProgress: true,
        animateTransitions: true,
        theme: 'default'
    },

    // 监控配置
    monitoring: {
        enabled: true,
        logPerformance: true,
        trackUserActions: true,
        autoSaveStats: false
    },

    // 导出配置
    export: {
        defaultFormat: 'zip',
        formats: ['zip', 'separate'],
        compressionLevel: 6
    },

    // 验证规则
    validation: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['image/png', 'image/jpeg', 'image/jpg'],
        maxImageSize: 2048,
        minImageSize: 16
    }
};

// 获取配置
function getConfig(path) {
    const keys = path.split('.');
    let value = AppConfig;
    for (const key of keys) {
        value = value[key];
        if (value === undefined) return null;
    }
    return value;
}

// 设置配置
function setConfig(path, value) {
    const keys = path.split('.');
    let obj = AppConfig;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in obj)) {
            obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
}

// 批量设置配置
function setConfigs(configs) {
    for (const [path, value] of Object.entries(configs)) {
        setConfig(path, value);
    }
}

// 重置配置为默认值
function resetConfig(path) {
    const defaults = JSON.parse(JSON.stringify(AppConfig));
    if (!path) {
        return defaults;
    }
    return getConfig(path);
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppConfig, getConfig, setConfig, setConfigs, resetConfig };
} else {
    window.AppConfig = AppConfig;
    window.getConfig = getConfig;
    window.setConfig = setConfig;
    window.setConfigs = setConfigs;
}
