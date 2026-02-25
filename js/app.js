let loadedImages = [];
let generatedCanvas = null;
let generatedFrames = null;
let generatedPlistContent = null;
let generatedAtlases = []; // 存储多个图集
let currentAlgorithm = 'maxRectangles'; // 当前使用的算法
let useMultiAtlas = false; // 是否使用多图集

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
const testPanel = document.getElementById('testPanel');
const testBtn = document.getElementById('testBtn');
const clearTestBtn = document.getElementById('clearTestBtn');
const testFramePath = document.getElementById('testFramePath');
const testResult = document.getElementById('testResult');
const testCanvas = document.getElementById('testCanvas');
const testPlaceholder = document.getElementById('testPlaceholder');
const testInfo = document.getElementById('testInfo');
const downloadModal = document.getElementById('downloadModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const exportFileName = document.getElementById('exportFileName');
const filePreview = document.getElementById('filePreview');
const fileHint = document.getElementById('fileHint');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(file =>
        file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg'
    );

    if (imageFiles.length === 0) {
        showStatus('请选择有效的图片文件', 'error');
        return;
    }

    showStatus('正在加载图片...', 'error');

    try {
        const newImages = await loadImages(imageFiles);
        loadedImages = [...loadedImages, ...newImages];
        updateImageList();
        showStatus(`成功加载 ${newImages.length} 张图片`, 'success');
    } catch (error) {
        showStatus('图片加载失败: ' + error.message, 'error');
    }
}

function loadImages(files) {
    return Promise.all(files.map(file => {
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
                img.onerror = () => reject(new Error(`无法加载 ${file.name}`));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
            reader.readAsDataURL(file);
        });
    }));
}

function updateImageList() {
    imageList.innerHTML = '';
    loadedImages.forEach(item => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.innerHTML = `
            <img src="${item.img.src}" alt="${item.name}">
            <span>${item.name}</span>
        `;
        imageList.appendChild(div);
    });
    imageCount.textContent = `(${loadedImages.length})`;
    generateBtn.disabled = loadedImages.length === 0;
    downloadBtn.disabled = true;
    clearBtn.disabled = loadedImages.length === 0;
}

function clearAll() {
    loadedImages = [];
    updateImageList();
    atlasPreview.innerHTML = '<div class="placeholder">生成图集后在此预览</div>';
    stats.style.display = 'none';
    status.style.display = 'none';
    fileInput.value = '';
}

function generateAtlas() {
    if (loadedImages.length === 0) {
        showStatus('请先选择图片', 'error');
        return;
    }

    const padding = parseInt(document.getElementById('padding').value) || 0;
    const maxWidth = parseInt(document.getElementById('maxWidth').value) || 2048;
    const usePowerOfTwo = document.getElementById('powerOfTwo').checked;
    currentAlgorithm = document.getElementById('algorithm').value;
    useMultiAtlas = false; // 多图集功能暂时禁用

    showStatus('正在生成图集...', 'info');

    setTimeout(() => {
        try {
            // 使用单图集打包
            let result;
            if (currentAlgorithm === 'maxRectangles') {
                result = packImagesWithMaxRectangles(loadedImages, padding, maxWidth, usePowerOfTwo);
            } else {
                result = packImages(loadedImages, padding, maxWidth, usePowerOfTwo);
            }

            if (!result) {
                showStatus('图集生成失败: 图片尺寸超过最大宽度限制', 'error');
                return;
            }

            generatedCanvas = result.canvas;
            generatedFrames = result.frames;
            generatedAtlases = [result]; // 存储为单图集数组

            // 使用canvas的实际尺寸进行验证
            try {
                validateFrames(result.frames, generatedCanvas.width, generatedCanvas.height);
            } catch (validateError) {
                console.warn('帧验证警告:', validateError);
                // 继续执行，不中断流程
            }

            atlasPreview.innerHTML = '';
            atlasPreview.appendChild(generatedCanvas);

            showStats(generatedCanvas.width, generatedCanvas.height, loadedImages.length, loadedImages);

            downloadBtn.disabled = false;
            testPanel.style.display = 'block';

            const sizeType = usePowerOfTwo ? '2的幂次方' : '原始';
            showStatus(`图集生成成功！尺寸: ${result.width}×${result.height} (${sizeType})`, 'success');
        } catch (error) {
            showStatus('图集生成失败: ' + error.message, 'error');
            console.error(error);
        }
    }, 100);
}


