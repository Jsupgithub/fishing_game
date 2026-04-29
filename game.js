class Game {
    constructor() {
        this.gameData = null;
        this.gold = 100;
        this.fishingLevel = 1;
        this.fishingExp = 0;
        this.currentRod = 'bamboo';
        this.ownedRods = ['bamboo'];
        this.currentBait = 'basic';
        this.baitCount = 10;
        this.currentLocation = 'silent-bay';
        this.basket = [];
        this.materials = {};
        this.collection = {};
        this.isFishing = false;
        this.nextHookTime = 0;
        this.hookTimer = null;
        this.debugMode = false;
        this.logs = [];
        this.eventEffects = {};
        this.nextFishForceSmall = false;
        this.isMinigameActive = false;
        this.minigameSequence = [];
        this.minigameIndex = 0;
        this.minigameStartTime = 0;
        this.minigameSuccessBonus = 0;
        this.feedingHeat = 0;
        this.feedingCooldown = false;
        this.totalFeedingReduction = 0;
        this.feedingDecayTimer = null;
        this.statusUpdateTimer = null;
        this.hookCountdownTimer = null;
        this.totalHookTime = 0;
        this.totalElapsedTime = 0;
        this.lastHookCheck = 0;
        
        this.init();
    }

    async init() {
        try {
            await this.loadGameData();
            this.migrateOldData();
            this.initMaterials();
            this.initCollection();
            this.loadGame();
            this.updateUI();
            this.setupEventListeners();
            this.checkDebugMode();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            document.getElementById('fishing-status').textContent = '加载失败，请刷新页面';
        }
    }

    migrateOldData() {
        const saved = localStorage.getItem('fishing-game-data');
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            const hasOldFishTypes = data.basket && data.basket.some(fish => 
                ['electric', 'fire'].includes(fish.type)
            );
            
            if (hasOldFishTypes) {
                localStorage.removeItem('fishing-game-data');
                console.log('Removed old game data with incompatible fish types');
            }
        } catch (error) {
            console.warn('Error checking for old data:', error);
        }
    }

    async loadGameData() {
        const response = await fetch('gameData.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.gameData = await response.json();
    }

    initMaterials() {
        Object.keys(this.gameData.locations).forEach(key => {
            const loc = this.gameData.locations[key];
            this.materials[loc.material] = this.materials[loc.material] || 0;
        });
    }

    initCollection() {
        if (!this.gameData || !this.gameData.fishTypes) {
            console.error('gameData not loaded properly');
            return;
        }
        
        Object.keys(this.gameData.fishTypes).forEach(type => {
            const fish = this.gameData.fishTypes[type];
            if (!fish) return;
            
            const sizes = fish.isRare ? ['small'] : (this.gameData.fishSizes ? Object.keys(this.gameData.fishSizes) : ['small', 'medium', 'large', 'giant']);
            sizes.forEach(size => {
                this.collection[`${type}-${size}`] = { normal: false, shiny: false };
            });
        });
    }

    loadGame() {
        const saved = localStorage.getItem('fishing-game-data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                const validRods = Object.keys(this.gameData.rods);
                const validBaits = Object.keys(this.gameData.baits);
                const validLocations = Object.keys(this.gameData.locations);
                const validFishTypes = Object.keys(this.gameData.fishTypes);
                
                this.gold = data.gold || this.gold;
                this.fishingLevel = data.fishingLevel || this.fishingLevel;
                this.fishingExp = data.fishingExp || this.fishingExp;
                
                this.currentRod = validRods.includes(data.currentRod) ? data.currentRod : this.currentRod;
                this.ownedRods = data.ownedRods && Array.isArray(data.ownedRods) 
                    ? data.ownedRods.filter(r => validRods.includes(r)) 
                    : ['bamboo'];
                if (!this.ownedRods.includes(this.currentRod)) {
                    this.ownedRods.push(this.currentRod);
                }
                this.currentBait = validBaits.includes(data.currentBait) ? data.currentBait : this.currentBait;
                this.baitCount = data.baitCount || this.baitCount;
                this.currentLocation = validLocations.includes(data.currentLocation) ? data.currentLocation : this.currentLocation;
                
                this.basket = this.validateBasket(data.basket || []);
                this.materials = { ...this.materials, ...this.validateMaterials(data.materials || {}) };
                this.collection = { ...this.collection, ...this.validateCollection(data.collection || {}) };
                this.eventEffects = data.eventEffects || this.eventEffects;
                this.feedingHeat = data.feedingHeat || 0;
                this.feedingCooldown = false;
            } catch (error) {
                console.warn('Failed to load saved game data, using defaults:', error);
            }
        }
    }

    validateBasket(basket) {
        const validFishTypes = Object.keys(this.gameData.fishTypes);
        const validSizes = Object.keys(this.gameData.fishSizes);
        
        return basket.filter(fish => {
            if (!validFishTypes.includes(fish.type)) return false;
            const fishType = this.gameData.fishTypes[fish.type];
            const allowedSizes = fishType.isRare ? ['small'] : validSizes;
            return allowedSizes.includes(fish.size);
        });
    }

    validateMaterials(materials) {
        const validMaterials = ['battery', 'heat-coil', 'void-dust'];
        const result = {};
        Object.entries(materials).forEach(([key, value]) => {
            if (validMaterials.includes(key)) {
                result[key] = value;
            }
        });
        return result;
    }

    validateCollection(collection) {
        const result = {};
        Object.entries(collection).forEach(([key, value]) => {
            const [type, size] = key.split('-');
            if (this.gameData.fishTypes[type]) {
                const fishType = this.gameData.fishTypes[type];
                const validSizes = fishType.isRare ? ['small'] : Object.keys(this.gameData.fishSizes);
                if (validSizes.includes(size)) {
                    result[key] = value;
                }
            }
        });
        return result;
    }

    saveGame() {
        const data = {
            gold: this.gold,
            fishingLevel: this.fishingLevel,
            fishingExp: this.fishingExp,
            currentRod: this.currentRod,
            ownedRods: this.ownedRods,
            currentBait: this.currentBait,
            baitCount: this.baitCount,
            currentLocation: this.currentLocation,
            basket: this.basket,
            materials: this.materials,
            collection: this.collection,
            eventEffects: this.eventEffects,
            feedingHeat: this.feedingHeat > 0 && !this.feedingCooldown ? this.feedingHeat : 0
        };
        localStorage.setItem('fishing-game-data', JSON.stringify(data));
    }

    setupEventListeners() {
        document.getElementById('fishing-toggle').addEventListener('click', () => this.toggleFishing());
        document.getElementById('feeding-btn').addEventListener('click', () => this.doFeeding());
        document.getElementById('debug-btn').addEventListener('click', () => this.debugHook());
        document.getElementById('location-select').addEventListener('change', (e) => {
            const oldLocation = this.currentLocation;
            this.currentLocation = e.target.value;
            
            if (this.isFishing) {
                this.stopFishing();
            }
            
            const locationName = this.gameData.locations[this.currentLocation].name;
            this.addLog(`🌊 已来到【${locationName}】`, 'fish');
            
            this.updateUI();
        });

        document.getElementById('btn-basket').addEventListener('click', () => this.openModal('basket-modal'));
        document.getElementById('btn-shop').addEventListener('click', () => this.openModal('shop-modal'));
        document.getElementById('btn-craft').addEventListener('click', () => this.openModal('craft-modal'));
        document.getElementById('btn-collection').addEventListener('click', () => this.openModal('collection-modal'));
        document.getElementById('btn-save').addEventListener('click', () => this.openModal('save-modal'));

        document.getElementById('modal-overlay').addEventListener('click', () => this.closeAllModals());
    }

    checkDebugMode() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('debug')) {
            this.debugMode = true;
            document.getElementById('debug-btn').style.display = 'inline-block';
        }
    }

    toggleFishing() {
        if (this.isFishing) {
            this.stopFishing();
        } else {
            this.startFishing();
        }
    }

    startFishing() {
        if (this.basket.length >= this.gameData.basketCapacity) {
            this.addLog('鱼篓已满，请先清理！', 'error');
            return;
        }
        
        if (this.baitCount <= 0) {
            this.addLog('⚠️ 没有鱼饵，上鱼时间将翻倍！', 'error');
        }
        
        this.isFishing = true;
        this.totalFeedingReduction = 0;
        this.feedingHeat = 0;
        this.totalElapsedTime = 0;
        
        const isFish = Math.random() < 0.7;
        const baseMinutes = isFish ? (5 + Math.sqrt(Math.random()) * 40) : 5;
        const baseMs = baseMinutes * 60 * 1000;
        
        let adjustedTime = baseMs;
        if (this.baitCount <= 0) {
            adjustedTime *= 2;
        }
        
        this.totalHookTime = adjustedTime;
        this.lastHookCheck = Date.now();
        this.updateRemainingTime();
        
        if (this.hookCountdownTimer) {
            clearInterval(this.hookCountdownTimer);
        }
        this.hookCountdownTimer = setInterval(() => {
            if (this.isFishing) {
                this.updateRemainingTime();
            }
        }, 1000);
        
        document.getElementById('fishing-toggle').textContent = '停止钓鱼';
        document.getElementById('fishing-toggle').classList.add('active');
        this.updateUI();
    }
    
    updateRemainingTime() {
        if (!this.isFishing) return;
        
        const now = Date.now();
        const elapsedSinceLastCheck = now - this.lastHookCheck;
        this.lastHookCheck = now;
        
        this.totalElapsedTime = (this.totalElapsedTime || 0) + elapsedSinceLastCheck;
        
        const effectiveTotalTime = this.totalHookTime - (this.totalFeedingReduction * 60 * 1000);
        this.remainingHookTime = Math.max(0, effectiveTotalTime - this.totalElapsedTime);
        
        const minutes = Math.ceil(this.remainingHookTime / 60000);
        document.getElementById('fishing-status').textContent = `正在钓鱼... (预计${minutes}分钟)`;
        
        if (this.feedingHeat > 0 && !this.feedingCooldown) {
            this.feedingHeat = Math.max(0, this.feedingHeat - 1);
            if (this.feedingHeat === 0) {
                clearInterval(this.feedingDecayTimer);
                this.feedingDecayTimer = null;
            }
            this.updateUI();
        }
        
        if (this.remainingHookTime <= 0) {
            clearInterval(this.hookCountdownTimer);
            this.hookCountdownTimer = null;
            this.executeHook();
        }
    }

    stopFishing() {
        this.isFishing = false;
        document.getElementById('fishing-toggle').textContent = '开始钓鱼';
        document.getElementById('fishing-toggle').classList.remove('active');
        document.getElementById('fishing-status').textContent = '未钓鱼';
        
        if (this.hookTimer) {
            clearTimeout(this.hookTimer);
            this.hookTimer = null;
        }
        
        if (this.hookCountdownTimer) {
            clearInterval(this.hookCountdownTimer);
            this.hookCountdownTimer = null;
        }
        
        if (this.feedingDecayTimer) {
            clearInterval(this.feedingDecayTimer);
            this.feedingDecayTimer = null;
        }
        
        if (this.statusUpdateTimer) {
            clearInterval(this.statusUpdateTimer);
            this.statusUpdateTimer = null;
        }
    }

    executeHook() {
        if (!this.isFishing) return;
        
        if (this.checkEvent('dragon-rage')) {
            const hasBait = this.baitCount > 0;
            if (hasBait) {
                this.baitCount--;
                this.checkBaitEmpty();
            }
            this.addLog('⚠️ 龙王的愤怒！脱钩了，损失鱼饵，下次必为小型鱼', 'error');
            this.nextFishForceSmall = true;
            this.updateUI();
            if (this.isFishing && this.basket.length < this.gameData.basketCapacity) {
                this.startFishing();
            }
            this.saveGame();
            return;
        }
        
        const roll = Math.random();
        if (roll < 0.7) {
            this.startMinigame();
            this.sendDesktopNotification('🎣 上钩了！', '快按顺序输入WASD按键来钓鱼！');
        } else {
            const hasBait = this.baitCount > 0;
            if (hasBait) {
                this.baitCount--;
                this.checkBaitEmpty();
            }
            this.getMaterial();
            this.updateUI();
            
            if (this.isFishing && this.basket.length < this.gameData.basketCapacity) {
                this.startFishing();
            } else if (this.basket.length >= this.gameData.basketCapacity) {
                this.addLog('鱼篓已满，自动停止钓鱼', 'error');
                this.stopFishing();
            }
            
            this.saveGame();
        }
    }

    startMinigame() {
        this.isMinigameActive = true;
        this.minigameSequence = this.generateSequence();
        this.minigameIndex = 0;
        this.minigameStartTime = Date.now();
        this.minigameSuccessBonus = 0;
        
        this.showMinigame();
        
        document.removeEventListener('keydown', this.handleMinigameKey);
        this.minigameKeyHandler = this.handleMinigameKey.bind(this);
        document.addEventListener('keydown', this.minigameKeyHandler);
        
        this.minigameTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.minigameStartTime) / 1000);
            const remaining = Math.max(0, 30 - elapsed);
            document.getElementById('minigame-time').textContent = remaining;
            
            if (remaining <= 0) {
                this.endMinigame(false);
            }
        }, 1000);
    }

    generateSequence() {
        const keys = ['W', 'A', 'S', 'D'];
        const sequence = [];
        for (let i = 0; i < 5; i++) {
            sequence.push(keys[Math.floor(Math.random() * keys.length)]);
        }
        return sequence;
    }

    showMinigame() {
        const overlay = document.getElementById('minigame-overlay');
        const sequenceDiv = document.getElementById('minigame-sequence');
        const hintSpan = document.getElementById('minigame-hint');
        
        overlay.style.display = 'flex';
        
        sequenceDiv.innerHTML = '';
        this.minigameSequence.forEach((key, index) => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'minigame-key';
            keyDiv.textContent = key;
            keyDiv.id = `minigame-key-${index}`;
            sequenceDiv.appendChild(keyDiv);
        });
        
        hintSpan.textContent = this.minigameSequence.join(' → ');
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('minigame-result').textContent = '';
    }

    handleMinigameKey(e) {
        if (!this.isMinigameActive) return;
        
        const key = e.key.toUpperCase();
        const expectedKey = this.minigameSequence[this.minigameIndex];
        
        if (key === expectedKey) {
            document.getElementById(`minigame-key-${this.minigameIndex}`).classList.add('completed');
            this.minigameIndex++;
            
            const progress = (this.minigameIndex / this.minigameSequence.length) * 100;
            document.getElementById('progress-fill').style.width = `${progress}%`;
            
            if (this.minigameIndex >= this.minigameSequence.length) {
                const elapsed = (Date.now() - this.minigameStartTime) / 1000;
                if (elapsed <= 5) {
                    this.minigameSuccessBonus = 0.02;
                    this.endMinigame(true, true);
                } else if (elapsed <= 30) {
                    this.endMinigame(true, false);
                }
            }
        } else {
            document.getElementById(`minigame-key-${this.minigameIndex}`).classList.add('wrong');
            setTimeout(() => {
                this.endMinigame(false);
            }, 500);
        }
    }

    endMinigame(success, fast = false) {
        this.isMinigameActive = false;
        
        clearInterval(this.minigameTimer);
        document.removeEventListener('keydown', this.minigameKeyHandler);
        
        const overlay = document.getElementById('minigame-overlay');
        const resultDiv = document.getElementById('minigame-result');
        
        if (success) {
            if (fast) {
                resultDiv.textContent = '⚡ 快速成功！闪耀概率+2%，不消耗鱼饵！';
                resultDiv.className = 'minigame-result fast';
            } else {
                resultDiv.textContent = '✅ 成功！不消耗鱼饵！';
                resultDiv.className = 'minigame-result success';
            }
            
            this.catchFishWithBonus();
            
            setTimeout(() => {
                overlay.style.display = 'none';
                this.updateUI();
                
                if (this.isFishing && this.basket.length < this.gameData.basketCapacity) {
                    this.startFishing();
                } else if (this.basket.length >= this.gameData.basketCapacity) {
                    this.addLog('鱼篓已满，自动停止钓鱼', 'error');
                    this.stopFishing();
                }
                
                this.saveGame();
            }, 1500);
        } else {
            resultDiv.textContent = '❌ 失败！消耗鱼饵';
            resultDiv.className = 'minigame-result fail';
            this.addLog('很遗憾，鱼跑了 T_T', 'error');
            
            const hasBait = this.baitCount > 0;
            if (hasBait) {
                this.baitCount--;
            }
            
            setTimeout(() => {
                overlay.style.display = 'none';
                this.updateUI();
                
                if (this.isFishing && this.basket.length < this.gameData.basketCapacity) {
                    this.startFishing();
                }
                
                this.saveGame();
            }, 1500);
        }
        
        this.minigameSuccessBonus = 0;
    }

    catchFishWithBonus() {
        const location = this.gameData.locations[this.currentLocation];
        let fishType = this.weightedRandom(location.fishProbabilities);
        
        const bait = this.gameData.baits[this.currentBait];
        if (bait.effect === 'target-fish') {
            if (Math.random() < bait.value) {
                fishType = bait.target;
            }
        }
        
        if (this.checkEvent('void-rift')) {
            fishType = 'void';
            this.addLog('🌀 虚空裂缝出现！鱼种强制变为虚空鳕', 'shiny');
        }
        
        let size = this.getSizeByLevel();
        
        if (this.nextFishForceSmall) {
            size = 'small';
            this.nextFishForceSmall = false;
        }
        
        if (fishType === 'void' && size === 'small') {
            size = 'medium';
        }
        
        const fish = this.gameData.fishTypes[fishType];
        if (fish.isRare) {
            size = 'small';
        }
        
        let shinyProb = this.gameData.shinyBaseProb + this.minigameSuccessBonus;
        const rod = this.gameData.rods[this.currentRod];
        if (rod.effect === 'shiny') {
            shinyProb += rod.value;
        }
        if (bait.effect === 'shiny') {
            shinyProb += bait.value;
        }
        shinyProb = Math.min(shinyProb, 0.06);
        const isShiny = Math.random() < shinyProb;
        
        const fishData = {
            type: fishType,
            size: size,
            shiny: isShiny,
            timestamp: Date.now()
        };
        
        let copyFish = null;
        if (this.checkEvent('data-overflow')) {
            copyFish = { ...fishData, shiny: false };
            this.addLog('💥 数据溢出！获得两条相同的鱼', 'shiny');
        }
        
        this.basket.push(fishData);
        if (copyFish) {
            this.basket.push(copyFish);
        }
        
        const fishTypeName = fish.name;
        const sizeName = this.gameData.fishSizes[size].name;
        const shinyText = isShiny ? '✨炫彩' : '';
        
        const logType = fish.isRare || isShiny ? 'shiny' : 'fish';
        this.addLog(`钓到一条${shinyText}${sizeName}${fishTypeName}，已放入鱼篓。`, logType);
        
        this.addExp(10);
        
        const key = `${fishType}-${size}`;
        if (!this.collection[key]) {
            this.collection[key] = { normal: false, shiny: false };
        }
        if (isShiny) {
            this.collection[key].shiny = true;
        } else {
            this.collection[key].normal = true;
        }
    }

    doFeeding() {
        if (this.feedingCooldown) {
            this.addLog('⏰ 打窝正在冷却中...', 'error');
            return;
        }
        
        this.feedingHeat += 20;
        
        if (this.feedingHeat >= 100) {
            this.feedingHeat = 100;
            this.feedingCooldown = true;
            this.addLog('🔥 饵料空了！正在补充…', 'error');
            
            setTimeout(() => {
                this.feedingHeat = 0;
                this.feedingCooldown = false;
                this.updateUI();
                this.addLog('✅ 打窝冷却完成，可以继续使用', 'fish');
            }, 10000);
        } else {
            this.totalFeedingReduction += 1;
            this.addLog(`🐟 打窝成功！饵料剩余${100 - this.feedingHeat}%，已缩短上鱼时间1分钟`, 'fish');
        }
        
        this.updateUI();
    }

    
    checkBaitEmpty() {
        if (this.baitCount <= 0) {
            this.addLog('⚠️ 鱼饵用完了！上鱼时间将翻倍！', 'error');
        }
    }

    sendDesktopNotification(title, body) {
        if (!('Notification' in window)) {
            return;
        }
        
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎣</text></svg>'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, {
                        body: body,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎣</text></svg>'
                    });
                }
            });
        }
    }

    checkEvent(eventId) {
        const event = this.gameData.events.find(e => e.id === eventId);
        return event && Math.random() < event.probability;
    }

    debugHook() {
        if (!this.isFishing) {
            this.isFishing = true;
            document.getElementById('fishing-toggle').textContent = '停止钓鱼';
            document.getElementById('fishing-toggle').classList.add('active');
            document.getElementById('fishing-status').textContent = '正在钓鱼...';
        }
        if (this.hookTimer) {
            clearTimeout(this.hookTimer);
        }
        this.executeHook();
    }

    catchFish() {
        const location = this.gameData.locations[this.currentLocation];
        let fishType = this.weightedRandom(location.fishProbabilities);
        
        const bait = this.gameData.baits[this.currentBait];
        if (bait.effect === 'target-fish') {
            if (Math.random() < bait.value) {
                fishType = bait.target;
            }
        }
        
        if (this.checkEvent('void-rift')) {
            fishType = 'void';
            this.addLog('🌀 虚空裂缝出现！鱼种强制变为虚空鳕', 'shiny');
        }
        
        let size = this.getSizeByLevel();
        
        if (this.nextFishForceSmall) {
            size = 'small';
            this.nextFishForceSmall = false;
        }
        
        if (fishType === 'void' && size === 'small') {
            size = 'medium';
        }
        
        const fish = this.gameData.fishTypes[fishType];
        if (fish.isRare) {
            size = 'small';
        }
        
        let shinyProb = this.gameData.shinyBaseProb;
        const rod = this.gameData.rods[this.currentRod];
        if (rod.effect === 'shiny') {
            shinyProb += rod.value;
        }
        if (bait.effect === 'shiny') {
            shinyProb += bait.value;
        }
        shinyProb = Math.min(shinyProb, 0.06);
        const isShiny = Math.random() < shinyProb;
        
        const fishData = {
            type: fishType,
            size: size,
            shiny: isShiny,
            timestamp: Date.now()
        };
        
        let copyFish = null;
        if (this.checkEvent('data-overflow')) {
            copyFish = { ...fishData, shiny: false };
            this.addLog('💥 数据溢出！获得两条相同的鱼', 'shiny');
        }
        
        this.basket.push(fishData);
        if (copyFish) {
            this.basket.push(copyFish);
        }
        
        const fishTypeName = fish.name;
        const sizeName = this.gameData.fishSizes[size].name;
        const shinyText = isShiny ? '✨炫彩' : '';
        
        const logType = fish.isRare || isShiny ? 'shiny' : 'fish';
        this.addLog(`钓到一条${shinyText}${sizeName}${fishTypeName}，已放入鱼篓。`, logType);
        
        this.addExp(10);
        
        const key = `${fishType}-${size}`;
        if (!this.collection[key]) {
            this.collection[key] = { normal: false, shiny: false };
        }
        if (isShiny) {
            this.collection[key].shiny = true;
        } else {
            this.collection[key].normal = true;
        }
    }

    getSizeByLevel() {
        const levels = this.gameData.levelSizeProbabilities.levels;
        const probs = this.gameData.levelSizeProbabilities.probabilities;
        
        let idx = 0;
        for (let i = 0; i < levels.length - 1; i++) {
            if (this.fishingLevel >= levels[i] && this.fishingLevel <= levels[i + 1]) {
                idx = i;
                break;
            }
        }
        
        const levelStart = levels[idx];
        const levelEnd = levels[idx + 1];
        const t = (this.fishingLevel - levelStart) / (levelEnd - levelStart);
        
        const probStart = probs[idx];
        const probEnd = probs[idx + 1];
        
        const currentProbs = {};
        Object.keys(probStart).forEach(key => {
            currentProbs[key] = probStart[key] + (probEnd[key] - probStart[key]) * t;
        });
        
        return this.weightedRandom(currentProbs);
    }

    addExp(exp) {
        this.fishingExp += exp;
        const expTable = this.gameData.experienceTable;
        
        while (this.fishingLevel < expTable.length && this.fishingExp >= expTable[this.fishingLevel - 1]) {
            this.fishingLevel++;
            this.addLog(`🎉 钓鱼等级提升到 ${this.fishingLevel} 级！`, 'shiny');
        }
    }

    getMaterial() {
        const location = this.gameData.locations[this.currentLocation];
        this.materials[location.material] = (this.materials[location.material] || 0) + 1;
        this.addLog(`获得${location.materialIcon}${location.materialName}×1`, 'material');
    }

    weightedRandom(probabilities) {
        const rand = Math.random();
        let cumulative = 0;
        for (const [key, prob] of Object.entries(probabilities)) {
            cumulative += prob;
            if (rand < cumulative) {
                return key;
            }
        }
        return Object.keys(probabilities)[0];
    }

    calculatePrice(fish) {
        const fishType = this.gameData.fishTypes[fish.type];
        let price = fishType.prices[fish.size] || 0;
        if (fish.shiny) {
            price *= 5;
        }
        return price;
    }

    sellFish(index) {
        const fish = this.basket[index];
        const price = this.calculatePrice(fish);
        this.gold += price;
        this.basket.splice(index, 1);
        this.updateUI();
        this.saveGame();
        return price;
    }

    sellAllFish() {
        let total = 0;
        this.basket.forEach(fish => {
            total += this.calculatePrice(fish);
        });
        this.gold += total;
        this.basket = [];
        this.addLog(`出售所有渔获，获得 ${total} 金币`, 'fish');
        this.updateUI();
        this.saveGame();
    }

    addLog(message, type = 'normal') {
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        this.logs.unshift({ message, type, time });
        
        if (this.logs.length > 8) {
            this.logs.pop();
        }
        
        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const container = document.getElementById('log-content');
        container.innerHTML = '';
        
        this.logs.forEach(log => {
            const div = document.createElement('div');
            div.className = `log-${log.type}`;
            div.innerHTML = `[${log.time}] ${log.message}`;
            container.appendChild(div);
        });
    }

    updateUI() {
        if (!this.gameData) return;
        
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('level').textContent = this.fishingLevel;
        
        const rod = this.gameData.rods[this.currentRod];
        document.getElementById('rod-name').textContent = rod ? rod.name : '竹竿';
        
        const bait = this.gameData.baits[this.currentBait];
        document.getElementById('bait-name').textContent = bait ? bait.name : '基础鱼饵';
        
        document.getElementById('bait-count').textContent = `×${this.baitCount}`;
        document.getElementById('location-select').value = this.currentLocation;
        
        document.getElementById('basket-used').textContent = this.basket.length;
        document.getElementById('basket-max').textContent = this.gameData.basketCapacity;
        
        const feedingBtn = document.getElementById('feeding-btn');
        const feedingFill = feedingBtn.querySelector('.feeding-fill');
        
        if (this.feedingHeat > 0) {
            feedingFill.style.width = `${this.feedingHeat}%`;
            feedingBtn.classList.add('has-heat');
        } else {
            feedingFill.style.width = '0%';
            feedingBtn.classList.remove('has-heat');
        }
        feedingBtn.disabled = this.feedingCooldown;
        
        this.updateBasketDisplay();
        this.updateShopDisplay();
        this.updateCraftDisplay();
        this.updateCollectionDisplay();
    }

    updateBasketDisplay() {
        const container = document.getElementById('basket-content');
        if (this.basket.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">鱼篓是空的</p>';
            return;
        }
        
        const grouped = {};
        this.basket.forEach((fish, index) => {
            const key = `${fish.type}-${fish.size}-${fish.shiny}`;
            if (!grouped[key]) {
                grouped[key] = { fish: fish, count: 0, indices: [] };
            }
            grouped[key].count++;
            grouped[key].indices.push(index);
        });
        
        container.innerHTML = '';
        Object.values(grouped).forEach(group => {
            const fish = group.fish;
            const fishType = this.gameData.fishTypes[fish.type];
            const size = this.gameData.fishSizes[fish.size];
            const price = this.calculatePrice(fish) * group.count;
            const shinyClass = fish.shiny ? 'log-shiny' : '';
            
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="item-info">
                    <div class="item-name ${shinyClass}">${fish.shiny ? '✨' : ''}${fishType.icon} ${size.name}${fishType.name} ×${group.count}</div>
                    <div class="item-desc">${fish.shiny ? '炫彩闪耀 · ' : ''}售价: ${price} 金币</div>
                </div>
                <div class="item-actions">
                    <button class="btn-sell" onclick="game.sellGroupedFish(${JSON.stringify(group.indices)});">出售</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    sellGroupedFish(indices) {
        let total = 0;
        const sortedIndices = [...indices].sort((a, b) => b - a);
        sortedIndices.forEach(index => {
            total += this.calculatePrice(this.basket[index]);
            this.basket.splice(index, 1);
        });
        this.gold += total;
        this.updateUI();
        this.saveGame();
    }

    updateShopDisplay() {
        const rodsContainer = document.getElementById('shop-rods');
        rodsContainer.innerHTML = '';
        
        Object.entries(this.gameData.rods).forEach(([id, rod]) => {
            const owned = this.ownedRods.includes(id);
            const equipped = this.currentRod === id;
            const canBuy = this.gold >= rod.price && !owned;
            
            const card = document.createElement('div');
            card.className = 'item-card';
            let actionButton = '';
            if (equipped) {
                actionButton = '<button class="btn-sell" disabled style="background: #666;">已装备</button>';
            } else if (owned) {
                actionButton = `<button class="btn-buy" onclick="game.equipRod('${id}');">装备</button>`;
            } else if (canBuy) {
                actionButton = `<button class="btn-buy" onclick="game.buyRod('${id}');">购买</button>`;
            }
            
            card.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${rod.name} ${equipped ? '(已装备)' : ''}</div>
                    <div class="item-desc">${rod.description}</div>
                    ${!owned ? `<div class="item-price">价格: ${rod.price} 金币</div>` : ''}
                </div>
                <div class="item-actions">
                    ${actionButton}
                </div>
            `;
            rodsContainer.appendChild(card);
        });

        const baitsContainer = document.getElementById('shop-baits');
        baitsContainer.innerHTML = '';
        
        const basicBait = this.gameData.baits['basic'];
        const canBuy = this.gold >= basicBait.price;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-info">
                <div class="item-name">${basicBait.name}</div>
                <div class="item-desc">${basicBait.description}</div>
            </div>
            <div class="item-actions">
                ${canBuy ? `<button class="btn-buy" onclick="game.buyBait('basic');">${basicBait.price}💰</button>` : ''}
            </div>
        `;
        baitsContainer.appendChild(card);
    }

    buyRod(rodId) {
        const rod = this.gameData.rods[rodId];
        if (this.gold >= rod.price) {
            this.gold -= rod.price;
            this.ownedRods.push(rodId);
            this.currentRod = rodId;
            this.addLog(`购买并装备了${rod.name}`, 'fish');
            this.updateUI();
            this.saveGame();
        }
    }

    equipRod(rodId) {
        const rod = this.gameData.rods[rodId];
        if (this.ownedRods.includes(rodId)) {
            this.currentRod = rodId;
            this.addLog(`装备了${rod.name}`, 'fish');
            this.updateUI();
            this.saveGame();
        }
    }

    buyBait(baitId) {
        const bait = this.gameData.baits[baitId];
        if (this.gold >= bait.price) {
            this.gold -= bait.price;
            if (this.currentBait === baitId) {
                this.baitCount++;
            } else {
                this.currentBait = baitId;
                this.baitCount = 1;
            }
            this.addLog(`购买了${bait.name}`, 'fish');
            this.updateUI();
            this.saveGame();
        }
    }

    updateCraftDisplay() {
        const materialsList = document.getElementById('materials-list');
        materialsList.innerHTML = '';
        
        Object.entries(this.materials).forEach(([id, count]) => {
            let matInfo = { name: id, icon: '📦' };
            Object.values(this.gameData.locations).forEach(loc => {
                if (loc.material === id) {
                    matInfo = { name: loc.materialName, icon: loc.materialIcon };
                }
            });
            
            const item = document.createElement('div');
            item.className = 'material-item';
            item.innerHTML = `
                <span>${matInfo.icon} ${matInfo.name}</span>
                <span>×${count}</span>
            `;
            materialsList.appendChild(item);
        });

        const recipesList = document.getElementById('recipes-list');
        recipesList.innerHTML = '';
        
        Object.entries(this.gameData.recipes).forEach(([id, recipe]) => {
            const bait = this.gameData.baits[recipe.baitId];
            const canCraft = this.checkRecipeMaterials(recipe);
            
            const item = document.createElement('div');
            item.className = `recipe-item ${canCraft ? '' : 'disabled'}`;
            item.innerHTML = `
                <div class="recipe-name">${bait.name} ×${recipe.craftCount}</div>
                <div class="recipe-materials">
                    ${this.getRecipeMaterialText(recipe)}
                </div>
                ${canCraft ? `<button class="btn btn-craft" onclick="game.craftBait('${id}');">合成</button>` : ''}
            `;
            recipesList.appendChild(item);
        });
    }

    getRecipeMaterialText(recipe) {
        return Object.entries(recipe.materials).map(([matId, matCount]) => {
            let matInfo = { name: matId, icon: '📦' };
            Object.values(this.gameData.locations).forEach(loc => {
                if (loc.material === matId) {
                    matInfo = { name: loc.materialName, icon: loc.materialIcon };
                }
            });
            const owned = this.materials[matId] || 0;
            return `${matInfo.icon} ${matInfo.name}: ${owned}/${matCount}`;
        }).join(' · ');
    }

    checkRecipeMaterials(recipe) {
        for (const [matId, count] of Object.entries(recipe.materials)) {
            if (matId === 'any') {
                const total = Object.values(this.materials).reduce((a, b) => a + b, 0);
                if (total < count) return false;
            } else {
                if ((this.materials[matId] || 0) < count) {
                    return false;
                }
            }
        }
        return true;
    }

    craftBait(recipeId) {
        const recipe = this.gameData.recipes[recipeId];
        if (!this.checkRecipeMaterials(recipe)) return;
        
        for (const [matId, count] of Object.entries(recipe.materials)) {
            if (matId === 'any') {
                for (const [id, qty] of Object.entries(this.materials)) {
                    if (qty >= count) {
                        this.materials[id] -= count;
                        break;
                    }
                }
            } else {
                this.materials[matId] -= count;
            }
        }
        
        if (this.currentBait === recipe.baitId) {
            this.baitCount += recipe.craftCount;
        } else {
            this.currentBait = recipe.baitId;
            this.baitCount = recipe.craftCount;
        }
        
        const bait = this.gameData.baits[recipe.baitId];
        this.addLog(`合成了${bait.name}×${recipe.craftCount}`, 'fish');
        this.updateUI();
        this.saveGame();
    }

    updateCollectionDisplay() {
        const container = document.getElementById('collection-content');
        
        let html = '<div class="collection-grid">';
        Object.entries(this.gameData.fishTypes).forEach(([typeId, fishType]) => {
            const sizes = fishType.isRare ? ['small'] : Object.keys(this.gameData.fishSizes);
            sizes.forEach(sizeId => {
                const key = `${typeId}-${sizeId}`;
                const collectionData = this.collection[key];
                const hasNormal = collectionData && collectionData.normal;
                const hasShiny = collectionData && collectionData.shiny;
                
                let statusClass = 'not-captured';
                let shinyBadge = '';
                if (hasNormal && hasShiny) {
                    statusClass = 'captured';
                    shinyBadge = ' ✨';
                } else if (hasNormal || hasShiny) {
                    statusClass = 'captured';
                    shinyBadge = hasShiny ? ' ✨' : '';
                }
                
                html += `
                    <div class="collection-item ${statusClass}">
                        <div class="icon">${fishType.icon}${shinyBadge}</div>
                        <div class="name">${this.gameData.fishSizes[sizeId]?.name || ''}${fishType.name}</div>
                        <div class="shiny-status">
                            ${hasNormal ? '普通 ✓' : '普通 ✗'} ${hasShiny ? '闪耀 ✓' : '闪耀 ✗'}
                        </div>
                    </div>
                `;
            });
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    openModal(modalId) {
        document.getElementById('modal-overlay').style.display = 'block';
        document.getElementById(modalId).style.display = 'block';
        
        if (modalId === 'craft-modal') {
            this.updateCraftDisplay();
        }
    }

    closeModal(modalId) {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById(modalId).style.display = 'none';
    }

    closeAllModals() {
        document.getElementById('modal-overlay').style.display = 'none';
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    deleteSave() {
        if (window.confirm('⚠️ 确定要删除所有存档数据吗？\n\n此操作不可撤销！所有进度将丢失。')) {
            localStorage.removeItem('fishing-game-data');
            this.resetGame();
            this.addLog('🗑️ 存档已删除，游戏已重置', 'fish');
            this.closeModal('save-modal');
        }
    }

    resetGame() {
        this.gold = 100;
        this.fishingLevel = 1;
        this.fishingExp = 0;
        this.currentRod = 'bamboo';
        this.currentBait = 'basic';
        this.baitCount = 10;
        this.currentLocation = 'silent-bay';
        this.basket = [];
        this.materials = {};
        this.collection = {};
        this.eventEffects = {};
        this.nextFishForceSmall = false;
        
        this.initMaterials();
        this.initCollection();
        this.updateUI();
    }

    exportSave() {
        const data = {
            gold: this.gold,
            fishingLevel: this.fishingLevel,
            fishingExp: this.fishingExp,
            currentRod: this.currentRod,
            currentBait: this.currentBait,
            baitCount: this.baitCount,
            currentLocation: this.currentLocation,
            basket: this.basket,
            materials: this.materials,
            collection: this.collection,
            eventEffects: this.eventEffects
        };
        
        const encoded = btoa(JSON.stringify(data));
        document.getElementById('save-data').value = encoded;
        
        navigator.clipboard.writeText(encoded).then(() => {
            this.addLog('📤 存档已复制到剪贴板', 'fish');
        }).catch(() => {
            this.addLog('📤 存档已导出，请手动复制', 'fish');
        });
    }

    showImportPrompt() {
        const textarea = document.getElementById('save-data');
        if (textarea.value.trim()) {
            if (confirm('确定要导入存档吗？当前存档将被覆盖！')) {
                this.importSave(textarea.value.trim());
            }
        } else {
            alert('请先在文本框中粘贴存档数据');
        }
    }

    importSave(dataString) {
        try {
            const decoded = atob(dataString);
            const data = JSON.parse(decoded);
            
            const validRods = Object.keys(this.gameData.rods);
            
            this.gold = data.gold || 100;
            this.fishingLevel = data.fishingLevel || 1;
            this.fishingExp = data.fishingExp || 0;
            this.currentRod = validRods.includes(data.currentRod) ? data.currentRod : 'bamboo';
            this.ownedRods = data.ownedRods && Array.isArray(data.ownedRods) 
                ? data.ownedRods.filter(r => validRods.includes(r)) 
                : ['bamboo'];
            if (!this.ownedRods.includes(this.currentRod)) {
                this.ownedRods.push(this.currentRod);
            }
            this.currentBait = data.currentBait || 'basic';
            this.baitCount = data.baitCount || 10;
            this.currentLocation = data.currentLocation || 'silent-bay';
            this.basket = this.validateBasket(data.basket || []);
            this.materials = { ...this.materials, ...this.validateMaterials(data.materials || {}) };
            this.collection = { ...this.collection, ...this.validateCollection(data.collection || {}) };
            this.eventEffects = data.eventEffects || {};
            
            this.saveGame();
            this.updateUI();
            this.addLog('📥 存档导入成功！', 'fish');
            this.closeModal('save-modal');
        } catch (error) {
            console.error('Failed to import save:', error);
            alert('存档导入失败，请检查数据格式是否正确');
        }
    }
}

const game = new Game();

function closeModal(modalId) {
    game.closeModal(modalId);
}

function sellAllFish() {
    game.sellAllFish();
}