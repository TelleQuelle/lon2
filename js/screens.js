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

// Функция для показа лора уровня
function showLevelLore() {
    // Получаем текущий уровень
    const levelId = window.currentLevelId;
    const level = gameSettings.levels.find(l => l.id === levelId);
    
    if (!level || !level.lore) {
        console.error("Level not found or has no lore:", levelId);
        showGameMessage("Error: Level lore data not found", "warning");
        return;
    }
    
    // Получаем контейнер для лора
    const loreContainer = document.getElementById('level-lore-container');
    if (!loreContainer) {
        console.error("Level lore container not found");
        return;
    }
    
    // Очищаем контейнер
    loreContainer.innerHTML = '';
    
    // Создаем первую страницу лора (активна по умолчанию)
    const chapter1 = document.createElement('div');
    chapter1.className = 'lore-step active';
    chapter1.id = 'level-lore-step-1';
    
    chapter1.innerHTML = `
        <h2>${level.lore.chapter1.title}</h2>
        <img src="assets/lore/level${level.id}_1.png" alt="${level.lore.chapter1.title}" class="lore-image" onerror="this.src='assets/lore/placeholder.png'">
        <p>${level.lore.chapter1.text[0]}</p>
        <p>${level.lore.chapter1.text[1]}</p>
        <button id="level-lore-back-1" class="back-btn">Back</button>
        <button id="level-lore-next-1">Next</button>
    `;
    
    // Создаем вторую страницу лора (неактивна по умолчанию)
    const chapter2 = document.createElement('div');
    chapter2.className = 'lore-step';
    chapter2.id = 'level-lore-step-2';
    
    chapter2.innerHTML = `
        <h2>${level.lore.chapter2.title}</h2>
        <img src="assets/lore/level${level.id}_2.png" alt="${level.lore.chapter2.title}" class="lore-image" onerror="this.src='assets/lore/placeholder.png'">
        <p>${level.lore.chapter2.text[0]}</p>
        <p>${level.lore.chapter2.text[1]}</p>
        <button id="level-lore-back-2" class="back-btn">Back</button>
        <button id="level-lore-next-2">Begin</button>
    `;
    
    // Добавляем страницы в контейнер
    loreContainer.appendChild(chapter1);
    loreContainer.appendChild(chapter2);
    
    // Добавляем обработчики событий для кнопок
    document.getElementById('level-lore-back-1').addEventListener('click', function() {
        showScreen('level-container');
    });
    
    document.getElementById('level-lore-next-1').addEventListener('click', function() {
        document.getElementById('level-lore-step-1').classList.remove('active');
        document.getElementById('level-lore-step-2').classList.add('active');
    });
    
    document.getElementById('level-lore-back-2').addEventListener('click', function() {
        document.getElementById('level-lore-step-2').classList.remove('active');
        document.getElementById('level-lore-step-1').classList.add('active');
    });
    
    document.getElementById('level-lore-next-2').addEventListener('click', function() {
        startLevel();
    });
    
    // Создаем плейсхолдер, если его нет
    createLorePlaceholder();
    
    // Показываем контейнер лора
    showScreen('level-lore-container');
}

