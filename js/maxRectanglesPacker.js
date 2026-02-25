
/**
 * MaxRectangles算法实现 - 业界最优的矩形打包算法
 * 该算法通过维护一组空闲矩形，每次选择最佳位置放置图片
 */

/**
 * 主打包函数 - MaxRectangles算法
 * @param {Array} images - 图片数组
 * @param {number} padding - 图片间距
 * @param {number} maxWidth - 最大宽度
 * @param {boolean} usePowerOfTwo - 是否使用2的幂次方尺寸
 * @returns {Object|null} - 最优打包结果
 */
function packImagesWithMaxRectangles(images, padding, maxWidth, usePowerOfTwo = true) {
    const effectiveMaxWidth = Math.min(maxWidth, 2048);

    // 排序策略
    const sortStrategies = [
        { name: '面积降序', fn: (a, b) => (b.width * b.height) - (a.width * a.height) },
        { name: '最大边降序', fn: (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) },
        { name: '周长降序', fn: (a, b) => (b.width + b.height) - (a.width + a.height) }
    ];

    // 宽度选项
    const widthOptions = [];
    if (usePowerOfTwo) {
        for (let pow = 11; pow >= 6; pow--) {
            const w = Math.pow(2, pow);
            if (w <= effectiveMaxWidth) {
                widthOptions.push(w);
            }
        }
    } else {
        const totalArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
        const estimatedWidth = Math.ceil(Math.sqrt(totalArea * 1.3));
        const alignedWidth = Math.ceil(estimatedWidth / 16) * 16;
        if (alignedWidth <= effectiveMaxWidth && alignedWidth >= 256) {
            widthOptions.push(alignedWidth);
            const adjacentWidths = [alignedWidth - 48, alignedWidth - 16, alignedWidth + 16, alignedWidth + 48];
            for (const adjWidth of adjacentWidths) {
                if (adjWidth >= 256 && adjWidth <= effectiveMaxWidth && !widthOptions.includes(adjWidth)) {
                    widthOptions.push(adjWidth);
                }
            }
        }
        if (widthOptions.length === 0) {
            widthOptions.push(effectiveMaxWidth);
        }
    }

    // 排序宽度选项
    widthOptions.sort((a, b) => b - a);

    let bestResult = null;
    let bestArea = Infinity;
    let bestEfficiency = 0;

    for (const width of widthOptions) {
        for (const strategy of sortStrategies) {
            const sortedImages = [...images].sort(strategy.fn);
            const result = maxRectanglesPack(sortedImages, padding, width);

            if (!result) continue;

            let finalWidth, finalHeight, finalCanvas;

            if (usePowerOfTwo) {
                finalWidth = nextPowerOf2(result.width);
                finalHeight = nextPowerOf2(result.height);

                if (finalWidth > 2048 || finalHeight > 2048) continue;

                if (finalWidth !== result.width || finalHeight !== result.height) {
                    finalCanvas = document.createElement('canvas');
                    finalCanvas.width = finalWidth;
                    finalCanvas.height = finalHeight;
                    const ctx = finalCanvas.getContext('2d');
                    ctx.drawImage(result.canvas, 0, 0);
                } else {
                    finalCanvas = result.canvas;
                }
            } else {
                finalWidth = result.width;
                finalHeight = result.height;
                finalCanvas = result.canvas;
            }

            const area = finalWidth * finalHeight;
            const imgUsedArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
            const efficiency = imgUsedArea / area * 100;

            const sizeLabel = `${finalWidth}×${finalHeight}`;
            console.log(`[MaxRectangles-${strategy.name}] 宽度${width}: 图集 ${sizeLabel}, 利用率 ${efficiency.toFixed(2)}%`);

            if (efficiency > bestEfficiency || (efficiency === bestEfficiency && area < bestArea)) {
                bestArea = area;
                bestEfficiency = efficiency;
                bestResult = {
                    canvas: finalCanvas,
                    frames: result.frames,
                    width: finalWidth,
                    height: finalHeight
                };
            }
        }
    }

    if (bestResult) {
        const finalUsedArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
        const finalEfficiency = (finalUsedArea / (bestResult.width * bestResult.height) * 100).toFixed(2);
        const sizeType = usePowerOfTwo ? "2的幂次方" : "原始";
        console.log(`[MaxRectangles] 最优图集: ${bestResult.width}×${bestResult.height} (${sizeType}), 利用率 ${finalEfficiency}%`);
    }

    return bestResult;
}

