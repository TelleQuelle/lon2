/**
 * Screens.js - Модуль для управления экранами и пользовательскими интерфейсами
 * 
 * Этот файл содержит функции для управления переключением между экранами,
 * отображением игровых сообщений и обновлением пользовательского интерфейса.
 */

// Функция для начала путешествия (после ввода имени)
function startJourney() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        showGameMessage("Please enter your name, adventurer!", "warning");
        nameInput.focus();
        return;
    }
    
    // Сохраняем имя игрока
    playerData.name = name;
    savePlayerData();
    
    // Проверяем, первый ли это вход игрока
    const isFirstTime = !localStorage.getItem('tutorialCompleted');
    
    if (isFirstTime) {
        // Показываем туториал для новых игроков
        startTutorial();
    } else {
        // Опытные игроки сразу переходят в главное меню
        showMainMenu();
    }
}

// Функция отображения главного меню
function showMainMenu() {
    showScreen('main-menu');
    updateUserInfo();
}

// Функция отображения игрового сообщения
function showGameMessage(message, type = 'info') {
    const messageElement = document.getElementById('game-message');
    if (!messageElement) {
        console.error("Game message element not found");
        return;
    }
    
    // Устанавливаем текст и класс сообщения
    messageElement.textContent = message;
    messageElement.className = ''; // Сбрасываем классы
    messageElement.classList.add('message-' + type, 'visible');
    
    // Скрываем сообщение через 3 секунды
    setTimeout(() => {
        messageElement.classList.remove('visible');
    }, 3000);
}

// Функция для открытия кампании
function openCampaign() {
    showScreen('campaign-container');
    updateLevelsList();
}

// Функция обновления списка уровней кампании
function updateLevelsList() {
    const levelListContainer = document.querySelector('.level-list');
    if (!levelListContainer) {
        console.error("Level list container not found");
        return;
    }
    
    // Очищаем контейнер
    levelListContainer.innerHTML = '';
    
    // Массив рун для заблокированных уровней
    const runes = [
        '᛫', 'ᚦ', 'ᚢ', 'ᚱ', 'ᚴ', 'ᚼ', 'ᚾ', 'ᛁ', 'ᛅ', 'ᛦ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛚ', 'ᛘ'
    ];
    
    // Заполняем список уровней
    gameSettings.levels.forEach(level => {
        // Определяем статус уровня
        const isCompleted = playerData.completedLevels.includes(level.id);
        const isLocked = !isCompleted && level.id > 1 && !playerData.completedLevels.includes(level.id - 1);
        
        // Создаем элемент уровня
        const levelItem = document.createElement('div');
        levelItem.className = 'level-item';
        if (isLocked) {
            levelItem.classList.add('locked');
        } else if (isCompleted) {
            levelItem.classList.add('completed');
        }
        
        // Наполняем содержимым
        if (isLocked) {
            // Создаем случайную руническую строку для названия
            let runeString = '';
            for (let i = 0; i < level.name.length; i++) {
                runeString += runes[Math.floor(Math.random() * runes.length)];
            }
            
            levelItem.innerHTML = `
                <span>Level ${level.id}: ${runeString}</span>
                <span>Locked</span>
            `;
        } else {
            levelItem.innerHTML = `
                <span>Level ${level.id}: ${level.name}</span>
                <span>${isCompleted ? 'Completed' : 'Unlocked'}</span>
            `;
            
            // Добавляем обработчик события для незаблокированных уровней
            levelItem.addEventListener('click', () => openLevel(level.id));
        }
        
        // Добавляем элемент в список
        levelListContainer.appendChild(levelItem);
    });
}

