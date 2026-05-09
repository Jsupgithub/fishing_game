# 捕鱼陷阱功能实现计划

## 功能需求
- 自动触发（无需操作）
- 消耗鱼饵（每次1个）
- 仅获得材料+小型鱼
- 无WASD小游戏，自动成功
- 每个水域最多放4个陷阱
- 从商店购买或材料制作

## 机制细节
- **材料**：5分钟间隔收获
- **鱼**：随机5-45分钟间隔，跳过小游戏，直接获得小型鱼
- 陷阱只能捕获小型鱼（固定）

---

## 修改文件

### 1. gameData.json - 添加陷阱配置

```json
{
    "traps": {
        "basic": {
            "name": "简易陷阱",
            "price": 100,
            "craftMaterial": "porcelain",
            "craftCount": 3,
            "description": "自动捕获材料和小型鱼"
        }
    }
}
```

### 2. game.js - 添加陷阱逻辑

**新增属性**:
- `this.traps` - 陷阱状态数组 `{ location, type, nextHook, isMaterial }`
- `this.trapTimer` - 陷阱定时器

**新增方法**:
- `buyTrap(type)` - 购买陷阱
- `placeTrap(location)` - 放置陷阱（自动选择有空位的第一个陷阱）
- `checkTraps()` - 检查所有陷阱，触发收获
- `harvestTrap(trap)` - 收获陷阱成果
- `updateTrapsDisplay()` - 更新陷阱UI

**修改逻辑**:
- 在 `init()` 中初始化陷阱和启动检查定时器
- 在 `saveGame()` / `loadGame()` 中保存/加载陷阱状态
- 在 `updateUI()` 中更新陷阱显示
- 在底部栏添加陷阱状态显示

### 3. index.html - 添加陷阱UI

在钓鱼控制区添加：
```html
<div class="trap-status" id="trap-status"></div>
```

### 4. style.css - 添加陷阱样式

```css
.trap-status {
    margin-top: 10px;
    font-size: 12px;
    color: #666;
}
```

---

## 实现步骤

1. **gameData.json**: 添加陷阱配置
2. **game.js**: 添加陷阱相关属性和方法
3. **index.html**: 添加陷阱UI容器
4. **style.css**: 添加陷阱样式
5. **测试验证**

---

## 验证步骤

1. 购买陷阱后，陷阱出现在钓鱼区下方
2. 等待5分钟（或用debug模式加速），验证获得材料
3. 等待随机时间，验证自动获得小型鱼（无小游戏弹出）
4. 验证每个水域最多4个陷阱
5. 验证存档保存/加载正确