/**
 * MaxRectangles核心算法
 */
function maxRectanglesPack(images, padding, maxWidth) {
    const usedRectangles = [];
    const freeRectangles = [{ x: 0, y: 0, width: maxWidth, height: 4096 }];
    const frames = [];

    for (const item of images) {
        let bestNode = findPositionForNewNodeBestShortSideFit(freeRectangles, item.width + padding, item.height + padding);

        if (bestNode.height === 0) {
            // 尝试旋转
            bestNode = findPositionForNewNodeBestShortSideFit(freeRectangles, item.height + padding, item.width + padding);
            if (bestNode.height === 0) {
                return null; // 放不下
            }

            // 旋转放置
            const frame = {
                name: item.name,
                x: bestNode.x,
                y: bestNode.y,
                width: item.height,
                height: item.width,
                originalWidth: item.width,
                originalHeight: item.height,
                offsetX: 0,
                offsetY: 0,
                rotated: true,
                img: item.img
            };

            usedRectangles.push({
                x: bestNode.x,
                y: bestNode.y,
                width: item.height + padding,
                height: item.width + padding
            });

            splitFreeRectangles(freeRectangles, usedRectangles[usedRectangles.length - 1]);
            frames.push(frame);
        } else {
            // 正常放置
            const frame = {
                name: item.name,
                x: bestNode.x,
                y: bestNode.y,
                width: item.width,
                height: item.height,
                originalWidth: item.width,
                originalHeight: item.height,
                offsetX: 0,
                offsetY: 0,
                rotated: false,
                img: item.img
            };

            usedRectangles.push({
                x: bestNode.x,
                y: bestNode.y,
                width: item.width + padding,
                height: item.height + padding
            });

            splitFreeRectangles(freeRectangles, usedRectangles[usedRectangles.length - 1]);
            frames.push(frame);
        }
    }

    // 计算实际使用的边界
    let maxRight = padding;
    let maxBottom = padding;
    for (const frame of frames) {
        maxRight = Math.max(maxRight, frame.x + frame.width + padding);
        maxBottom = Math.max(maxBottom, frame.y + frame.height + padding);
    }

    const usedWidth = maxRight;
    const usedHeight = maxBottom;

    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = usedWidth;
    canvas.height = usedHeight;
    const ctx = canvas.getContext('2d');

    // 绘制所有帧
    for (const frame of frames) {
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
        // 不删除 frame.img，保留用于缓存和测试面板
        // delete frame.img;
    }

    return { canvas, frames, width: usedWidth, height: usedHeight };
}

/**
 * 使用Best Short Side Fit启发式算法寻找最佳位置
 */
function findPositionForNewNodeBestShortSideFit(freeRectangles, width, height) {
    let bestNode = { x: 0, y: 0, width: 0, height: 0 };
    let bestShortSideFit = Infinity;
    let bestLongSideFit = Infinity;

    for (const rect of freeRectangles) {
        if (rect.width >= width && rect.height >= height) {
            const leftoverHoriz = Math.abs(rect.width - width);
            const leftoverVert = Math.abs(rect.height - height);
            const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
            const longSideFit = Math.max(leftoverHoriz, leftoverVert);

            if (shortSideFit < bestShortSideFit || 
                (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)) {
                bestNode = { x: rect.x, y: rect.y, width, height };
                bestShortSideFit = shortSideFit;
                bestLongSideFit = longSideFit;
            }
        }
    }

    return bestNode;
}