// Функция открытия уровня
function openLevel(levelId) {
    // Находим данные уровня
    const level = gameSettings.levels.find(l => l.id === levelId);
    if (!level) {
        console.error("Level not found:", levelId);
        return;
    }
    
    // Сохраняем текущий уровень в глобальном состоянии
    window.currentLevelId = levelId;
    
    // Обновляем информацию об уровне
    const levelTitle = document.getElementById('level-title');
    const levelGoal = document.getElementById('level-goal');
    
    if (levelTitle) {
        levelTitle.textContent = `Level ${level.id}: ${level.name}`;
    }
    
    if (levelGoal) {
        levelGoal.textContent = `Goal: Earn ${level.goal.points} points in ${level.goal.turns} turns.`;
    }
    
    // Показываем статистику, если уровень уже пройден
    const levelStats = document.getElementById('level-stats');
    if (levelStats) {
        const levelStatData = getLevelStatistics(levelId);
        
        if (levelStatData) {
            document.getElementById('attempts-count').textContent = levelStatData.attempts || 0;
            document.getElementById('silver-earned').textContent = levelStatData.silverEarned || 0;
            document.getElementById('turns-used').textContent = levelStatData.turnsUsed || 0;
            levelStats.style.display = 'block';
        } else {
            levelStats.style.display = 'none';
        }
    }
    
    // Отображаем экран уровня
    showScreen('level-container');
}

// Функция получения статистики уровня
function getLevelStatistics(levelId) {
    const stats = localStorage.getItem(`levelStats_${levelId}`);
    return stats ? JSON.parse(stats) : null;
}

// Функция для показа лора уровня с измененными кнопками
function showLevelLore() {
    // Получаем текущий уровень
    const levelId = window.currentLevelId;
    const level = gameSettings.levels.find(l => l.id === levelId);
    
    if (!level) {
        console.error("Level not found:", levelId);
        return;
    }
    
    // Заполняем контейнер с лором
    const loreContainer = document.getElementById('level-lore-container');
    
    if (!loreContainer) {
        console.error("Lore container not found");
        return;
    }
    
    // Создаем шаги лора
    loreContainer.innerHTML = `
        <div class="lore-step" id="level-lore-step-1" style="display: block;">
            <h2>${level.lore.chapter1.title}</h2>
            <img src="assets/lore/level${level.id}_1.png" alt="${level.lore.chapter1.title}" class="lore-image">
            <p>${level.lore.chapter1.text[0]}</p>
            <p>${level.lore.chapter1.text[1]}</p>
            <button id="level-lore-next-1">Next</button>
            <button id="level-lore-back-1" class="back-btn">Back to Level</button>
        </div>
        <div class="lore-step" id="level-lore-step-2">
            <h2>${level.lore.chapter2.title}</h2>
            <img src="assets/lore/level${level.id}_2.png" alt="${level.lore.chapter2.title}" class="lore-image">
            <p>${level.lore.chapter2.text[0]}</p>
            <p>${level.lore.chapter2.text[1]}</p>
            <button id="level-lore-prev-2">Previous</button>
            <button id="level-lore-back-2" class="back-btn">Back to Level</button>
            <button id="level-lore-start" class="action-btn">Start</button>
        </div>
    `;
    
    // Добавляем обработчики событий
    document.getElementById('level-lore-next-1').addEventListener('click', () => {
        document.getElementById('level-lore-step-1').style.display = 'none';
        document.getElementById('level-lore-step-2').style.display = 'block';
    });
    
    document.getElementById('level-lore-prev-2').addEventListener('click', () => {
        document.getElementById('level-lore-step-2').style.display = 'none';
        document.getElementById('level-lore-step-1').style.display = 'block';
    });
    
    // Кнопки возврата к меню уровня
    document.getElementById('level-lore-back-1').addEventListener('click', () => {
        showScreen('level-container');
    });
    
    document.getElementById('level-lore-back-2').addEventListener('click', () => {
        showScreen('level-container');
    });
    
    // Кнопка начала уровня
    document.getElementById('level-lore-start').addEventListener('click', () => {
        showScreen('game-screen'); // Сначала меняем экран
        startLevel(); // Потом запускаем уровень
    });
    
    // Показываем экран с лором
    showScreen('level-lore-container');
}

// Функция для начала уровня
function startLevel() {
    // Получаем текущий уровень
    const levelId = window.currentLevelId;
    const level = gameSettings.levels.find(l => l.id === levelId);
    
    if (!level) {
        console.error("Level not found:", levelId);
        return;
    }
    
    // Инициализируем игровой экран
    initGameScreen(level);
    
    // Отображаем игровой экран
    showScreen('game-screen');
    
    // Начинаем игру
    startGame(level);
}

