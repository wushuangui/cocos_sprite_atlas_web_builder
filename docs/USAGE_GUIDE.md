# Cocos 图集生成器 - 使用指南

## 目录

1. [快速入门](#快速入门)
2. [上传模式](#上传模式)
3. [参数配置](#参数配置)
4. [导出与使用](#导出与使用)
5. [最佳实践](#最佳实践)
6. [常见问题](#常见问题)

---

## 快速入门

### 第一步：打开工具

双击 `index.html` 文件在浏览器中打开，或启动本地服务器访问。

### 第二步：选择上传模式

在页面顶部选择上传模式：
- **选择文件**：上传单个或多个图片文件
- **选择文件夹**：上传整个文件夹及其子文件夹

### 第三步：上传图片

- **点击上传区域**选择文件/文件夹
- 或**拖拽**文件/文件夹到上传区域

### 第四步：配置参数

根据需要调整：
- 图集名称
- 图片间距
- 最大宽度
- 打包算法
- 2的幂次方选项

### 第五步：生成图集

点击「生成图集」按钮，等待处理完成。

### 第六步：导出使用

点击「下载图集」导出PNG和PLIST文件。

---

## 上传模式

### 文件模式

适用于：
- 快速打包少量图片
- 测试和验证
- 临时图集制作

**特点**：
- 帧名称使用图片文件名
- 如：`button.png` → 帧名称为 `button`

**使用方法**：
1. 点击「选择文件」标签
2. 点击上传区域或拖拽图片
3. 支持多选（Ctrl/Cmd + 点击）

### 文件夹模式

适用于：
- 游戏资源打包
- 保持原有目录结构
- 大型项目管理

**特点**：
- 帧名称保留相对路径
- 如：`assets/ui/button.png` → 帧名称为 `ui/button`
- 支持递归读取子文件夹

**使用方法**：
1. 点击「选择文件夹」标签
2. 点击上传区域选择文件夹
3. 工具自动读取文件夹内所有图片

**路径计算规则**：
```
选择的文件夹：/game_assets/
    ├── ui/button.png
    ├── ui/panel.png
    └── characters/hero.png

生成的帧名称：
    - ui/button
    - ui/panel
    - characters/hero
```

---

## 参数配置

### 基础参数

#### 图集名称
- **说明**：生成的PNG和PLIST文件的名称
- **默认**：`sprite_atlas`
- **建议**：使用有意义的名称，如 `game_ui`、`characters`

#### 图片间距
- **说明**：图集中图片之间的间距（像素）
- **默认**：`2`
- **建议**：
  - 2-4像素：适合大多数情况
  - 0像素：最大空间利用率，可能有采样问题
  - 8+像素：需要特殊处理时

#### 最大宽度
- **说明**：图集的最大宽度（像素）
- **默认**：`2048`
- **建议**：
  - 2048：现代设备的推荐值
  - 1024：老旧设备兼容
  - 4096：高端设备，支持超大图集

### 高级参数

#### 打包算法

**MaxRectangles（推荐）**
- **特点**：业界最优算法，空间利用率最高
- **适用**：大量图片、复杂尺寸混合
- **优势**：
  - 最佳空间利用率
  - 智能位置选择
  - 自动旋转优化

**Shelf（传统）**
- **特点**：货架式排列，处理速度快
- **适用**：图片数量较少、尺寸相对规整
- **优势**：
  - 处理速度快
  - 实现简单稳定
  - 适合规则尺寸图片

#### 2的幂次方

**启用时**：
- 生成2的幂次方尺寸（2048×1024、1024×512等）
- 最大兼容性和纹理压缩支持
- 可能产生少量空白区域

**禁用时**：
- 生成原始尺寸（如1623×805）
- 更高的空间利用率
- 节省存储空间

**选择建议**：
- 游戏项目：启用（兼容性优先）
- Web项目：禁用（空间优先）
- 不确定：两种都试试

---

## 导出与使用

### 导出格式

#### ZIP压缩包
- **内容**：包含PNG和PLIST文件
- **适用**：一键下载，方便传输
- **使用**：解压后使用

#### 单独文件
- **内容**：分别下载PNG和PLIST
- **适用**：需要单独处理时
- **使用**：确保两文件同名且同目录

### 在Cocos Creator中使用

#### 1. 导入资源

将导出的PNG和PLIST文件拖入Cocos Creator资源管理器。

#### 2. 加载图集

```typescript
// 使用资源路径加载
const spriteAtlas = resources.get('path/to/atlas', SpriteAtlas);

// 或从属性检查器关联
@property(SpriteAtlas)
myAtlas: SpriteAtlas = null;
```

#### 3. 使用纹理

**文件模式示例**：
```typescript
// 帧名称为纯文件名
const spriteFrame = this.myAtlas.getSpriteFrame('button');
sprite.spriteFrame = spriteFrame;
```

**文件夹模式示例**：
```typescript
// 帧名称为相对路径
const spriteFrame = this.myAtlas.getSpriteFrame('ui/button');
sprite.spriteFrame = spriteFrame;

// 或使用完整路径
const heroFrame = this.myAtlas.getSpriteFrame('characters/hero');
```

#### 4. 完整示例

```typescript
import { _decorator, Component, Sprite, SpriteAtlas, resources } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AtlasExample')
export class AtlasExample extends Component {
    @property(SpriteAtlas)
    gameAtlas: SpriteAtlas = null;

    start() {
        // 获取按钮纹理
        const buttonSprite = this.node.getChildByName('Button').getComponent(Sprite);
        buttonSprite.spriteFrame = this.gameAtlas.getSpriteFrame('ui/button');

        // 获取角色纹理
        const heroSprite = this.node.getChildByName('Hero').getComponent(Sprite);
        heroSprite.spriteFrame = this.gameAtlas.getSpriteFrame('characters/hero');
    }
}
```

### 验证图集

使用工具内置的「图集纹理测试」功能：
1. 生成图集后，在测试面板输入帧名称
2. 点击「获取纹理」验证
3. 检查图片显示是否正确

---

## 最佳实践

### 资源组织

**推荐的文件夹结构**：
```
assets/
├── ui/           # UI元素
│   ├── buttons/
│   ├── panels/
│   └── icons/
├── characters/   # 角色
│   ├── player/
│   └── enemies/
├── items/        # 道具
│   ├── weapons/
│   └── consumables/
└── effects/      # 特效
    ├── particles/
    └── animations/
```

### 命名规范

**文件命名**：
- 使用小写字母
- 单词间用下划线连接
- 避免特殊字符

**示例**：
```
✅ button_start.png
✅ icon_settings.png
✅ character_hero_idle.png

❌ Button Start.png      (含空格)
❌ icon-settings.png      (使用连字符)
❌ character/hero.png     (使用斜杠)
```

### 性能优化

**图集大小**：
- 单个图集建议不超过 2048×2048
- 大图集加载耗时，考虑拆分

**图片数量**：
- 单个图集50-200张图片为佳
- 过多图片影响渲染效率

**图片尺寸**：
- 尽量使用2的幂次方尺寸
- 避免过大（>1024）和过小（<32）混用

### 打包策略

**按功能分组**：
```
ui.atlas      # UI相关
characters.atlas  # 角色相关
effects.atlas     # 特效相关
```

**按场景分组**：
```
main_menu.atlas   # 主菜单
level_1.atlas     # 关卡1
level_2.atlas     # 关卡2
```

---

## 常见问题

### Q1: 文件夹模式下路径不正确？

**检查**：
1. 确认选择了正确的根文件夹
2. 查看PLIST文件中的帧名称
3. 检查路径分隔符（正斜杠 `/`）

**解决**：
- 工具会自动计算共同父目录
- 如路径仍不正确，尝试选择更上层的文件夹

### Q2: 图片加载顺序不对？

**原因**：
- 文件夹模式下读取顺序由浏览器决定
- 与文件系统排序可能不同

**解决**：
- 这不影响最终图集效果
- 如需特定顺序，请使用文件模式手动选择

### Q3: 生成的图集太大？

**优化方案**：
1. 减小最大宽度（如2048→1024）
2. 关闭2的幂次方选项
3. 减少图片间距
4. 拆分图片到多个图集

### Q4: 某些图片显示不出来？

**排查步骤**：
1. 使用「图集纹理测试」验证
2. 检查PLIST中帧名称是否正确
3. 确认代码中使用的名称与PLIST一致

### Q5: 如何更新已有图集？

**步骤**：
1. 重新选择文件夹生成图集
2. 使用相同名称导出
3. 在Cocos Creator中重新导入
4. 检查所有引用是否正常工作

### Q6: 支持哪些浏览器？

**支持列表**：
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**注意**：文件夹模式需要浏览器支持 `webkitdirectory` 属性。

---

## 技术说明

### PLIST格式

生成的PLIST文件遵循Cocos2d-x/Cocos Creator标准格式：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>frames</key>
  <dict>
    <key>ui/button.png</key>
    <dict>
      <key>frame</key>
      <string>{{0,0},{64,64}}</string>
      <key>offset</key>
      <string>{0,0}</string>
      <key>rotated</key>
      <false/>
      <key>sourceColorRect</key>
      <string>{{0,0},{64,64}}</string>
      <key>sourceSize</key>
      <string>{64,64}</string>
    </dict>
  </dict>
  <key>metadata</key>
  <dict>
    <key>format</key>
    <integer>2</integer>
    <key>size</key>
    <string>{512,512}</string>
    <key>textureFileName</key>
    <string>atlas.png</string>
  </dict>
</dict>
</plist>
```

### 路径处理

**路径计算示例**：
```
文件路径：
  /project/assets/ui/button.png
  /project/assets/ui/panel.png
  /project/assets/characters/hero.png

计算的共同父目录：
  /project/assets/

生成的相对路径：
  ui/button.png
  ui/panel.png
  characters/hero.png
```

---

**文档版本**：v3.5
**最后更新**：2025年