function validateFrames(frames, atlasWidth, atlasHeight) {
    for (const frame of frames) {
        // 对于旋转的帧，width和height已经交换过，直接使用
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

function showDownloadDialog() {
    if (!generatedCanvas || !generatedFrames) {
        showStatus('请先生成图集', 'error');
        return;
    }

    const defaultName = document.getElementById('atlasName').value.trim() || 'sprite_atlas';
    exportFileName.value = defaultName;
    updateFilePreview();
    downloadModal.style.display = 'block';
    exportFileName.focus();
}

function hideDownloadDialog() {
    downloadModal.style.display = 'none';
}

function getExportFormat() {
    const radio = document.querySelector('input[name="exportFormat"]:checked');
    return radio ? radio.value : 'zip';
}

function updateFilePreview() {
    const fileName = exportFileName.value.trim() || 'sprite_atlas';
    const format = getExportFormat();
    
    if (format === 'zip') {
        filePreview.textContent = `${fileName}.zip`;
        fileHint.innerHTML = `导出的文件为: <span id="filePreview">${fileName}.zip</span> (包含 .png 和 .plist)`;
    } else {
        fileHint.innerHTML = `导出的文件为: <span id="filePreview">${fileName}.png</span> 和 <span>${fileName}.plist</span>`;
    }
}

async function confirmDownload() {
    if (!generatedCanvas || !generatedFrames) {
        showStatus('请先生成图集', 'error');
        return;
    }

    const atlasName = exportFileName.value.trim() || 'sprite_atlas';
    const format = getExportFormat();

    if (!atlasName || atlasName.length === 0) {
        showStatus('请输入文件名称', 'error');
        return;
    }

    const plistContent = generatePlist(atlasName, generatedCanvas.width, generatedCanvas.height, generatedFrames);

    if (format === 'zip') {
        // 生成ZIP压缩包
        try {
            const zip = new JSZip();
            
            // 将canvas转换为blob并添加到zip
            const pngBlob = await new Promise(resolve => {
                generatedCanvas.toBlob(resolve, 'image/png');
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
        generatedCanvas.toBlob(function(blob) {
            saveAs(blob, `${atlasName}.png`);
            const plistBlob = new Blob([plistContent], { type: 'application/xml' });
            saveAs(plistBlob, `${atlasName}.plist`);
            hideDownloadDialog();
            showStatus(`图集导出成功！文件名: ${atlasName}`, 'success');
        }, 'image/png');
    }
}

clearBtn.addEventListener('click', clearAll);
generateBtn.addEventListener('click', generateAtlas);
downloadBtn.addEventListener('click', showDownloadDialog);
modalOverlay.addEventListener('click', hideDownloadDialog);
modalClose.addEventListener('click', hideDownloadDialog);
modalCancel.addEventListener('click', hideDownloadDialog);
modalConfirm.addEventListener('click', confirmDownload);
exportFileName.addEventListener('input', updateFilePreview);
document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
    radio.addEventListener('change', updateFilePreview);
});
testBtn.addEventListener('click', testTexture);
clearTestBtn.addEventListener('click', clearTest);

function testTexture() {
    if (!generatedCanvas || !generatedFrames) {
        showStatus('请先生成图集', 'error');
        return;
    }

    const framePath = testFramePath.value.trim();
    if (!framePath) {
        showStatus('请输入纹理路径', 'error');
        return;
    }

    const frameName = framePath.replace(/\.png$/i, '');
    const frame = generatedFrames.find(f => f.name === frameName);

    if (!frame) {
        showStatus(`未找到纹理: ${framePath}`, 'error');
        return;
    }

    testResult.style.display = 'block';
    testPlaceholder.style.display = 'none';

    const displayWidth = frame.originalWidth + 40;
    const displayHeight = frame.originalHeight + 40;

    const ctx = testCanvas.getContext('2d');
    testCanvas.width = displayWidth;
    testCanvas.height = displayHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);

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
            generatedCanvas,
            frame.x, frame.y, frame.width, frame.height,
            -frame.width / 2, -frame.height / 2, frame.width, frame.height
        );
        
        // 将还原后的图片绘制到测试canvas
        ctx.drawImage(tempCanvas, 20, 20);
    } else {
        ctx.drawImage(
            generatedCanvas,
            frame.x, frame.y, frame.width, frame.height,
            20, 20, frame.width, frame.height
        );
    }

    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, frame.originalWidth, frame.originalHeight);

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

    showStatus(`成功获取纹理: ${framePath}`, 'success');
}