// Функция для инициализации игрового экрана
function initGameScreen(level) {
    // Обновляем заголовок уровня
    document.getElementById('game-level-title').textContent = `Level ${level.id}: ${level.name}`;
    
    // Устанавливаем максимальное количество ходов
    document.getElementById('max-turns').textContent = level.goal.turns;
    
    // Устанавливаем целевое количество очков
    document.getElementById('target-score').textContent = level.goal.points;
    
    // Сбрасываем текущий ход и счет
    document.getElementById('current-turn').textContent = '1';
    document.getElementById('current-score').textContent = '0';
    document.getElementById('turn-score').textContent = '0';
    
    // Сбрасываем выбранный кубик и валидные комбинации
    document.getElementById('selected-die-value').textContent = '';
    document.getElementById('valid-combinations').textContent = '';
    
    // Очищаем область с картами
    document.getElementById('cards').innerHTML = '';
}

// Функция для отображения результатов уровня
function showLevelResults(isVictory, level, statistics) {
    try {
        // Проверяем существование элемента rewards-overlay или создаем его
        let overlay = document.getElementById('rewards-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'rewards-overlay';
            overlay.style.display = 'none';
            
            // Создаем контейнер для наград
            const rewardsContainer = document.createElement('div');
            rewardsContainer.className = 'rewards-container';
            
            overlay.appendChild(rewardsContainer);
            document.body.appendChild(overlay);
        }
        
        // Получаем контейнер наград
        const container = overlay.querySelector('.rewards-container');
        if (!container) {
            throw new Error("Rewards container not found");
        }
        
        // Настраиваем сообщение
        if (isVictory) {
            // Проверяем существование уровня и его наград
            if (!level || !level.rewards) {
                throw new Error("Invalid level data");
            }
            
            // Определяем минимальное и максимальное значение наград
            const minSilver = level.rewards.silverMin || 100;
            const maxSilver = level.rewards.silverMax || minSilver + 100;
            
            // Определяем награду серебром (случайное значение в диапазоне)
            const silverAmount = Math.floor(
                Math.random() * (maxSilver - minSilver + 1) + minSilver
            );
            
            // Сохраняем данные о награде для последующего клейма
            window.currentRewards = {
                silver: silverAmount,
                special: level.rewards.special || null
            };
            
            // Создаем HTML для контейнера наград
            let rewardsHTML = `
                <div class="rewards-header">
                    <h2 class="victory-animation">Victory!</h2>
                    <p>Congratulations! You have completed Level ${level.id}: ${level.name}!</p>
                </div>
                
                <img src="assets/images/treasure.png" alt="Treasure" class="rewards-image treasure-open">
                
                <div class="rewards-list">
                    <h3>Your Rewards:</h3>
                    <div class="reward-item">
                        <img src="assets/images/silver_coin.png" alt="Silver" class="reward-icon">
                        <span>${silverAmount} Silver</span>
                    </div>
            `;
            
            // Если есть специальные награды, добавляем их
            if (level.rewards.special) {
                if (level.rewards.special === "NFT_Scroll") {
                    rewardsHTML += `
                        <div class="reward-item">
                            <img src="assets/images/scroll.png" alt="NFT Scroll" class="reward-icon">
                            <span>Freedom Scroll NFT</span>
                        </div>
                    `;
                }
            }
            
            rewardsHTML += `
                </div>
                
                <button id="claim-rewards-btn">Claim Rewards</button>
            `;
            
            // Обновляем содержимое контейнера
            container.innerHTML = rewardsHTML;
            
            // Показываем оверлей
            overlay.style.display = 'flex';
            
            // Добавляем анимацию падающих монет, если функция доступна
            if (window.utils && window.utils.createFallingAnimation) {
                window.utils.createFallingAnimation(overlay, 'assets/images/silver_coin.png', 20, 3000);
            }
            
            // Добавляем обработчик для кнопки клейма наград
            const claimButton = document.getElementById('claim-rewards-btn');
            if (claimButton) {
                // Удаляем старый обработчик, если он есть
                const newClaimButton = claimButton.cloneNode(true);
                claimButton.parentNode.replaceChild(newClaimButton, claimButton);
                
                // Добавляем новый обработчик
                newClaimButton.addEventListener('click', () => {
                    claimRewards();
                    overlay.style.display = 'none';
                });
            }
        } else {
            // В случае поражения используем старый интерфейс
            const oldOverlay = document.getElementById('level-result');
            if (!oldOverlay) {
                throw new Error("Level result overlay not found");
            }
            
            const content = oldOverlay.querySelector('.overlay-content');
            const title = document.getElementById('result-title');
            const message = document.getElementById('result-message');
            
            if (!content || !title || !message) {
                throw new Error("Level result elements not found");
            }
            
            title.textContent = "Defeat";
            title.className = ""; // Сбрасываем классы
            title.classList.add('defeat-animation');
            
            message.textContent = `You failed to complete the level. Try again!`;
            
            // Сбрасываем данные о наградах
            window.currentRewards = null;
            
            // Показываем оверлей
            oldOverlay.classList.add('active');
            content.classList.add('active');
        }
        
        // Сохраняем статистику уровня
        if (statistics && level) {
            localStorage.setItem(`levelStats_${level.id}`, JSON.stringify(statistics));
        }
    } catch (error) {
        console.error("Error showing level results:", error);
        // Показываем простое сообщение в случае ошибки
        showGameMessage(isVictory ? "Victory! Check your rewards." : "Defeat. Try again!", 
                        isVictory ? "success" : "warning");
    }
}