// Вспомогательная функция для создания плейсхолдера изображений лора
function createLorePlaceholder() {
    // Проверяем, существует ли плейсхолдер
    if (!document.getElementById('lore-placeholder-style')) {
        // Создаем стиль с плейсхолдером на базе data URL
        const style = document.createElement('style');
        style.id = 'lore-placeholder-style';
        style.textContent = `
            img.lore-image {
                width: 100%;
                max-width: 400px;
                height: auto;
                border: 1px solid #4a3a2a;
                border-radius: 5px;
                margin-bottom: 15px;
                background-color: #2b2b2b;
                min-height: 200px;
            }
            
            img.lore-image[src="assets/lore/placeholder.png"]::before {
                content: "Lore Image";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #b89d6e;
                font-size: 16px;
            }
            
            /* Дополнительные стили для контейнера лора, чтобы гарантировать видимость */
            #level-lore-container {
                display: none;
                z-index: 1500 !important;
                visibility: visible !important;
                opacity: 1 !important;
                background-color: #2b2b2b !important;
            }
            
            #level-lore-container.active {
                display: block !important;
            }
            
            .lore-step {
                display: none;
                animation: fadeIn 0.3s ease-out;
            }
            
            .lore-step.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        // Создаем пустое изображение-плейсхолдер, если его нет в документе
        if (!document.querySelector('img[src="assets/lore/placeholder.png"]')) {
            const img = document.createElement('img');
            img.src = 'assets/lore/placeholder.png';
            img.style.display = 'none';
            img.id = 'lore-placeholder';
            document.body.appendChild(img);
        }
    }
}

// Функция для проверки и создания плейсхолдеров изображений лора
function ensureLoreImagesExist(levelId) {
    // Создаем массив с путями к изображениям
    const imagePaths = [
        `assets/lore/level${levelId}_1.png`,
        `assets/lore/level${levelId}_2.png`
    ];
    
    // Создаем плейсхолдер, если он не существует
    if (!document.querySelector('img[src="assets/lore/placeholder.png"]')) {
        const placeholderCanvas = document.createElement('canvas');
        placeholderCanvas.width = 400;
        placeholderCanvas.height = 200;
        
        const ctx = placeholderCanvas.getContext('2d');
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(0, 0, 400, 200);
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, 390, 190);
        
        ctx.fillStyle = '#b89d6e';
        ctx.font = '20px MedievalSharp, Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Lore Image Placeholder', 200, 100);
        
        // Создаем плейсхолдер
        const placeholderImg = new Image();
        placeholderImg.src = placeholderCanvas.toDataURL('image/png');
        placeholderImg.style.display = 'none';
        placeholderImg.id = 'lore-placeholder';
        document.body.appendChild(placeholderImg);
        
        // Назначаем плейсхолдер как src для изображений, которые не загрузились
        document.querySelectorAll('img[src^="assets/lore/level"]').forEach(img => {
            img.onerror = function() {
                this.src = placeholderImg.src;
            };
        });
    }
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
        console.log("Showing level results:", isVictory, level, statistics);
        
        // Для случая поражения используем упрощенный интерфейс
        if (!isVictory) {
            showDefeatScreen();
            return;
        }
        
        // Определяем награду серебром (случайное значение в диапазоне)
        const minSilver = level.rewards.silverMin || 100;
        const maxSilver = level.rewards.silverMax || minSilver + 100;
        const silverAmount = Math.floor(
            Math.random() * (maxSilver - minSilver + 1) + minSilver
        );
        
        // Сохраняем данные о награде для последующего клейма
        window.currentRewards = {
            silver: silverAmount,
            special: level.rewards.special || null,
            levelId: level.id
        };
        
        // Проверяем существование и очищаем контейнер наград
        let overlay = document.getElementById('rewards-overlay');
        
        // Если оверлея нет, создаем его
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'rewards-overlay';
            document.body.appendChild(overlay);
        }
        
        // Создаем HTML для контейнера наград
        let rewardsHTML = `
            <div class="rewards-container">
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
                
                <button id="claim-rewards-button" class="primary-button">Claim Rewards</button>
            </div>
        `;
        
        // Обновляем содержимое оверлея
        overlay.innerHTML = rewardsHTML;
        
        // Делаем оверлей видимым
        overlay.style.display = 'flex';
        
        // Добавляем обработчик события напрямую
        document.getElementById('claim-rewards-button').onclick = function() {
            console.log("Claim rewards button clicked");
            handleClaimRewards();
        };
        
        // Сохраняем статистику уровня
        if (statistics && level) {
            localStorage.setItem(`levelStats_${level.id}`, JSON.stringify(statistics));
        }
    } catch (error) {
        console.error("Error showing level results:", error);
        // Показываем простое сообщение в случае ошибки
        showGameMessage("Victory! Check your rewards.", "success");
    }
}

// Функция для клейма наград
function claimRewards() {
    // Перенаправляем на новую функцию
    handleClaimRewards();
}

// Функция для возврата из игры в меню уровня
function leaveGame() {
    // Показываем диалог подтверждения
    if (confirm("Are you sure you want to leave the game? Your progress will be lost.")) {
        showScreen('level-container');
    }
}

// Вызываем функцию добавления кнопки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    addAlternateLoreButton();
});

// Также можно добавить обработчик для перезагрузки кнопки при переходе между экранами
document.addEventListener('screenChanged', function(e) {
    if (e.detail && e.detail.screen === 'level') {
        setTimeout(addAlternateLoreButton, 100);
    }
});

// Функция для показа экрана поражения
function showDefeatScreen() {
    // Находим или создаем оверлей для результата
    let overlay = document.getElementById('level-result');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'level-result';
        overlay.className = 'overlay';
        
        const content = document.createElement('div');
        content.className = 'overlay-content';
        overlay.appendChild(content);
        
        document.body.appendChild(overlay);
    }
    
    const content = overlay.querySelector('.overlay-content');
    
    if (!content) {
        console.error("Overlay content element not found");
        return;
    }
    
    // Очищаем содержимое
    content.innerHTML = `
        <h2 id="result-title" class="defeat-animation">Defeat</h2>
        <p id="result-message">You failed to complete the level. Try again!</p>
        <button id="return-to-levels-btn">Return to Levels</button>
    `;
    
    // Добавляем обработчик кнопки возврата
    content.querySelector('#return-to-levels-btn').onclick = function() {
        overlay.classList.remove('active');
        content.classList.remove('active');
        showScreen('campaign-container');
    };
    
    // Показываем оверлей
    overlay.classList.add('active');
    content.classList.add('active');
    
    // Сбрасываем данные о наградах
    window.currentRewards = null;
}

// Новая функция для обработки клейма наград
function handleClaimRewards() {
    console.log("Handling claim rewards...");
    
    if (!window.currentRewards) {
        showGameMessage("No rewards to claim", "warning");
        return;
    }
    
    // Получаем данные награды
    const rewards = window.currentRewards;
    const levelId = rewards.levelId;
    
    // Добавляем серебро
    playerData.silver += rewards.silver;
    
    // Если это последний уровень с NFT, запускаем процесс минтинга
    if (levelId === 10 && rewards.special === "NFT_Scroll") {
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
            console.warn("mintNFTScroll function not available");
            showGameMessage("NFT minting is currently not available", "warning");
        }
    }
    
    // Добавляем уровень в список пройденных, если его там еще нет
    if (!playerData.completedLevels.includes(levelId)) {
        playerData.completedLevels.push(levelId);
    }
    
    // Сохраняем данные игрока
    savePlayerData();
    
    // Обновляем информацию в интерфейсе
    updateUserInfo();
    
    // Скрываем оверлей наград
    const rewardsOverlay = document.getElementById('rewards-overlay');
    if (rewardsOverlay) {
        rewardsOverlay.style.display = 'none';
    }
    
    // Возвращаемся к экрану кампании
    showScreen('campaign-container');
    
    // Обновляем список уровней, чтобы отобразить прогресс
    updateLevelsList();
    
    showGameMessage("Rewards claimed successfully!", "success");
}

// Делаем функцию обработки наград глобально доступной
window.handleClaimRewards = handleClaimRewards;