// 图集算法测试脚本

// 模拟图片创建
function createMockImage(width, height) {
    return {
        name: `img_${width}x${height}`,
        width: width,
        height: height,
        img: { width, height } // 模拟canvas对象
    };
}

// 测试用例
const testCases = [
    {
        name: "简单测试 - 少量图片",
        images: [
            createMockImage(100, 100),
            createMockImage(150, 80),
            createMockImage(120, 120)
        ]
    },
    {
        name: "中等测试 - 多种尺寸",
        images: [
            createMockImage(200, 150),
            createMockImage(180, 180),
            createMockImage(250, 100),
            createMockImage(120, 200),
            createMockImage(160, 160),
            createMockImage(300, 80)
        ]
    },
    {
        name: "复杂测试 - 大量图片",
        images: [
            createMockImage(100, 100), createMockImage(100, 100), createMockImage(100, 100),
            createMockImage(150, 80), createMockImage(150, 80), createMockImage(150, 80),
            createMockImage(120, 120), createMockImage(120, 120), createMockImage(120, 120),
            createMockImage(200, 100), createMockImage(200, 100),
            createMockImage(80, 200), createMockImage(80, 200)
        ]
    }
];

// 运行测试
function runTests() {
    console.log('===== 图集算法测试 =====\n');

    testCases.forEach((testCase, index) => {
        console.log(`【测试 ${index + 1}】${testCase.name}`);
        console.log(`图片数量: ${testCase.images.length}`);

        // 计算总面积
        const totalArea = testCase.images.reduce((sum, img) => sum + img.width * img.height, 0);
        console.log(`图片总面积: ${totalArea} 像素\n`);

        // 测试2的幂次方模式
        try {
            console.log('>>> 测试2的幂次方模式');
            const resultPow2 = packImages(testCase.images, 2, 2048, true);
            if (resultPow2) {
                const efficiency = (totalArea / (resultPow2.width * resultPow2.height) * 100).toFixed(2);
                console.log(`✓ 成功 - ${resultPow2.width}×${resultPow2.height}, 利用率: ${efficiency}%\n`);
            } else {
                console.log('✗ 失败\n');
            }
        } catch (e) {
            console.log(`✗ 错误: ${e.message}\n`);
        }

        // 测试原始尺寸模式
        try {
            console.log('>>> 测试原始尺寸模式');
            const resultRaw = packImages(testCase.images, 2, 2048, false);
            if (resultRaw) {
                const efficiency = (totalArea / (resultRaw.width * resultRaw.height) * 100).toFixed(2);
                console.log(`✓ 成功 - ${resultRaw.width}×${resultRaw.height}, 利用率: ${efficiency}%\n`);
            } else {
                console.log('✗ 失败\n');
            }
        } catch (e) {
            console.log(`✗ 错误: ${e.message}\n`);
        }

        console.log('---\n');
    });

    console.log('===== 测试完成 =====');
}

// 如果在Node环境中运行
if (typeof module !== 'undefined' && module.exports) {
    const { packImages } = require('./atlasPacker.js');
    runTests();
}
