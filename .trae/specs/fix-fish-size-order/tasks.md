# Tasks

## 任务列表

- [ ] Task 1: 修复 gameData.json 中 fishSizes 顺序
  - [ ] 将 large 的 order 改为 2，giant 的 order 改为 3
  - [ ] 调整鱼类价格配置，确保 giant > large

- [ ] Task 2: 调整 levelSizeProbabilities 概率分布
  - [ ] 重新排列概率数组顺序以匹配 fishSizes
  - [ ] 确保大型/巨型鱼随等级提升更容易出现

- [ ] Task 3: 验证代码逻辑一致性
  - [ ] 检查 game.js 中所有引用 fishSizes 的地方
  - [ ] 确保显示顺序和排序逻辑正确

## Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 1 和 Task 2