// Функция для клейма наград
function claimRewards() {
    if (!window.currentRewards) {
        showGameMessage("No rewards to claim", "warning");
        return;
    }
    
    // Получаем текущий уровень
    const levelId = window.currentLevelId;
    if (!levelId) {
        console.error("Current level ID not found");
        showGameMessage("Error: Could not determine current level", "warning");
        return;
    }
    
    const level = gameSettings.levels.find(l => l.id === levelId);
    
    if (!level) {
        console.error("Level not found:", levelId);
        showGameMessage("Error: Level not found", "warning");
        return;
    }
    
    // Добавляем серебро
    playerData.silver += window.currentRewards.silver;
    
    // Если это последний уровень с NFT, запускаем процесс минтинга
    if (level.id === 10 && window.currentRewards.special === "NFT_Scroll") {
        // Проверяем, доступна ли функция mintNFTScroll
        if (typeof mintNFTScroll === 'function') {
            mintNFTScroll().then(success => {
                if (success) {
                    // Разблокируем раздел "Приключения"
                    const adventureOption = document.getElementById('adventure-option');
                    if (adventureOption) {
                        adventureOption.classList.remove('locked');
                        
                        // Удаляем оверлей блокировки, если он существует
                        const lockOverlay = adventureOption.querySelector('.lock-overlay');
                        if (lockOverlay) {
                            lockOverlay.remove();
                        }
                    }
                }
            }).catch(error => {
                console.error("Error minting NFT:", error);
                showGameMessage("Failed to mint NFT. You can try again later.", "warning");
            });
        } else {
            console.error("mintNFTScroll function not available");
            showGameMessage("NFT minting is currently not available", "warning");
        }
    }
    
    // Добавляем уровень в список пройденных, если его там еще нет
    if (!playerData.completedLevels.includes(level.id)) {
        playerData.completedLevels.push(level.id);
    }
    
    // Сохраняем данные игрока
    savePlayerData();
    
    // Обновляем информацию в интерфейсе
    if (typeof updateUserInfo === 'function') {
        updateUserInfo();
    }
    
    // Закрываем оверлей
    const levelResult = document.getElementById('level-result');
    if (levelResult) {
        levelResult.classList.remove('active');
        const content = levelResult.querySelector('.overlay-content');
        if (content) {
            content.classList.remove('active');
        }
    }
    
    // Закрываем оверлей наград, если он открыт
    const rewardsOverlay = document.getElementById('rewards-overlay');
    if (rewardsOverlay) {
        rewardsOverlay.style.display = 'none';
    }
    
    // Возвращаемся к экрану кампании
    showScreen('campaign-container');
    
    showGameMessage("Rewards claimed successfully!", "success");
}

// Функция для возврата из игры в меню уровня
function leaveGame() {
    // Показываем диалог подтверждения
    if (confirm("Are you sure you want to leave the game? Your progress will be lost.")) {
        showScreen('level-container');
    }
}