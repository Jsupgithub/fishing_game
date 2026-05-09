# Checklist - 鱼大小排序修复

- [ ] gameData.json: fishSizes 顺序正确 (small=0, medium=1, large=2, giant=3)
- [ ] gameData.json: 所有鱼类价格配置正确 (giant > large > medium > small)
- [ ] gameData.json: levelSizeProbabilities 概率数组顺序正确
- [ ] game.js: getSizeByLevel() 返回的 size 顺序正确
- [ ] game.js: updateBasketDisplay() 堆叠显示顺序正确
- [ ] game.js: updateCollectionDisplay() 图鉴显示顺序正确
