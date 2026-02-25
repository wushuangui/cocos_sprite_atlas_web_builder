/**
 * 智能算法选择器
 * 基于图片特征自动选择最优的打包策略
 */

class SmartAlgorithmSelector {
    constructor() {
        this.statistics = {
            maxRectangles: { usage: 0, successRate: 0, efficiencies: [], avgEfficiency: 0 },
            shelf: { usage: 0, successRate: 0, efficiencies: [], avgEfficiency: 0 }
        };

        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * 分析图片特征
     * @param {Array} images - 图片数组
     * @returns {Object} 图片特征分析结果
     */
    analyzeImageFeatures(images) {
        if (images.length === 0) return null;

        const features = {
            count: images.length,
            totalArea: 0,
            areas: [],
            widths: [],
            heights: [],
            aspectRatios: [],
            maxSize: { width: 0, height: 0 },
            minSize: { width: Infinity, height: Infinity },
            avgSize: { width: 0, height: 0 },
            variance: { width: 0, height: 0 },
            complexity: 'simple' // simple, moderate, complex
        };

        // 收集基础数据
        images.forEach(img => {
            const area = img.width * img.height;
            features.totalArea += area;
            features.areas.push(area);
            features.widths.push(img.width);
            features.heights.push(img.height);
            features.aspectRatios.push(img.width / img.height);

            features.maxSize.width = Math.max(features.maxSize.width, img.width);
            features.maxSize.height = Math.max(features.maxSize.height, img.height);
            features.minSize.width = Math.min(features.minSize.width, img.width);
            features.minSize.height = Math.min(features.minSize.height, img.height);
        });

        // 计算平均值
        const avgWidth = features.widths.reduce((a, b) => a + b, 0) / images.length;
        const avgHeight = features.heights.reduce((a, b) => a + b, 0) / images.length;
        features.avgSize = { width: avgWidth, height: avgHeight };

        // 计算方差
        const varianceWidth = features.widths.reduce((sum, w) => sum + Math.pow(w - avgWidth, 2), 0) / images.length;
        const varianceHeight = features.heights.reduce((sum, h) => sum + Math.pow(h - avgHeight, 2), 0) / images.length;
        features.variance = { width: varianceWidth, height: varianceHeight };

        // 评估复杂度
        const totalVariance = varianceWidth + varianceHeight;
        const avgSize = avgWidth + avgHeight;

        if (totalVariance < avgSize * 0.1) {
            features.complexity = 'simple';
        } else if (totalVariance < avgSize * 0.3) {
            features.complexity = 'moderate';
        } else {
            features.complexity = 'complex';
        }

        // 计算面积利用率潜力
        const totalAtlasArea = 2048 * 2048; // 假设最大图集尺寸
        features.utilizationPotential = features.totalArea / totalAtlasArea;

        // 检测图片分布特征
        features.distribution = this.analyzeImageDistribution(features);

        // 检测形状特征（横图、竖图、正方形）
        features.shapeDistribution = this.analyzeShapeDistribution(features);

        return features;
    }

    /**
     * 分析图片分布特征
     */
    analyzeImageDistribution(features) {
        const avgArea = features.totalArea / features.count;
        const largeImages = features.areas.filter(a => a > avgArea * 2).length;
        const smallImages = features.areas.filter(a => a < avgArea * 0.5).length;

        return {
            large: largeImages,
            small: smallImages,
            average: features.count - largeImages - smallImages,
            imbalance: Math.abs(largeImages - smallImages) / features.count
        };
    }

    /**
     * 分析形状分布
     */
    analyzeShapeDistribution(features) {
        let landscape = 0; // 横图
        let portrait = 0;  // 竖图
        let square = 0;    // 正方形

        features.aspectRatios.forEach(ratio => {
            if (ratio > 1.2) {
                landscape++;
            } else if (ratio < 0.8) {
                portrait++;
            } else {
                square++;
            }
        });

        return {
            landscape,
            portrait,
            square,
            dominant: Math.max(landscape, portrait, square)
        };
    }

    /**
     * 选择最优算法
     * @param {Array} images - 图片数组
     * @returns {Object} { algorithm, reason, confidence }
     */
    selectBestAlgorithm(images) {
        const features = this.analyzeImageFeatures(images);

        if (!features) {
            return {
                algorithm: 'maxRectangles',
                reason: 'No images provided, using default',
                confidence: 0.5
            };
        }

        let scores = {
            maxRectangles: 0,
            shelf: 0
        };

        let reasons = {
            maxRectangles: [],
            shelf: []
        };

        // 评分规则 1: 图片数量
        if (features.count < 10) {
            scores.shelf += 3; // 小量图片，Shelf 足够
            scores.maxRectangles += 1;
            reasons.shelf.push(`图片数量较少 (${features.count})`);
        } else if (features.count < 30) {
            scores.maxRectangles += 3; // 中等数量，MaxRectangles 优势
            scores.shelf += 1;
            reasons.maxRectangles.push(`中等数量图片 (${features.count})`);
        } else {
            scores.maxRectangles += 4; // 大量图片，MaxRectangles 明显优势
            scores.shelf += 0;
            reasons.maxRectangles.push(`大量图片 (${features.count})`);
        }

        // 评分规则 2: 复杂度
        if (features.complexity === 'simple') {
            scores.shelf += 3; // 规整图片，Shelf 高效
            scores.maxRectangles += 1;
            reasons.shelf.push('图片尺寸规整');
        } else if (features.complexity === 'moderate') {
            scores.maxRectangles += 1;
            scores.shelf += 1;
        } else {
            scores.maxRectangles += 3; // 复杂图片，MaxRectangles 优势明显
            scores.shelf += 0;
            reasons.maxRectangles.push('图片尺寸差异较大');
        }

        // 评分规则 3: 尺寸方差
        const avgVariance = (features.variance.width + features.variance.height) / 2;
        const avgSize = features.avgSize.width + features.avgSize.height;
        const varianceRatio = avgVariance / avgSize;

        if (varianceRatio < 0.1) {
            scores.shelf += 3; // 低方差，Shelf 高效
            scores.maxRectangles += 1;
            reasons.shelf.push('尺寸方差低');
        } else if (varianceRatio < 0.3) {
            scores.maxRectangles += 1;
            scores.shelf += 1;
        } else {
            scores.maxRectangles += 3; // 高方差，MaxRectangles 优势
            scores.shelf += 0;
            reasons.maxRectangles.push('尺寸方差较高');
        }

        // 评分规则 4: 形状分布
        if (features.shapeDistribution) {
            const { landscape, portrait, square, dominant } = features.shapeDistribution;
            const total = landscape + portrait + square;

            if (square === dominant) {
                scores.maxRectangles += 2;
                reasons.maxRectangles.push('多为正方形图片');
            } else if (landscape === dominant) {
                scores.maxRectangles += 1;
                scores.shelf += 1;
            } else {
                scores.maxRectangles += 1;
                scores.shelf += 1;
            }
        }

        // 评分规则 5: 图片分布均衡性
        if (features.distribution) {
            const imbalance = features.distribution.imbalance;
            if (imbalance > 0.6) {
                scores.maxRectangles += 2; // 大小不均衡，MaxRectangles 优势
                reasons.maxRectangles.push('图片大小分布不均');
            } else {
                scores.maxRectangles += 1;
                scores.shelf += 1;
            }
        }

        // 评分规则 6: 历史成功率
        if (this.statistics.maxRectangles.successRate > this.statistics.shelf.successRate) {
            scores.maxRectangles += 2;
            reasons.maxRectangles.push('历史成功率更高');
        } else if (this.statistics.shelf.successRate > this.statistics.maxRectangles.successRate) {
            scores.shelf += 2;
            reasons.shelf.push('历史成功率更高');
        }

        // 评分规则 7: 面积利用率优化
        const maxArea = features.areas.reduce((max, area) => Math.max(max, area), 0);
        const minArea = features.areas.reduce((min, area) => Math.min(min, area), Infinity);
        const areaRatio = maxArea / minArea;

        if (areaRatio > 20) {
            scores.maxRectangles += 3; // 面积差异极大，MaxRectangles 优势
            reasons.maxRectangles.push('面积差异显著');
        } else if (areaRatio > 10) {
            scores.maxRectangles += 2;
            reasons.maxRectangles.push('面积差异较大');
        } else if (areaRatio < 2) {
            scores.shelf += 2; // 面积接近，Shelf 高效
            reasons.shelf.push('面积分布均匀');
        } else {
            scores.shelf += 1;
            scores.maxRectangles += 1;
        }

        // 评分规则 8: 空间利用率潜力
        if (features.utilizationPotential > 0.7) {
            scores.maxRectangles += 1;
            scores.shelf += 1;
        } else if (features.utilizationPotential < 0.3) {
            scores.maxRectangles += 1; // 低利用率，需要更高效的算法
        }

        // 评分规则 9: 历史趋势（如果有足够历史数据）
        const trend = this.getPerformanceTrend();
        if (trend && trend.recommendation !== 'auto') {
            if (trend.recommendation === 'maxRectangles') {
                scores.maxRectangles += 2;
                reasons.maxRectangles.push(trend.reason);
            } else {
                scores.shelf += 2;
                reasons.shelf.push(trend.reason);
            }
        }

        // 评分规则 10: 平均效率考虑
        const maxRectanglesAvgEff = this.statistics.maxRectangles.avgEfficiency;
        const shelfAvgEff = this.statistics.shelf.avgEfficiency;

        if (maxRectanglesAvgEff > 0 && shelfAvgEff > 0) {
            if (maxRectanglesAvgEff > shelfAvgEff + 3) {
                scores.maxRectangles += 2;
                reasons.maxRectangles.push('历史平均效率更高');
            } else if (shelfAvgEff > maxRectanglesAvgEff + 3) {
                scores.shelf += 2;
                reasons.shelf.push('历史平均效率更高');
            }
        }

        // 选择得分最高的算法
        const bestAlgorithm = scores.maxRectangles >= scores.shelf ? 'maxRectangles' : 'shelf';
        const maxScore = Math.max(scores.maxRectangles, scores.shelf);
        const confidence = Math.min(maxScore / 15, 1); // 归一化到 0-1

        // 生成原因说明
        const selectedReasons = bestAlgorithm === 'maxRectangles'
            ? reasons.maxRectangles.slice(0, 3)
            : reasons.shelf.slice(0, 3);

        return {
            algorithm: bestAlgorithm,
            reason: selectedReasons.join(', ') || '综合评估结果',
            confidence: confidence,
            scores,
            features,
            detailedReasons: selectedReasons
        };
    }

    /**
     * 记录算法使用结果
     * @param {string} algorithm - 算法名称
     * @param {boolean} success - 是否成功
     * @param {number} efficiency - 空间利用率
     */
    recordResult(algorithm, success, efficiency) {
        if (algorithm in this.statistics) {
            this.statistics[algorithm].usage++;

            // 记录效率值
            if (success && efficiency > 0) {
                this.statistics[algorithm].efficiencies.push(efficiency);

                // 只保留最近50次记录
                if (this.statistics[algorithm].efficiencies.length > 50) {
                    this.statistics[algorithm].efficiencies.shift();
                }

                // 计算平均效率
                this.statistics[algorithm].avgEfficiency =
                    this.statistics[algorithm].efficiencies.reduce((a, b) => a + b, 0) /
                    this.statistics[algorithm].efficiencies.length;
            }

            // 更新成功率
            const totalUsage = this.statistics[algorithm].usage;
            const currentSuccessRate = this.statistics[algorithm].successRate;
            if (success) {
                this.statistics[algorithm].successRate =
                    (currentSuccessRate * (totalUsage - 1) + 1) / totalUsage;
            } else {
                this.statistics[algorithm].successRate =
                    (currentSuccessRate * (totalUsage - 1)) / totalUsage;
            }

            // 记录历史
            this.recordHistory(algorithm, success, efficiency);
        }
    }

    /**
     * 记录使用历史
     */
    recordHistory(algorithm, success, efficiency) {
        const record = {
            algorithm,
            success,
            efficiency,
            timestamp: Date.now()
        };

        this.history.push(record);

        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * 获取历史性能趋势
     */
    getPerformanceTrend() {
        if (this.history.length < 5) return null;

        const recent = this.history.slice(-20);
        const maxRectangles = recent.filter(r => r.algorithm === 'maxRectangles');
        const shelf = recent.filter(r => r.algorithm === 'shelf');

        const trends = {
            maxRectangles: {
                recent: maxRectangles.length,
                successRate: maxRectangles.length > 0
                    ? maxRectangles.filter(r => r.success).length / maxRectangles.length
                    : 0,
                avgEfficiency: maxRectangles.length > 0
                    ? maxRectangles.filter(r => r.efficiency > 0).reduce((a, b) => a + b.efficiency, 0) /
                      maxRectangles.filter(r => r.efficiency > 0).length
                    : 0
            },
            shelf: {
                recent: shelf.length,
                successRate: shelf.length > 0
                    ? shelf.filter(r => r.success).length / shelf.length
                    : 0,
                avgEfficiency: shelf.length > 0
                    ? shelf.filter(r => r.efficiency > 0).reduce((a, b) => a + b.efficiency, 0) /
                      shelf.filter(r => r.efficiency > 0).length
                    : 0
            }
        };

        // 判断趋势
        if (trends.maxRectangles.avgEfficiency > trends.shelf.avgEfficiency + 5) {
            trends.recommendation = 'maxRectangles';
            trends.reason = '近期MaxRectangles效率更高';
        } else if (trends.shelf.avgEfficiency > trends.maxRectangles.avgEfficiency + 5) {
            trends.recommendation = 'shelf';
            trends.reason = '近期Shelf效率更高';
        } else if (trends.maxRectangles.successRate > trends.shelf.successRate + 0.1) {
            trends.recommendation = 'maxRectangles';
            trends.reason = '近期MaxRectangles成功率更高';
        } else if (trends.shelf.successRate > trends.maxRectangles.successRate + 0.1) {
            trends.recommendation = 'shelf';
            trends.reason = '近期Shelf成功率更高';
        } else {
            trends.recommendation = 'auto';
            trends.reason = '基于当前特征选择';
        }

        return trends;
    }

    /**
     * 获取推荐配置
     * @param {Array} images - 图片数组
     * @returns {Object} 推荐配置
     */
    getRecommendedConfig(images) {
        const selection = this.selectBestAlgorithm(images);
        const features = selection.features || this.analyzeImageFeatures(images);

        const config = {
            algorithm: selection.algorithm,
            padding: 2,
            maxWidth: 2048,
            usePowerOfTwo: true
        };

        // 根据图片特征调整配置
        if (features) {
            // 根据图片数量调整间距
            if (features.count > 50) {
                config.padding = 1; // 大量图片，减小间距
            } else if (features.count < 10) {
                config.padding = 4; // 少量图片，增加间距
            }

            // 根据最大尺寸调整最大宽度
            if (features.maxSize.width > 1024 || features.maxSize.height > 1024) {
                config.maxWidth = 2048;
            } else if (features.totalArea < 512 * 512) {
                config.maxWidth = 1024; // 小图集，减小宽度
            }

            // 根据复杂度决定是否使用 2 的幂次方
            if (features.complexity === 'complex') {
                config.usePowerOfTwo = false; // 复杂图集使用原始尺寸以提高利用率
            }
        }

        return {
            ...config,
            selection
        };
    }

    /**
     * 对比算法性能
     * @param {Array} images - 图片数组
     * @returns {Object} 算法对比信息
     */
    compareAlgorithms(images) {
        const features = this.analyzeImageFeatures(images);
        const selection = this.selectBestAlgorithm(images);

        const comparison = {
            features: features,
            recommendation: selection,
            algorithms: {
                maxRectangles: {
                    name: 'MaxRectangles',
                    score: selection.scores.maxRectangles,
                    advantages: this.getAlgorithmAdvantages('maxRectangles', features),
                    bestFor: this.getBestUseCases('maxRectangles')
                },
                shelf: {
                    name: 'Shelf',
                    score: selection.scores.shelf,
                    advantages: this.getAlgorithmAdvantages('shelf', features),
                    bestFor: this.getBestUseCases('shelf')
                }
            },
            winner: selection.algorithm,
            confidence: selection.confidence
        };

        return comparison;
    }

    /**
     * 获取算法优势
     */
    getAlgorithmAdvantages(algorithm, features) {
        const advantages = [];

        if (algorithm === 'maxRectangles') {
            advantages.push('更高的空间利用率');
            advantages.push('适合复杂尺寸图片');
            advantages.push('处理不规则形状效果好');
            if (features.count > 20) advantages.push('适合大量图片');
            if (features.complexity === 'complex') advantages.push('复杂场景表现优异');
        } else {
            advantages.push('处理速度快');
            advantages.push('适合规整尺寸图片');
            advantages.push('内存占用低');
            if (features.count < 15) advantages.push('适合少量图片');
            if (features.complexity === 'simple') advantages.push('简单场景效率高');
        }

        return advantages;
    }

    /**
     * 获取最佳使用场景
     */
    getBestUseCases(algorithm) {
        if (algorithm === 'maxRectangles') {
            return [
                '大量图片（>20张）',
                '尺寸差异大的图片集',
                '不规则形状图片',
                '追求最高空间利用率'
            ];
        } else {
            return [
                '少量图片（<15张）',
                '尺寸规整的图片',
                '快速生成需求',
                '低内存环境'
            ];
        }
    }

    /**
     * 生成算法对比报告
     */
    generateComparisonReport(images) {
        const comparison = this.compareAlgorithms(images);

        const report = {
            timestamp: new Date().toISOString(),
            imageAnalysis: {
                count: comparison.features.count,
                totalArea: comparison.features.totalArea,
                avgSize: comparison.features.avgSize,
                complexity: comparison.features.complexity,
                variance: comparison.features.variance
            },
            recommendation: {
                algorithm: comparison.recommendation.algorithm,
                reason: comparison.recommendation.reason,
                confidence: (comparison.recommendation.confidence * 100).toFixed(1) + '%',
                score: comparison.recommendation.scores[comparison.recommendation.algorithm]
            },
            algorithms: {
                maxRectangles: {
                    score: comparison.algorithms.maxRectangles.score,
                    advantages: comparison.algorithms.maxRectangles.advantages,
                    bestFor: comparison.algorithms.maxRectangles.bestFor
                },
                shelf: {
                    score: comparison.algorithms.shelf.score,
                    advantages: comparison.algorithms.shelf.advantages,
                    bestFor: comparison.algorithms.shelf.bestFor
                }
            }
        };

        return report;
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        return {
            ...this.statistics,
            summary: {
                totalUsage: Object.values(this.statistics).reduce((sum, s) => sum + s.usage, 0),
                bestAlgorithm: Object.entries(this.statistics)
                    .sort((a, b) => b[1].successRate - a[1].successRate)[0]?.[0]
            }
        };
    }

    /**
     * 重置统计
     */
    resetStatistics() {
        this.statistics = {
            maxRectangles: { usage: 0, successRate: 0 },
            shelf: { usage: 0, successRate: 0 }
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmartAlgorithmSelector };
} else {
    window.SmartAlgorithmSelector = SmartAlgorithmSelector;
}
