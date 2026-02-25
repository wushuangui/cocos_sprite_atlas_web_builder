
/**
 * 多图集打包模块
 * 支持将大量图片自动拆分为多个小图集
 */

/**
 * 多图集打包器类
 */
class MultiAtlasPacker {
    constructor(options = {}) {
        this.maxWidth = options.maxWidth || 2048;
        this.maxHeight = options.maxHeight || 2048;
        this.padding = options.padding || 2;
        this.usePowerOfTwo = options.usePowerOfTwo !== false;
        this.maxImagesPerAtlas = options.maxImagesPerAtlas || 100;
        this.maxAreaPerAtlas = options.maxAreaPerAtlas || (2048 * 1024);

        // 可选：指定使用的打包算法
        this.packingAlgorithm = options.packingAlgorithm || 'maxRectangles'; // 'shelf' or 'maxRectangles'
    }

    /**
     * 打包多个图集
     * @param {Array} images - 图片数组
     * @returns {Array} - 图集数组
     */
    pack(images) {
        if (images.length === 0) {
            return [];
        }

        // 如果图片数量较少，直接打包单个图集
        if (images.length <= this.maxImagesPerAtlas) {
            const result = this.packSingleAtlas(images);
            return result ? [result] : [];
        }

        // 使用智能分组
        const grouper = new ImageGrouper();
        const groups = grouper.groupImages(images);

        console.log(`图片分组结果: ${groups.length} 个组`);
        console.table(grouper.getGroupStatistics(groups));

        // 为每个组打包图集
        const atlases = [];
        for (const group of groups) {
            const result = this.packSingleAtlas(group.items, group.strategy);
            if (result) {
                result.groupName = group.name;
                atlases.push(result);
            }
        }

        return atlases;
    }

    /**
     * 打包单个图集
     */
    packSingleAtlas(images, strategy = 'area') {
        if (this.packingAlgorithm === 'maxRectangles') {
            return packImagesWithMaxRectangles(images, this.padding, this.maxWidth, this.usePowerOfTwo);
        } else {
            return packImages(images, this.padding, this.maxWidth, this.usePowerOfTwo);
        }
    }

    /**
     * 生成多个PLIST文件
     * @param {Array} atlases - 图集数组
     * @param {string} baseName - 基础名称
     * @returns {Array} - PLIST文件数组
     */
    generatePlists(atlases, baseName) {
        return atlases.map((atlas, index) => {
            const atlasName = `${baseName}_${index + 1}`;
            return {
                name: atlasName,
                content: generatePlist(atlasName, atlas.width, atlas.height, atlas.frames)
            };
        });
    }

    /**
     * 生成ZIP文件
     * @param {Array} atlases - 图集数组
     * @param {string} baseName - 基础名称
     * @returns {Promise<Blob>} - ZIP文件
     */
    async generateZip(atlases, baseName) {
        const zip = new JSZip();
        const plists = this.generatePlists(atlases, baseName);

        // 添加PNG和PLIST文件到ZIP
        for (let i = 0; i < atlases.length; i++) {
            const atlas = atlases[i];
            const plist = plists[i];
            const atlasName = `${baseName}_${i + 1}`;

            // 将canvas转换为blob
            const pngBlob = await new Promise(resolve => {
                atlas.canvas.toBlob(resolve, 'image/png');
            });

            zip.file(`${atlasName}.png`, pngBlob);
            zip.file(`${atlasName}.plist`, plist.content);
        }

        // 生成ZIP文件
        return await zip.generateAsync({ type: 'blob' });
    }

    /**
     * 获取图集统计信息
     */
    getStatistics(atlases) {
        return {
            count: atlases.length,
            totalImages: atlases.reduce((sum, atlas) => sum + atlas.frames.length, 0),
            totalArea: atlases.reduce((sum, atlas) => sum + atlas.width * atlas.height, 0),
            avgEfficiency: atlases.reduce((sum, atlas) => {
                const usedArea = atlas.frames.reduce((s, f) => s + f.width * f.height, 0);
                const efficiency = usedArea / (atlas.width * atlas.height) * 100;
                return sum + efficiency;
            }, 0) / atlases.length,
            details: atlases.map(atlas => ({
                width: atlas.width,
                height: atlas.height,
                frameCount: atlas.frames.length,
                groupName: atlas.groupName || 'default'
            }))
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MultiAtlasPacker };
}
