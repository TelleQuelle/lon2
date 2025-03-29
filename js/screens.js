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

// Функция для добавления новой кнопки лора
function addAlternateLoreButton() {
    // Находим меню уровня
    const levelContainer = document.getElementById('level-container');
    const originalLoreBtn = document.getElementById('level-lore-btn');
    
    if (levelContainer && originalLoreBtn) {
        // Скрываем оригинальную кнопку, чтобы избежать проблем с квадратом
        originalLoreBtn.style.display = 'none';
        
        // Создаем новую кнопку
        const newLoreBtn = document.createElement('button');
        newLoreBtn.id = 'alternate-lore-btn';
        newLoreBtn.textContent = 'View Lore';
        newLoreBtn.className = originalLoreBtn.className; // Сохраняем классы оригинальной кнопки
        
        // Вставляем новую кнопку на место старой
        originalLoreBtn.parentNode.insertBefore(newLoreBtn, originalLoreBtn);
        
        // Добавляем обработчик для новой кнопки
        newLoreBtn.addEventListener('click', showAlternateLore);
    }
}

// Функция для отображения лора в модальном окне
function showAlternateLore() {
    // Получаем текущий уровень из localStorage или другого хранилища
    const currentLevel = getCurrentLevel(); // Эту функцию нужно реализовать или заменить
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'alternate-lore-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    // Создаем содержимое модального окна
    const content = document.createElement('div');
    content.style.backgroundColor = '#2b2b2b';
    content.style.padding = '20px';
    content.style.borderRadius = '10px';
    content.style.border = '2px solid #4a3a2a';
    content.style.maxWidth = '600px';
    content.style.width = '90%';
    content.style.maxHeight = '80vh';
    content.style.overflow = 'auto';
    content.style.position = 'relative';
    
    // Добавляем заголовок
    const title = document.createElement('h2');
    title.style.color = '#b89d6e';
    title.style.marginBottom = '15px';
    title.textContent = `Level ${currentLevel.number}: ${currentLevel.title} - Lore`;
    content.appendChild(title);
    
    // Добавляем содержимое лора
    if (currentLevel.lore) {
        // Если у нас есть глава 1
        if (currentLevel.lore.chapter1) {
            const chapter1Title = document.createElement('h3');
            chapter1Title.style.color = '#b89d6e';
            chapter1Title.style.marginTop = '20px';
            chapter1Title.textContent = currentLevel.lore.chapter1.title;
            content.appendChild(chapter1Title);
            
            if (currentLevel.lore.chapter1.image) {
                const image1 = document.createElement('img');
                image1.src = currentLevel.lore.chapter1.image;
                image1.style.maxWidth = '100%';
                image1.style.borderRadius = '5px';
                image1.style.marginBottom = '15px';
                content.appendChild(image1);
            }
            
            const text1 = document.createElement('p');
            text1.textContent = currentLevel.lore.chapter1.text;
            content.appendChild(text1);
        }
        
        // Если у нас есть глава 2
        if (currentLevel.lore.chapter2) {
            const chapter2Title = document.createElement('h3');
            chapter2Title.style.color = '#b89d6e';
            chapter2Title.style.marginTop = '20px';
            chapter2Title.textContent = currentLevel.lore.chapter2.title;
            content.appendChild(chapter2Title);
            
            if (currentLevel.lore.chapter2.image) {
                const image2 = document.createElement('img');
                image2.src = currentLevel.lore.chapter2.image;
                image2.style.maxWidth = '100%';
                image2.style.borderRadius = '5px';
                image2.style.marginBottom = '15px';
                content.appendChild(image2);
            }
            
            const text2 = document.createElement('p');
            text2.textContent = currentLevel.lore.chapter2.text;
            content.appendChild(text2);
        }
    } else {
        // Если данных о лоре нет
        const noLore = document.createElement('p');
        noLore.textContent = "No lore available for this level yet.";
        content.appendChild(noLore);
    }
    
    // Добавляем кнопку закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '20px';
    closeBtn.style.backgroundColor = '#4a3a2a';
    closeBtn.style.color = '#d4c2a7';
    closeBtn.style.border = '1px solid #b89d6e';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.borderRadius = '5px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.display = 'block';
    closeBtn.style.margin = '20px auto 0';
    
    closeBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// Функция для получения данных текущего уровня
// Это заглушка - вам нужно реализовать ее в соответствии с вашей логикой хранения данных
function getCurrentLevel() {
    // Пример данных - замените на реальные
    return {
        number: 1,
        title: "Treachery",
        lore: {
            chapter1: {
                title: "The First Circle",
                image: "assets/lore/level1_1.png",
                text: "As you descend into the first circle of the Abyss, the air grows thick with betrayal. The walls seem to whisper the tales of those who came before you, their trust shattered like glass upon stone."
            },
            chapter2: {
                title: "The Game Begins",
                image: "assets/lore/level1_2.png",
                text: "A hunched figure emerges from the shadows, cards clutched in bony fingers. 'Welcome to Treachery,' it hisses. 'The rules are simple: win and you may ascend, lose and join us in eternal torment.'"
            }
        }
    };
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