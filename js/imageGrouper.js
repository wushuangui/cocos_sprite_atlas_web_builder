
/**
 * 智能图片预分组模块
 * 根据图片尺寸特征进行分组，提高图集打包效率
 */

/**
 * 图片分组配置
 */
const GROUPING_CONFIG = {
    // 尺寸分组阈值
    SIZE_THRESHOLDS: [
        { maxArea: 25600, name: 'small' },      // 小图: < 160×160
        { maxArea: 102400, name: 'medium' },   // 中图: < 320×320
        { maxArea: 409600, name: 'large' },    // 大图: < 640×640
        { maxArea: Infinity, name: 'xlarge' }   // 超大图: ≥ 640×640
    ],

    // 长宽比分组
    ASPECT_RATIO_THRESHOLDS: [
        { maxRatio: 0.5, name: 'tall' },       // 高瘦型
        { maxRatio: 1.5, name: 'normal' },     // 正常型
        { maxRatio: Infinity, name: 'wide' }   // 宽扁型
    ],

    // 每组最大图片数量
    MAX_IMAGES_PER_GROUP: 50,

    // 每组最大总面积
    MAX_AREA_PER_GROUP: 2048 * 1024
};

/**
 * 图片分组器类
 */
class ImageGrouper {
    constructor(config = GROUPING_CONFIG) {
        this.config = config;
    }

    /**
     * 对图片进行分组
     * @param {Array} images - 图片数组
     * @returns {Array} - 分组后的图片数组
     */
    groupImages(images) {
        if (images.length === 0) {
            return [];
        }

        // 第一步：按尺寸分组
        const sizeGroups = this.groupBySize(images);

        // 第二步：在尺寸组内按长宽比细分
        const refinedGroups = this.refineGroupsByAspectRatio(sizeGroups);

        // 第三步：合并小分组，确保每组有足够的图片
        const mergedGroups = this.mergeSmallGroups(refinedGroups);

        // 第四步：限制每组大小
        const finalGroups = this.limitGroupSize(mergedGroups);

        return finalGroups;
    }

    /**
     * 按尺寸分组
     */
    groupBySize(images) {
        const groups = {};

        for (const img of images) {
            const area = img.width * img.height;
            const sizeCategory = this.getSizeCategory(area);

            if (!groups[sizeCategory]) {
                groups[sizeCategory] = [];
            }
            groups[sizeCategory].push(img);
        }

        return Object.entries(groups).map(([name, items]) => ({
            name,
            items,
            strategy: this.getStrategyForSize(name)
        }));
    }

    /**
     * 获取尺寸类别
     */
    getSizeCategory(area) {
        for (const threshold of this.config.SIZE_THRESHOLDS) {
            if (area < threshold.maxArea) {
                return threshold.name;
            }
        }
        return 'xlarge';
    }

    /**
     * 获取长宽比类别
     */
    getAspectRatioCategory(width, height) {
        const ratio = Math.min(width, height) / Math.max(width, height);
        for (const threshold of this.config.ASPECT_RATIO_THRESHOLDS) {
            if (ratio < threshold.maxRatio) {
                return threshold.name;
            }
        }
        return 'wide';
    }

    /**
     * 按长宽比细分组
     */
    refineGroupsByAspectRatio(sizeGroups) {
        const refinedGroups = [];

        for (const group of sizeGroups) {
            const aspectGroups = {};

            for (const img of group.items) {
                const aspectCategory = this.getAspectRatioCategory(img.width, img.height);
                const groupName = `${group.name}_${aspectCategory}`;

                if (!aspectGroups[groupName]) {
                    aspectGroups[groupName] = [];
                }
                aspectGroups[groupName].push(img);
            }

            // 将细分后的组添加到结果中
            for (const [name, items] of Object.entries(aspectGroups)) {
                refinedGroups.push({
                    name,
                    items,
                    strategy: group.strategy
                });
            }
        }

        return refinedGroups;
    }

    /**
     * 合并小分组
     */
    mergeSmallGroups(groups) {
        const mergedGroups = [];
        const smallGroups = [];

        // 分离大组和小组
        for (const group of groups) {
            if (group.items.length < 5) {
                smallGroups.push(group);
            } else {
                mergedGroups.push(group);
            }
        }

        // 合并小组
        while (smallGroups.length > 1) {
            const group1 = smallGroups.shift();
            const group2 = smallGroups.shift();

            mergedGroups.push({
                name: `${group1.name}+${group2.name}`,
                items: [...group1.items, ...group2.items],
                strategy: this.mergeStrategies(group1.strategy, group2.strategy)
            });
        }

        // 如果还剩一个小组，添加到大组中
        if (smallGroups.length > 0) {
            if (mergedGroups.length > 0) {
                mergedGroups[0].items.push(...smallGroups[0].items);
            } else {
                mergedGroups.push(smallGroups[0]);
            }
        }

        return mergedGroups;
    }

    /**
     * 限制每组大小
     */
    limitGroupSize(groups) {
        const limitedGroups = [];

        for (const group of groups) {
            let remainingItems = [...group.items];

            while (remainingItems.length > 0) {
                const batchItems = remainingItems.splice(0, this.config.MAX_IMAGES_PER_GROUP);
                const currentArea = batchItems.reduce((sum, img) => sum + img.width * img.height, 0);

                if (currentArea > this.config.MAX_AREA_PER_GROUP) {
                    // 如果总面积过大，进一步拆分
                    const subGroups = this.splitByArea(batchItems, this.config.MAX_AREA_PER_GROUP);
                    limitedGroups.push(...subGroups);
                } else {
                    limitedGroups.push({
                        name: group.name,
                        items: batchItems,
                        strategy: group.strategy
                    });
                }
            }
        }

        return limitedGroups;
    }

    /**
     * 按面积拆分
     */
    splitByArea(items, maxArea) {
        const groups = [];
        let currentGroup = [];
        let currentArea = 0;

        for (const item of items) {
            const itemArea = item.width * item.height;

            if (currentArea + itemArea > maxArea && currentGroup.length > 0) {
                groups.push({
                    name: 'split_group',
                    items: currentGroup,
                    strategy: 'area'
                });
                currentGroup = [item];
                currentArea = itemArea;
            } else {
                currentGroup.push(item);
                currentArea += itemArea;
            }
        }

        if (currentGroup.length > 0) {
            groups.push({
                name: 'split_group',
                items: currentGroup,
                strategy: 'area'
            });
        }

        return groups;
    }

    /**
     * 获取尺寸对应的打包策略
     */
    getStrategyForSize(sizeName) {
        const strategies = {
            'small': 'maxEdge',
            'medium': 'perimeter',
            'large': 'area',
            'xlarge': 'maxEdge'
        };
        return strategies[sizeName] || 'area';
    }

    /**
     * 合并打包策略
     */
    mergeStrategies(strategy1, strategy2) {
        if (strategy1 === strategy2) {
            return strategy1;
        }
        return 'area'; // 默认使用面积策略
    }

    /**
     * 获取分组的统计信息
     */
    getGroupStatistics(groups) {
        return groups.map(group => ({
            name: group.name,
            count: group.items.length,
            totalArea: group.items.reduce((sum, img) => sum + img.width * img.height, 0),
            avgArea: group.items.reduce((sum, img) => sum + img.width * img.height, 0) / group.items.length,
            strategy: group.strategy
        }));
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ImageGrouper, GROUPING_CONFIG };
}
