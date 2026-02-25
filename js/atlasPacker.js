// 图集生成算法模块

/**
 * Shelf算法（货架算法）- 图集生成 - 增强优化版
 * @param {Array} sortedImages - 已排序的图片数组
 * @param {number} padding - 图片间距
 * @param {number} maxWidth - 最大宽度
 * @returns {Object|null} - 包含canvas、frames、width、height的对象，失败返回null
 */
function packImagesInternal(sortedImages, padding, maxWidth) {
    // 增强优化的 Shelf 算法
    const frames = [];
    const shelves = []; // 每个 shelf: { y, height, currentX, maxWidth, usedArea }

    let images = [...sortedImages];

    // 多轮尝试，增加尝试次数以获得更优解
    let attempt = 0;
    const maxAttempts = 3;

    while (images.length > 0 && attempt < maxAttempts) {
        let placedThisRound = false;
        const newImages = [];

        for (const item of images) {
            const width = item.width;
            const height = item.height;

            // 检查图片是否超过最大尺寸
            if (width > maxWidth && height > maxWidth) {
                return null;
            }

            let placed = false;
            let bestShelf = null;
            let bestRotated = false;
            let bestScore = -Infinity;
            let bestFit = Infinity;

            // 第一步：尝试放入现有 shelf（增强评分策略）
            for (const shelf of shelves) {
                const remainingWidth = maxWidth - shelf.currentX - padding;

                // 尝试不旋转放入
                if (width <= remainingWidth && height <= shelf.height) {
                    const waste = shelf.height - height;
                    const widthFit = remainingWidth - width; // 宽度余量越小越好
                    const shelfUtilization = (shelf.currentX * shelf.height) / (maxWidth * shelf.height);

                    // 综合评分：
                    // 1. waste越小越好（主要因素）
                    // 2. widthFit越小越好（宽度利用更充分）
                    // 3. shelfUtilization越高越好（优先利用利用率高的shelf）
                    // 4. shelf.y越大越好（底部优先）
                    const score = -waste * 2 - widthFit * 0.1 + shelfUtilization * 10 + shelf.y * 0.05;

                    if (score > bestScore || (score === bestScore && waste < bestFit)) {
                        bestScore = score;
                        bestFit = waste;
                        bestShelf = shelf;
                        bestRotated = false;
                    }
                }

                // 尝试旋转放入
                if (height <= remainingWidth && width <= shelf.height) {
                    const waste = shelf.height - width;
                    const widthFit = remainingWidth - height;
                    const shelfUtilization = (shelf.currentX * shelf.height) / (maxWidth * shelf.height);

                    const score = -waste * 2 - widthFit * 0.1 + shelfUtilization * 10 + shelf.y * 0.05;

                    if (score > bestScore || (score === bestScore && waste < bestFit)) {
                        bestScore = score;
                        bestFit = waste;
                        bestShelf = shelf;
                        bestRotated = true;
                    }
                }
            }

            // 找到合适的 shelf，放置
            if (bestShelf) {
                const rotated = bestRotated;
                const placeWidth = rotated ? height : width;
                const placeHeight = rotated ? width : height;

                frames.push({
                    name: item.name,
                    x: bestShelf.currentX,
                    y: bestShelf.y,
                    width: placeWidth,
                    height: placeHeight,
                    originalWidth: width,
                    originalHeight: height,
                    offsetX: 0,
                    offsetY: 0,
                    rotated: rotated,
                    img: item.img
                });

                bestShelf.currentX += placeWidth + padding;
                placed = true;
                placedThisRound = true;
            }

            // 第二步：无法放入现有 shelf，创建新 shelf（增强版）
            if (!placed) {
                // 计算新 shelf 的 y 坐标
                let newY = padding;

                if (shelves.length > 0) {
                    const lastShelf = shelves[shelves.length - 1];
                    newY = lastShelf.y + lastShelf.height + padding;
                }

                // 检查是否超过最大高度
                if (newY > 4096) {
                    return null;
                }

                // 决定新 shelf 的高度和是否旋转（增强版）
                let rotated = false;
                let placeWidth = width;
                let placeHeight = height;

                // 增强旋转策略：不仅考虑宽度限制，还考虑空间利用率
                const widthOverLimit = width + padding > maxWidth;
                const heightOverLimit = height + padding > maxWidth;

                if (widthOverLimit && !heightOverLimit) {
                    // 必须旋转
                    rotated = true;
                    placeWidth = height;
                    placeHeight = width;
                } else if (!widthOverLimit && heightOverLimit) {
                    // 保持原样
                } else if (!widthOverLimit && !heightOverLimit) {
                    // 都可以放下，选择更节省空间的
                    const areaNormal = width * height;
                    const areaRotated = height * width;
                    if (areaRotated < areaNormal) {
                        rotated = true;
                        placeWidth = height;
                        placeHeight = width;
                    }
                }

                // 仍然放不下
                if (placeWidth + padding > maxWidth) {
                    return null;
                }

                // 智能选择shelf高度（增强版：多策略综合评估）
                let optimalHeight = placeHeight;

                // 收集剩余图片和已放置图片的尺寸信息
                const remainingImages = [...newImages];
                const allImages = [...remainingImages, item];

                // 计算各种高度统计信息
                const allHeights = allImages.map(img => img.height);

                // 策略1：高度众数（使用8像素精度，更精细）
                const heightCounts = {};
                allHeights.forEach(h => {
                    const roundedH = Math.round(h / 8) * 8;
                    heightCounts[roundedH] = (heightCounts[roundedH] || 0) + 1;
                });
                const mostCommonHeight = Object.entries(heightCounts)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || placeHeight;

                // 策略2：中位数高度（避免极端值影响）
                const sortedHeights = [...allHeights].sort((a, b) => a - b);
                const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)];

                // 策略3：选择能最大化容纳数的高度
                const viableHeights = [
                    placeHeight,
                    mostCommonHeight,
                    medianHeight,
                    Math.max(...allHeights)
                ].filter(h => h >= placeHeight && h <= placeHeight * 2);

                // 评估每个高度的价值
                let bestHeightScore = -Infinity;
                for (const testHeight of viableHeights) {
                    // 计算能放入该高度的图片数量
                    const canFitCount = allImages.filter(img => img.height <= testHeight).length;
                    // 评分：能放下的越多越好，高度越小越好
                    const score = canFitCount * 100 - testHeight * 0.5;
                    if (score > bestHeightScore) {
                        bestHeightScore = score;
                        optimalHeight = testHeight;
                    }
                }

                // 尝试与现有shelf合并（增强版）
                if (shelves.length > 0) {
                    const lastShelf = shelves[shelves.length - 1];
                    const heightDiff = Math.abs(lastShelf.height - optimalHeight);

                    // 合并条件：高度差小且有足够宽度
                    const mergeThreshold = Math.min(optimalHeight * 0.25, 48); // 动态阈值，最多48px
                    if (heightDiff <= mergeThreshold &&
                        lastShelf.currentX + padding + placeWidth <= maxWidth) {

                        // 调整shelf高度为两者最大值
                        const mergedHeight = Math.max(lastShelf.height, optimalHeight);
                        lastShelf.height = mergedHeight;

                        // 更新已放置帧的y坐标（垂直居中）
                        const yOffset = (mergedHeight - (lastShelf.height - heightDiff)) / 2;
                        for (const frame of frames) {
                            if (frame.y === lastShelf.y) {
                                frame.y += yOffset;
                            }
                        }

                        // 放置当前图片
                        const placeH = rotated ? width : height;
                        const placeW = rotated ? height : width;

                        frames.push({
                            name: item.name,
                            x: lastShelf.currentX,
                            y: lastShelf.y + (mergedHeight - placeH) / 2,
                            width: placeW,
                            height: placeH,
                            originalWidth: width,
                            originalHeight: height,
                            offsetX: 0,
                            offsetY: 0,
                            rotated: rotated,
                            img: item.img
                        });

                        lastShelf.currentX += placeW + padding;
                        placed = true;
                        placedThisRound = true;
                    }
                }

                if (!placed) {
                    // 创建新 shelf
                    const newShelf = {
                        y: newY,
                        height: optimalHeight,
                        currentX: padding + placeWidth + padding,
                        maxWidth: maxWidth
                    };
                    shelves.push(newShelf);

                    frames.push({
                        name: item.name,
                        x: padding,
                        y: newY + (optimalHeight - placeHeight) / 2,
                        width: placeWidth,
                        height: placeHeight,
                        originalWidth: width,
                        originalHeight: height,
                        offsetX: 0,
                        offsetY: 0,
                        rotated: rotated,
                        img: item.img
                    });

                    placed = true;
                    placedThisRound = true;
                }
            }

            if (!placed) {
                newImages.push(item);
            }
        }

        images = newImages;

        // 如果没有放置任何图片，退出循环
        if (!placedThisRound) {
            break;
        }

        attempt++;

        // 重新排序未放置的图片（增强版：多策略切换）
        if (images.length > 0 && attempt < maxAttempts) {
            if (attempt === 1) {
                // 第一轮：按最小边排序（填充小缝隙）
                images.sort((a, b) => {
                    const minA = Math.min(a.width, a.height);
                    const minB = Math.min(b.width, b.height);
                    return minA - minB;
                });
            } else if (attempt === 2) {
                // 第二轮：按周长排序（中等尺寸优先）
                images.sort((a, b) => {
                    const perimeterA = a.width + a.height;
                    const perimeterB = b.width + b.height;
                    return perimeterA - perimeterB;
                });
            } else {
                // 第三轮：按面积排序（大尺寸优先）
                images.sort((a, b) => {
                    const areaA = a.width * a.height;
                    const areaB = b.width * b.height;
                    return areaA - areaB;
                });
            }
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
 * 计算大于等于n的最小2的幂次方
 * @param {number} n 
 * @returns {number}
 */
function nextPowerOf2(n) {
    return Math.pow(2, Math.ceil(Math.log2(Math.max(1, n))));
}

/**
 * 主打包函数 - 尝试多种排序策略和宽度选项选择最优结果
 * @param {Array} images - 图片数组
 * @param {number} padding - 图片间距
 * @param {number} maxWidth - 最大宽度
 * @param {boolean} usePowerOfTwo - 是否使用2的幂次方尺寸，默认true
 * @returns {Object|null} - 最优打包结果
 */
function packImages(images, padding, maxWidth, usePowerOfTwo = true) {
    const effectiveMaxWidth = Math.min(maxWidth, 2048);

    // 更全面的排序策略 - 增强版优化空间利用率
    const sortStrategies = [
        { name: '面积降序', fn: (a, b) => (b.width * b.height) - (a.width * a.height) },
        { name: '面积升序', fn: (a, b) => (a.width * a.height) - (b.width * b.height) },
        { name: '宽度降序', fn: (a, b) => b.width - a.width },
        { name: '宽度升序', fn: (a, b) => a.width - b.width },
        { name: '高度降序', fn: (a, b) => b.height - a.height },
        { name: '高度升序', fn: (a, b) => a.height - b.height },
        { name: '最大边降序', fn: (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) },
        { name: '最大边升序', fn: (a, b) => Math.max(a.width, a.height) - Math.max(b.width, b.height) },
        { name: '最小边降序', fn: (a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height) },
        { name: '最小边升序', fn: (a, b) => Math.min(a.width, a.height) - Math.min(b.width, b.height) },
        { name: '长宽比降序', fn: (a, b) => (b.width / b.height) - (a.width / a.height) },
        { name: '长宽比升序', fn: (a, b) => (a.width / a.height) - (b.width / b.height) },
        { name: '周长降序', fn: (a, b) => (b.width + b.height) - (a.width + a.height) },
        { name: '周长升序', fn: (a, b) => (a.width + a.height) - (b.width + b.height) }
    ];

    // 宽度选项 - 从大到小尝试
    const widthOptions = [];
    if (usePowerOfTwo) {
        // 2的幂次方宽度选项
        for (let pow = 11; pow >= 6; pow--) {
            const w = Math.pow(2, pow);
            if (w <= effectiveMaxWidth) {
                widthOptions.push(w);
            }
        }
    }

    // 添加估算的最优宽度（增强版：更精准的估算）
    const totalArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
    const estimatedWidth = Math.ceil(Math.sqrt(totalArea * 1.3));

    if (estimatedWidth <= effectiveMaxWidth && estimatedWidth >= 256) {
        const alignedWidth = Math.ceil(estimatedWidth / 16) * 16; // 16对齐，更精细
        if (!widthOptions.includes(alignedWidth)) {
            widthOptions.push(alignedWidth);
        }
        // 添加相邻的多个尺寸（扩大搜索范围）
        const adjacentWidths = [alignedWidth - 48, alignedWidth - 16, alignedWidth + 16, alignedWidth + 48];
        for (const adjWidth of adjacentWidths) {
            if (adjWidth >= 256 && adjWidth <= effectiveMaxWidth && !widthOptions.includes(adjWidth)) {
                widthOptions.push(adjWidth);
            }
        }
    }

    // 确保至少有一个宽度选项
    if (widthOptions.length === 0) {
        widthOptions.push(usePowerOfTwo ? 1024 : effectiveMaxWidth);
    }

    // 排序宽度选项：2的幂次方从大到小，估算宽度在前
    widthOptions.sort((a, b) => {
        const aIsPow2 = (a & (a - 1)) === 0;
        const bIsPow2 = (b & (b - 1)) === 0;
        if (aIsPow2 && bIsPow2) return b - a; // 都是2的幂次方，大的在前
        if (!aIsPow2 && !bIsPow2) return Math.abs(a - estimatedWidth) - Math.abs(b - estimatedWidth); // 都不是，接近估算的在前
        return aIsPow2 ? -1 : 1; // 2的幂次方优先
    });

    let bestResult = null;
    let bestArea = Infinity;
    let bestEfficiency = 0;

    for (const width of widthOptions) {
        for (const strategy of sortStrategies) {
            const sortedImages = [...images].sort(strategy.fn);
            const result = packImagesInternal(sortedImages, padding, width);

            if (!result) continue;

            let finalWidth, finalHeight, finalCanvas;

            if (usePowerOfTwo) {
                // 将尺寸调整为2的幂次方
                finalWidth = nextPowerOf2(result.width);
                finalHeight = nextPowerOf2(result.height);

                // 如果调整后超过2048，跳过
                if (finalWidth > 2048 || finalHeight > 2048) continue;

                // 仅在尺寸变化时创建新canvas（优化性能）
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
                // 使用原始尺寸
                finalWidth = result.width;
                finalHeight = result.height;
                finalCanvas = result.canvas;
            }

            const area = finalWidth * finalHeight;
            const imgUsedArea = images.reduce((sum, img) => sum + img.width * img.height, 0);
            const efficiency = imgUsedArea / area * 100;

            const sizeLabel = `${finalWidth}×${finalHeight}`;
            console.log(`[${strategy.name}] 宽度${width}: 图集 ${sizeLabel}, 利用率 ${efficiency.toFixed(2)}%`);

            // 优化选择逻辑：优先利用率，其次面积
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
        console.log(`最优图集: ${bestResult.width}×${bestResult.height} (${sizeType}), 利用率 ${finalEfficiency}%`);
    }

    return bestResult;
}

/**
 * 生成Cocos Creator格式的plist文件
 * @param {string} atlasName - 图集名称
 * @param {number} width - 图集宽度
 * @param {number} height - 图集高度
 * @param {Array} frames - 帧数据数组
 * @returns {string} - plist XML字符串
 */
function generatePlist(atlasName, width, height, frames) {
    let framesXml = '';
    for (const frame of frames) {
        const rotatedValue = frame.rotated ? '<true/>' : '<false/>';

        framesXml += `      <key>${frame.name}.png</key>
      <dict>
        <key>frame</key>
        <string>{{${Math.round(frame.x)},${Math.round(frame.y)}},{${Math.round(frame.width)},${Math.round(frame.height)}}}</string>
        <key>offset</key>
        <string>{${frame.offsetX},${frame.offsetY}}</string>
        <key>rotated</key>
        ${rotatedValue}
        <key>sourceColorRect</key>
        <string>{{0,0},{${Math.round(frame.originalWidth)},${Math.round(frame.originalHeight)}}}</string>
        <key>sourceSize</key>
        <string>{${Math.round(frame.originalWidth)},${Math.round(frame.originalHeight)}}</string>
      </dict>
`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>frames</key>
  <dict>
${framesXml}  </dict>
  <key>metadata</key>
  <dict>
    <key>format</key>
    <integer>2</integer>
    <key>realTextureFileName</key>
    <string>${atlasName}.png</string>
    <key>size</key>
    <string>{${width},${height}}</string>
    <key>textureFileName</key>
    <string>${atlasName}.png</string>
  </dict>
</dict>
</plist>`;
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { packImages, generatePlist };
}