/**
 * 分割空闲矩形
 */
function splitFreeRectangles(freeRectangles, usedRectangle) {
    // 遍历所有空闲矩形，与已使用的矩形进行分割
    for (let i = freeRectangles.length - 1; i >= 0; i--) {
        if (splitFreeRectangle(freeRectangles, i, usedRectangle)) {
            freeRectangles.splice(i, 1);
        }
    }

    // 移除重复的矩形
    pruneFreeRectangles(freeRectangles);
}

/**
 * 分割单个空闲矩形
 */
function splitFreeRectangle(freeRectangles, i, usedRectangle) {
    const freeRect = freeRectangles[i];

    // 检查是否重叠
    if (usedRectangle.x >= freeRect.x + freeRect.width || 
        usedRectangle.x + usedRectangle.width <= freeRect.x ||
        usedRectangle.y >= freeRect.y + freeRect.height ||
        usedRectangle.y + usedRectangle.height <= freeRect.y) {
        return false;
    }

    // 分割矩形
    if (usedRectangle.x < freeRect.x + freeRect.width && usedRectangle.x + usedRectangle.width > freeRect.x) {
        // 在顶部创建新矩形
        if (usedRectangle.y > freeRect.y && usedRectangle.y < freeRect.y + freeRect.height) {
            const newNode = {
                x: freeRect.x,
                y: freeRect.y,
                width: freeRect.width,
                height: usedRectangle.y - freeRect.y
            };
            freeRectangles.push(newNode);
        }

        // 在底部创建新矩形
        if (usedRectangle.y + usedRectangle.height < freeRect.y + freeRect.height) {
            const newNode = {
                x: freeRect.x,
                y: usedRectangle.y + usedRectangle.height,
                width: freeRect.width,
                height: freeRect.y + freeRect.height - (usedRectangle.y + usedRectangle.height)
            };
            freeRectangles.push(newNode);
        }
    }

    if (usedRectangle.y < freeRect.y + freeRect.height && usedRectangle.y + usedRectangle.height > freeRect.y) {
        // 在左侧创建新矩形
        if (usedRectangle.x > freeRect.x && usedRectangle.x < freeRect.x + freeRect.width) {
            const newNode = {
                x: freeRect.x,
                y: freeRect.y,
                width: usedRectangle.x - freeRect.x,
                height: freeRect.height
            };
            freeRectangles.push(newNode);
        }

        // 在右侧创建新矩形
        if (usedRectangle.x + usedRectangle.width < freeRect.x + freeRect.width) {
            const newNode = {
                x: usedRectangle.x + usedRectangle.width,
                y: freeRect.y,
                width: freeRect.x + freeRect.width - (usedRectangle.x + usedRectangle.width),
                height: freeRect.height
            };
            freeRectangles.push(newNode);
        }
    }

    return true;
}

/**
 * 移除重复的矩形
 */
function pruneFreeRectangles(freeRectangles) {
    for (let i = 0; i < freeRectangles.length; i++) {
        for (let j = i + 1; j < freeRectangles.length; j++) {
            if (isContainedIn(freeRectangles[i], freeRectangles[j])) {
                freeRectangles.splice(i, 1);
                i--;
                break;
            }
            if (isContainedIn(freeRectangles[j], freeRectangles[i])) {
                freeRectangles.splice(j, 1);
                j--;
            }
        }
    }
}

/**
 * 检查矩形a是否被矩形b包含
 */
function isContainedIn(a, b) {
    return a.x >= b.x && a.y >= b.y && 
           a.x + a.width <= b.x + b.width && 
           a.y + a.height <= b.y + b.height;
}

/**
 * 计算大于等于n的最小2的幂次方
 */
function nextPowerOf2(n) {
    return Math.pow(2, Math.ceil(Math.log2(Math.max(1, n))));
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { packImagesWithMaxRectangles, nextPowerOf2 };
}