function clearTest() {
    testResult.style.display = 'none';
    testFramePath.value = '';
    const ctx = testCanvas.getContext('2d');
    ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
    showStatus('测试面板已清除', 'success');
}

// 图集生成函数已从 atlasPacker.js 导入

function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
}

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

function displayMultiAtlasPreview(atlases) {
    atlasPreview.innerHTML = '';

    // 创建图集标签页
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'atlas-tabs';

    // 创建图集内容容器
    const contentContainer = document.createElement('div');
    contentContainer.className = 'atlas-content';

    atlases.forEach((atlas, index) => {
        // 创建标签
        const tab = document.createElement('button');
        tab.className = `atlas-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = `图集 ${index + 1}`;
        tab.onclick = () => {
            // 切换标签
            document.querySelectorAll('.atlas-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.atlas-content-item').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            contentItem.style.display = 'block';

            // 更新当前图集
            generatedCanvas = atlas.canvas;
            generatedFrames = atlas.frames;
        };
        tabsContainer.appendChild(tab);

        // 创建内容
        const contentItem = document.createElement('div');
        contentItem.className = `atlas-content-item ${index === 0 ? '' : 'hidden'}`;
        contentItem.style.display = index === 0 ? 'block' : 'none';

        const info = document.createElement('div');
        info.className = 'atlas-info';
        info.innerHTML = `
            <div class="atlas-info-item"><strong>尺寸:</strong> ${atlas.width} × ${atlas.height}</div>
            <div class="atlas-info-item"><strong>图片数:</strong> ${atlas.frames.length} 张</div>
            ${atlas.groupName ? `<div class="atlas-info-item"><strong>分组:</strong> ${atlas.groupName}</div>` : ''}
        `;
        contentItem.appendChild(info);
        contentItem.appendChild(atlas.canvas.cloneNode(true));
        contentContainer.appendChild(contentItem);
    });

    atlasPreview.appendChild(tabsContainer);
    atlasPreview.appendChild(contentContainer);
}

function displayMultiAtlasStats(atlases) {
    const totalImages = atlases.reduce((sum, atlas) => sum + atlas.frames.length, 0);
    const totalArea = atlases.reduce((sum, atlas) => sum + atlas.width * atlas.height, 0);
    const usedArea = atlases.reduce((sum, atlas) => 
        sum + atlas.frames.reduce((s, f) => s + f.width * f.height, 0), 0);
    const efficiency = ((usedArea / totalArea) * 100).toFixed(2);

    stats.innerHTML = `
        <h4>图集统计信息</h4>
        <div class="stats-info">
            <div class="stat-item">
                <div class="stat-label">图集数量</div>
                <div class="stat-value">${atlases.length} 个</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">总图片数</div>
                <div class="stat-value">${totalImages} 张</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">总尺寸</div>
                <div class="stat-value">${totalArea} 像素²</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">空间利用率</div>
                <div class="stat-value">${efficiency}%</div>
            </div>
        </div>
        <div class="atlas-details">
            <h5>各图集详情</h5>
            ${atlases.map((atlas, index) => `
                <div class="atlas-detail-item">
                    <span class="atlas-detail-name">图集 ${index + 1}</span>
                    <span class="atlas-detail-info">${atlas.width}×${atlas.height}, ${atlas.frames.length}张</span>
                </div>
            `).join('')}
        </div>
    `;
    stats.style.display = 'block';
}
