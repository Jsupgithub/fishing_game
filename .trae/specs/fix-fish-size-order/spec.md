# 摸鱼大师 - 钓鱼挂机游戏 v0.2 规范

## Why
修复现有钓鱼游戏中鱼大小排序错误（导致价格显示不合理），确保游戏数据一致性。

## What Changes
- 修复 fishSizes 顺序：`small(0) < medium(1) < large(2) < giant(3)`（价格递增）
- 调整 levelSizeProbabilities 中的概率分布以匹配新顺序
- 调整鱼肉价格配置，确保 giant > large

## Impact
- Affected specs: 游戏数据配置 (gameData.json)
- Affected code: game.js (getSizeByLevel, updateBasketDisplay)

## ADDED Requirements
无新增功能。

## MODIFIED Requirements
### Requirement: 鱼大小顺序
游戏中的鱼大小必须按以下顺序排列（价格从低到高）：
1. **小型 (small)** - 价格最低
2. **中型 (medium)** - 价格中等偏低
3. **大型 (large)** - 价格中等偏高
4. **巨型 (giant)** - 价格最高

## REMOVED Requirements
无移除功能。
