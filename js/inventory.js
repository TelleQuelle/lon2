/**
 * inventory.js - Обновленная система инвентаря
 * 
 * Реализует следующую логику:
 * 1. Кубики:
 *    - Все кубики — шестигранные (D6)
 *    - Изначально 2 базовых кубика без особых свойств
 *    - Можно выбрать до 5 кубиков для игры
 *    - Каждый ход случайно выбираются 2 кубика из выбранных
 * 
 * 2. Карты:
 *    - Колода из 52 карт (4 масти по 13 номиналов)
 *    - Каждая карта уникальна по масти и номиналу
 *    - Колода всегда из 52 карт, но можно заменять карты
 */

// Глобальный объект для хранения состояния инвентаря
const inventoryState = {
    initialized: false,
    cardReplaceMode: false,
    currentCardToReplace: null,
    standardDeck: generateStandardDeck()
};

// Функция открытия инвентаря
function openInventory() {
    // Обновляем отображение количества серебра
    document.getElementById('inventory-silver').textContent = playerData.silver;
    
    // Инициализируем инвентарь при первом открытии
    if (!inventoryState.initialized) {
        initializeInventory();
    }
    
    // Загружаем предметы в инвентарь
    loadInventoryItems();
    
    // Показываем экран инвентаря
    showScreen('inventory-container');
}

// Функция инициализации инвентаря
function initializeInventory() {
    // Обновляем HTML-структуру инвентаря
    updateInventoryHTML();
    
    // Проверяем и инициализируем данные игрока, если нужно
    initializePlayerInventoryData();
    
    // Отмечаем, что инвентарь инициализирован
    inventoryState.initialized = true;
}

// Функция обновления HTML-структуры инвентаря
function updateInventoryHTML() {
    const inventoryContainer = document.getElementById('inventory-container');
    if (!inventoryContainer) return;
    
    // Обновляем содержимое
    inventoryContainer.innerHTML = `
        <h2>Inventory</h2>
        <p>Your silver: <span id="inventory-silver">0</span></p>
        
        <div class="inventory-tabs">
            <button class="inventory-tab active" data-tab="dice">Dice</button>
            <button class="inventory-tab" data-tab="cards">Cards</button>
        </div>
        
        <div class="inventory-tab-content">
            <!-- Вкладка кубиков -->
            <div id="dice-tab" class="inventory-panel active">
                <div class="inventory-info">
                    <p>You can select up to <span class="highlight">5 dice</span> for your set. 
                    During each turn, <span class="highlight">2 random dice</span> from your set will be rolled.</p>
                </div>
                
                <h3>Selected Dice <span id="selected-dice-count">(0/5)</span></h3>
                <div id="selected-dice" class="selected-items-grid"></div>
                
                <h3>Available Dice</h3>
                <div id="dice-inventory" class="inventory-items-grid"></div>
            </div>
            
            <!-- Вкладка карт -->
            <div id="cards-tab" class="inventory-panel">
                <div class="inventory-info">
                    <p>Your deck always contains <span class="highlight">52 cards</span> (one of each card type).
                    You can replace any card with a skin or special card with the same value and suit.</p>
                </div>
                
                <div id="deck-view-controls" class="deck-controls">
                    <button id="view-by-suit" class="deck-view-btn active">View by Suit</button>
                    <button id="view-by-value" class="deck-view-btn">View by Value</button>
                    <button id="view-special-cards" class="deck-view-btn">Special Cards</button>
                </div>
                
                <div id="replace-mode-notice" class="replace-mode" style="display: none;">
                    <p>Select a replacement for <span id="card-to-replace"></span>:</p>
                    <button id="cancel-replace" class="cancel-btn">Cancel</button>
                </div>
                
                <div id="cards-inventory" class="cards-grid"></div>
            </div>
        </div>
        
        <button id="close-inventory-btn" class="back-btn">Back to Menu</button>
        
        <!-- Модальное окно информации о карте/кубике -->
        <div id="item-info-modal" class="modal-content" style="display: none;">
            <h3 id="item-info-title">Item Info</h3>
            <div id="item-info-content"></div>
            <button id="close-item-info" class="action-btn">Close</button>
        </div>
    `;
    
    // Настраиваем обработчики событий
    setupInventoryEvents();
    
    // Добавляем стили
    addInventoryStyles();
}

// Функция настройки событий инвентаря
function setupInventoryEvents() {
    // Обработчики для вкладок
    const tabButtons = document.querySelectorAll('.inventory-tab');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Получаем ID вкладки
            const tabId = button.getAttribute('data-tab');
            
            // Убираем активный класс со всех кнопок и вкладок
            document.querySelectorAll('.inventory-tab').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.inventory-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Делаем активной выбранную вкладку
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Обработчики для кнопок управления отображением колоды
    const viewBySuitBtn = document.getElementById('view-by-suit');
    const viewByValueBtn = document.getElementById('view-by-value');
    const viewSpecialCardsBtn = document.getElementById('view-special-cards');
    
    if (viewBySuitBtn) {
        viewBySuitBtn.addEventListener('click', () => {
            document.querySelectorAll('.deck-view-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            viewBySuitBtn.classList.add('active');
            loadCardsByView('suit');
        });
    }
    
    if (viewByValueBtn) {
        viewByValueBtn.addEventListener('click', () => {
            document.querySelectorAll('.deck-view-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            viewByValueBtn.classList.add('active');
            loadCardsByView('value');
        });
    }
    
    if (viewSpecialCardsBtn) {
        viewSpecialCardsBtn.addEventListener('click', () => {
            document.querySelectorAll('.deck-view-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            viewSpecialCardsBtn.classList.add('active');
            loadCardsByView('special');
        });
    }
    
    // Обработчик для отмены режима замены
    const cancelReplaceBtn = document.getElementById('cancel-replace');
    if (cancelReplaceBtn) {
        cancelReplaceBtn.addEventListener('click', cancelCardReplace);
    }
    
    // Обработчик для закрытия информации о предмете
    const closeItemInfoBtn = document.getElementById('close-item-info');
    if (closeItemInfoBtn) {
        closeItemInfoBtn.addEventListener('click', () => {
            document.getElementById('item-info-modal').style.display = 'none';
        });
    }
    
    // Обработчик для закрытия инвентаря
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    if (closeInventoryBtn) {
        closeInventoryBtn.addEventListener('click', () => {
            showScreen('main-menu');
        });
    }
}

// Функция добавления стилей для инвентаря
function addInventoryStyles() {
    // Проверяем, есть ли уже стили
    if (document.getElementById('inventory-styles')) return;
    
    // Создаем элемент стиля
    const styleElement = document.createElement('style');
    styleElement.id = 'inventory-styles';
    styleElement.textContent = `
        /* Вкладки инвентаря */
        .inventory-tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #4a3a2a;
        }
        
        .inventory-tab {
            background-color: #2b2b2b;
            color: #d4c2a7;
            border: 1px solid #4a3a2a;
            border-bottom: none;
            padding: 10px 15px;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 5px;
            border-radius: 5px 5px 0 0;
            flex-grow: 1;
        }
        
        .inventory-tab:hover {
            background-color: #3a3a3a;
        }
        
        .inventory-tab.active {
            background-color: #4a3a2a;
            font-weight: bold;
        }
        
        /* Панели вкладок */
        .inventory-panel {
            display: none;
            margin-bottom: 20px;
        }
        
        .inventory-panel.active {
            display: block;
        }
        
        /* Информация об инвентаре */
        .inventory-info {
            background-color: #3a3a3a;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 10px 15px;
            margin-bottom: 20px;
        }
        
        .inventory-info p {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .highlight {
            color: #b89d6e;
            font-weight: bold;
        }
        
        /* Выбранные предметы */
        .selected-items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
            min-height: 100px;
            background-color: #232018;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 10px;
        }
        
        /* Сетка предметов инвентаря */
        .inventory-items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
        }
        
        /* Элемент инвентаря */
        .inventory-item {
            background-color: #3a3a3a;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .inventory-item:hover {
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(184, 157, 110, 0.3);
        }
        
        .inventory-item.selected {
            border: 2px solid #b89d6e;
            background-color: #4a3a2a;
        }
        
        .inventory-item img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            margin-bottom: 5px;
        }
        
        .inventory-item-name {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .inventory-item-type {
            font-size: 10px;
            color: #a89d8e;
        }
        
        /* Стили для разных редкостей */
        .inventory-item.Common {
            border-color: #d4c2a7;
        }
        
        .inventory-item.Rare {
            border-color: #b89d6e;
            box-shadow: 0 0 5px rgba(184, 157, 110, 0.3);
        }
        
        .inventory-item.Epic {
            border-color: #ff4500;
            box-shadow: 0 0 5px rgba(255, 69, 0, 0.3);
        }
        
        /* Сетка карт */
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
        }
        
        /* Элемент карты */
        .card-item {
            background-color: #3a3a3a;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 5px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }
        
        .card-item:hover {
            transform: scale(1.05);
            z-index: 10;
        }
        
        .card-item img {
            width: 60px;
            height: 80px;
            object-fit: cover;
            border-radius: 3px;
            margin-bottom: 5px;
        }
        
        .card-item-name {
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Карты разных мастей */
        .card-item.hearts, .card-item.diamonds {
            border-color: #cc3333;
        }
        
        .card-hearts, .card-diamonds {
            color: #cc3333 !important;
        }
        
        .card-clubs, .card-spades {
            color: #d4c2a7 !important;
        }
        
        /* Управление отображением колоды */
        .deck-controls {
            display: flex;
            margin-bottom: 15px;
        }
        
        .deck-view-btn {
            flex-grow: 1;
            padding: 8px;
            background-color: #2b2b2b;
            border: 1px solid #4a3a2a;
            color: #d4c2a7;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .deck-view-btn:first-child {
            border-radius: 5px 0 0 5px;
        }
        
        .deck-view-btn:last-child {
            border-radius: 0 5px 5px 0;
        }
        
        .deck-view-btn.active {
            background-color: #4a3a2a;
            font-weight: bold;
        }
        
        /* Режим замены карты */
        .replace-mode {
            background-color: #3a3a3a;
            border: 1px solid #b89d6e;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .replace-mode p {
            margin: 0;
        }
        
        .cancel-btn {
            background-color: #5a3a3a;
            color: #d4c2a7;
            border: 1px solid #cc6666;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 5px;
        }
        
        /* Заголовки */
        .inventory-container h3 {
            margin-top: 20px;
            margin-bottom: 10px;
            color: #b89d6e;
            border-bottom: 1px solid #4a3a2a;
            padding-bottom: 5px;
        }
        
        /* Иконка специальной карты */
        .special-indicator {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            background-color: #b89d6e;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 12px;
            font-weight: bold;
            color: #2b2b2b;
        }
        
        /* Модальное окно информации о предмете */
        #item-info-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            max-width: 400px;
            width: 90%;
        }
        
        #item-info-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 15px 0;
        }
        
        .info-image {
            width: 100px;
            height: 130px;
            object-fit: contain;
            margin-bottom: 15px;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
        }
        
        .info-description {
            margin-top: 10px;
            text-align: left;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .info-effect {
            margin-top: 10px;
            background-color: #3a3a3a;
            padding: 10px;
            border-radius: 5px;
            font-style: italic;
            text-align: center;
        }
    `;
    
    // Добавляем стили в head
    document.head.appendChild(styleElement);
}

// Функция инициализации данных инвентаря игрока
function initializePlayerInventoryData() {
    // Проверяем, инициализированы ли данные инвентаря
    if (!playerData.inventory) {
        playerData.inventory = {
            cards: [],
            dice: []
        };
    }
    
    // Проверяем инициализацию колоды карт
    if (!playerData.deck) {
        // Инициализируем стандартную колоду
        playerData.deck = {};
        
        // Проходим по всем картам стандартной колоды
        inventoryState.standardDeck.forEach(card => {
            const cardKey = `${card.value}_of_${card.suit}`;
            playerData.deck[cardKey] = {
                value: card.value,
                suit: card.suit,
                type: 'standard',
                name: `${card.value} of ${card.suit}`,
                image: `assets/cards/default/${card.value}_of_${card.suit}.png`
            };
        });
    }
    
    // Проверяем инициализацию кубиков
    if (!playerData.selectedDice || playerData.selectedDice.length === 0) {
        // Инициализируем два стандартных кубика
        playerData.selectedDice = [
            { id: 'standard_dice_1', type: 'standard', name: 'Standard Dice' },
            { id: 'standard_dice_2', type: 'standard', name: 'Standard Dice' }
        ];
    }
    
    // Сохраняем данные
    savePlayerData();
}

// Функция загрузки предметов в инвентарь
function loadInventoryItems() {
    // Загружаем кубики
    loadDiceInventory();
    
    // Загружаем карты (по умолчанию по мастям)
    loadCardsByView('suit');
}

// Функция загрузки кубиков в инвентарь
function loadDiceInventory() {
    // Получаем контейнеры
    const selectedDiceContainer = document.getElementById('selected-dice');
    const diceInventoryContainer = document.getElementById('dice-inventory');
    
    if (!selectedDiceContainer || !diceInventoryContainer) return;
    
    // Очищаем контейнеры
    selectedDiceContainer.innerHTML = '';
    diceInventoryContainer.innerHTML = '';
    
    // Обновляем счетчик выбранных кубиков
    document.getElementById('selected-dice-count').textContent = 
        `(${playerData.selectedDice.length}/5)`;
    
    // Загружаем выбранные кубики
    playerData.selectedDice.forEach(die => {
        const dieElement = createDiceElement(die, true);
        selectedDiceContainer.appendChild(dieElement);
    });
    
    // Загружаем стандартные кубики (если меньше 2 в выбранных)
    const standardDiceCount = playerData.selectedDice.filter(die => 
        die.type === 'standard' || die.id === 'standard_dice_1' || die.id === 'standard_dice_2'
    ).length;
    
    if (standardDiceCount < 2) {
        // Добавляем стандартные кубики в инвентарь
        for (let i = 1; i <= 2 - standardDiceCount; i++) {
            const standardDie = {
                id: `standard_dice_${i}`,
                type: 'standard',
                name: 'Standard Dice',
                image: 'assets/dice/default/dice-set.png'
            };
            
            const dieElement = createDiceElement(standardDie, false);
            diceInventoryContainer.appendChild(dieElement);
        }
    }
    
    // Загружаем имеющиеся кубики
    playerData.inventory.dice.forEach(die => {
        // Проверяем, не выбран ли уже этот кубик
        const isSelected = playerData.selectedDice.some(selectedDie => 
            selectedDie.id === die.id
        );
        
        if (!isSelected) {
            const dieElement = createDiceElement(die, false);
            diceInventoryContainer.appendChild(dieElement);
        }
    });
}

// Функция создания элемента кубика
function createDiceElement(die, isSelected) {
    // Если у кубика нет изображения, используем стандартное
    const dieImage = die.image || 'assets/dice/default/dice-set.png';
    
    // Создаем элемент
    const dieElement = document.createElement('div');
    dieElement.className = 'inventory-item';
    if (isSelected) dieElement.classList.add('selected');
    if (die.rarity) dieElement.classList.add(die.rarity);
    dieElement.setAttribute('data-id', die.id);
    
    // Создаем содержимое
    dieElement.innerHTML = `
        <img src="${dieImage}" alt="${die.name}">
        <div class="inventory-item-name">${die.name}</div>
        <div class="inventory-item-type">${die.type}</div>
    `;
    
    // Добавляем обработчик клика
    dieElement.addEventListener('click', () => {
        if (isSelected) {
            // Удаляем из выбранных
            removeDiceFromSelected(die.id);
        } else {
            // Добавляем в выбранные
            addDiceToSelected(die);
        }
    });
    
    // Добавляем обработчик для информации о кубике
    dieElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showDiceInfo(die);
    });
    
    return dieElement;
}

// Функция добавления кубика в выбранные
function addDiceToSelected(die) {
    // Проверяем, не превышено ли максимальное количество
    if (playerData.selectedDice.length >= 5) {
        showGameMessage("You can select maximum 5 dice", "warning");
        return;
    }
    
    // Добавляем кубик в выбранные
    playerData.selectedDice.push(die);
    
    // Сохраняем данные
    savePlayerData();
    
    // Обновляем отображение
    loadDiceInventory();
}

// Функция удаления кубика из выбранных
function removeDiceFromSelected(dieId) {
    // Проверяем, не останется ли менее 2 кубиков
    if (playerData.selectedDice.length <= 2) {
        showGameMessage("You must have at least 2 dice selected", "warning");
        return;
    }
    
    // Удаляем кубик из выбранных
    playerData.selectedDice = playerData.selectedDice.filter(die => die.id !== dieId);
    
    // Сохраняем данные
    savePlayerData();
    
    // Обновляем отображение
    loadDiceInventory();
}

// Функция отображения информации о кубике
function showDiceInfo(die) {
    // Получаем элементы модального окна
    const modal = document.getElementById('item-info-modal');
    const title = document.getElementById('item-info-title');
    const content = document.getElementById('item-info-content');
    
    if (!modal || !title || !content) return;
    
    // Устанавливаем заголовок
    title.textContent = die.name;
    
    // Формируем содержимое
    let contentHTML = '';
    
    // Изображение
    contentHTML += `<img src="${die.image || 'assets/dice/default/dice-set.png'}" alt="${die.name}" class="info-image">`;
    
    // Тип и редкость
    contentHTML += `<div class="info-type">Type: ${die.type}</div>`;
    if (die.rarity) {
        contentHTML += `<div class="info-rarity">Rarity: ${die.rarity}</div>`;
    }
    
    // Описание
    if (die.description) {
        contentHTML += `<div class="info-description">${die.description}</div>`;
    }
    
    // Эффект для специальных кубиков
    if (die.effect) {
        contentHTML += `<div class="info-effect">${getEffectDescription(die.effect, die.value)}</div>`;
    }
    
    // Обновляем содержимое
    content.innerHTML = contentHTML;
    
    // Показываем модальное окно
    modal.style.display = 'block';
}

// Функция загрузки карт по выбранному режиму отображения
function loadCardsByView(viewMode) {
    // Получаем контейнер
    const cardsContainer = document.getElementById('cards-inventory');
    if (!cardsContainer) return;
    
    // Очищаем контейнер
    cardsContainer.innerHTML = '';
    
    // Скрываем уведомление о режиме замены
    document.getElementById('replace-mode-notice').style.display = 'none';
    inventoryState.cardReplaceMode = false;
    inventoryState.currentCardToReplace = null;
    
    if (viewMode === 'suit') {
        // Отображение по мастям
        loadCardsBySuit(cardsContainer);
    } else if (viewMode === 'value') {
        // Отображение по значениям
        loadCardsByValue(cardsContainer);
    } else if (viewMode === 'special') {
        // Отображение специальных карт
        loadSpecialCards(cardsContainer);
    }
}

// Функция загрузки карт по мастям
function loadCardsBySuit(container) {
    // Массивы для разных мастей
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // Проходим по мастям
    suits.forEach(suit => {
        // Создаем заголовок для масти
        const suitHeader = document.createElement('h3');
        suitHeader.className = `card-${suit}`;
        suitHeader.textContent = getSuitDisplayName(suit);
        container.appendChild(suitHeader);
        
        // Создаем контейнер для карт этой масти
        const suitContainer = document.createElement('div');
        suitContainer.className = 'cards-grid';
        container.appendChild(suitContainer);
        
        // Загружаем карты для этой масти
        values.forEach(value => {
            const cardKey = `${value}_of_${suit}`;
            const card = playerData.deck[cardKey];
            
            if (card) {
                const cardElement = createCardElement(card);
                suitContainer.appendChild(cardElement);
            }
        });
    });
}

// Функция загрузки карт по значениям
function loadCardsByValue(container) {
    // Массивы для значений
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    
    // Проходим по значениям
    values.forEach(value => {
        // Создаем заголовок для значения
        const valueHeader = document.createElement('h3');
        valueHeader.textContent = getValueDisplayName(value);
        container.appendChild(valueHeader);
        
        // Создаем контейнер для карт этого значения
        const valueContainer = document.createElement('div');
        valueContainer.className = 'cards-grid';
        container.appendChild(valueContainer);
        
        // Загружаем карты для этого значения
        suits.forEach(suit => {
            const cardKey = `${value}_of_${suit}`;
            const card = playerData.deck[cardKey];
            
            if (card) {
                const cardElement = createCardElement(card);
                valueContainer.appendChild(cardElement);
            }
        });
    });
}

// Функция загрузки специальных карт
function loadSpecialCards(container) {
    // Создаем заголовок
    const header = document.createElement('h3');
    header.textContent = 'Available Special Cards';
    container.appendChild(header);
    
    // Создаем контейнер для карт
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-grid';
    container.appendChild(cardsContainer);
    
    // Фильтруем специальные карты из инвентаря
    const specialCards = playerData.inventory.cards.filter(card => 
        card.type === 'special-card'
    );
    
    // Если нет специальных карт, показываем сообщение
    if (specialCards.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'You don\'t have any special cards yet. Purchase them in the shop!';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '20px';
        cardsContainer.appendChild(emptyMessage);
        return;
    }
    
    // Загружаем специальные карты
    specialCards.forEach(card => {
        // Проверяем, не используется ли уже эта карта
        const isUsed = Object.values(playerData.deck).some(deckCard => 
            deckCard.id === card.id
        );
        
        // Создаем элемент карты
        const cardElement = createSpecialCardElement(card, isUsed);
        cardsContainer.appendChild(cardElement);
    });
    
    // Добавляем заголовок для скинов карт
    const skinsHeader = document.createElement('h3');
    skinsHeader.textContent = 'Available Card Skins';
    container.appendChild(skinsHeader);
    
    // Создаем контейнер для скинов
    const skinsContainer = document.createElement('div');
    skinsContainer.className = 'cards-grid';
    container.appendChild(skinsContainer);
    
    // Фильтруем скины карт из инвентаря
    const cardSkins = playerData.inventory.cards.filter(card => 
        card.type === 'card-skin'
    );
    
    // Если нет скинов карт, показываем сообщение
    if (cardSkins.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'You don\'t have any card skins yet. Purchase them in the shop!';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '20px';
        skinsContainer.appendChild(emptyMessage);
        return;
    }
    
    // Загружаем скины карт
    cardSkins.forEach(card => {
        // Проверяем, не используется ли уже этот скин
        const isUsed = Object.values(playerData.deck).some(deckCard => 
            deckCard.id === card.id
        );
        
        // Создаем элемент карты
        const cardElement = createSpecialCardElement(card, isUsed);
        skinsContainer.appendChild(cardElement);
    });
}

// Функция создания элемента карты
function createCardElement(card) {
    // Создаем элемент
    const cardElement = document.createElement('div');
    cardElement.className = `card-item ${card.suit}`;
    cardElement.setAttribute('data-card-key', `${card.value}_of_${card.suit}`);
    
    // Определяем класс для текста в зависимости от масти
    const textClass = card.suit === 'hearts' || card.suit === 'diamonds' ? 
        'card-hearts' : 'card-clubs';
    
    // Создаем содержимое
    cardElement.innerHTML = `
        <img src="${card.image}" alt="${card.name}">
        <div class="card-item-name ${textClass}">${getShortCardName(card)}</div>
    `;
    
    // Добавляем индикатор для специальных карт
    if (card.type === 'special-card') {
        const specialIndicator = document.createElement('div');
        specialIndicator.className = 'special-indicator';
        specialIndicator.textContent = 'S';
        cardElement.appendChild(specialIndicator);
    } else if (card.type !== 'standard') {
        const skinIndicator = document.createElement('div');
        skinIndicator.className = 'special-indicator';
        skinIndicator.textContent = '★';
        skinIndicator.style.backgroundColor = '#d4c2a7';
        cardElement.appendChild(skinIndicator);
    }
    
    // Добавляем обработчик клика
    cardElement.addEventListener('click', () => {
        if (inventoryState.cardReplaceMode) {
            // Ничего не делаем, если это та же карта, которую мы хотим заменить
            return;
        }
        
        // Переходим в режим замены карты
        startCardReplaceMode(card);
    });
    
    // Добавляем обработчик для информации о карте
    cardElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCardInfo(card);
    });
    
    return cardElement;
}

// Функция создания элемента специальной карты
function createSpecialCardElement(card, isUsed) {
    // Если у карты нет изображения, используем стандартное
    const cardImage = card.image || `assets/cards/default/A_of_spades.png`;
    
    // Создаем элемент
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    if (card.rarity) cardElement.classList.add(card.rarity);
    if (isUsed) cardElement.classList.add('used');
    cardElement.setAttribute('data-id', card.id);
    
    // Создаем содержимое
    cardElement.innerHTML = `
        <img src="${cardImage}" alt="${card.name}">
        <div class="card-item-name">${card.name}</div>
    `;
    
    // Если карта используется, добавляем индикатор
    if (isUsed) {
        const usedIndicator = document.createElement('div');
        usedIndicator.className = 'special-indicator';
        usedIndicator.textContent = '✓';
        usedIndicator.style.backgroundColor = '#3a4a2a';
        cardElement.appendChild(usedIndicator);
        
        // Добавляем затемнение
        cardElement.style.opacity = '0.7';
    }
    
    // Добавляем обработчик клика
    cardElement.addEventListener('click', () => {
        if (inventoryState.cardReplaceMode && !isUsed) {
            // Заменяем карту
            replaceCard(card);
        } else if (isUsed) {
            // Показываем сообщение, что карта уже используется
            showGameMessage("This card is already in use", "info");
        } else {
            // Показываем инструкцию
            showGameMessage("First select a card in your deck to replace", "info");
        }
    });
    
    // Добавляем обработчик для информации о карте
    cardElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCardInfo(card);
    });
    
    return cardElement;
}

// Функция начала режима замены карты
function startCardReplaceMode(card) {
    // Сохраняем текущую карту для замены
    inventoryState.cardReplaceMode = true;
    inventoryState.currentCardToReplace = card;
    
    // Показываем уведомление
    const replaceNotice = document.getElementById('replace-mode-notice');
    const cardToReplace = document.getElementById('card-to-replace');
    
    if (replaceNotice && cardToReplace) {
        cardToReplace.textContent = getShortCardName(card);
        replaceNotice.style.display = 'flex';
    }
    
    // Переключаемся на просмотр специальных карт
    document.getElementById('view-special-cards').click();
}

// Функция отмены режима замены карты
function cancelCardReplace() {
    // Сбрасываем режим замены
    inventoryState.cardReplaceMode = false;
    inventoryState.currentCardToReplace = null;
    
    // Скрываем уведомление
    document.getElementById('replace-mode-notice').style.display = 'none';
    
    // Возвращаемся к просмотру по мастям
    document.getElementById('view-by-suit').click();
}

// Функция замены карты
function replaceCard(newCard) {
    // Получаем данные исходной карты
    const originalCard = inventoryState.currentCardToReplace;
    
    if (!originalCard) {
        showGameMessage("Error: No card selected for replacement", "warning");
        return;
    }
    
    // Ключ карты в колоде
    const cardKey = `${originalCard.value}_of_${originalCard.suit}`;
    
    // Создаем обновленную карту
    const updatedCard = {
        value: originalCard.value,
        suit: originalCard.suit,
        type: newCard.type,
        name: newCard.name,
        image: newCard.image.replace('{suit}', originalCard.suit),
        id: newCard.id,
        effect: newCard.effect,
        rarity: newCard.rarity
    };
    
    // Обновляем карту в колоде
    playerData.deck[cardKey] = updatedCard;
    
    // Сохраняем данные
    savePlayerData();
    
    // Выходим из режима замены
    cancelCardReplace();
    
    // Показываем сообщение
    showGameMessage(`Card replaced successfully with ${newCard.name}`, "success");
}

// Функция отображения информации о карте
function showCardInfo(card) {
    // Получаем элементы модального окна
    const modal = document.getElementById('item-info-modal');
    const title = document.getElementById('item-info-title');
    const content = document.getElementById('item-info-content');
    
    if (!modal || !title || !content) return;
    
    // Устанавливаем заголовок
    title.textContent = card.name;
    
    // Формируем содержимое
    let contentHTML = '';
    
    // Изображение
    contentHTML += `<img src="${card.image}" alt="${card.name}" class="info-image">`;
    
    // Значение и масть (если стандартная карта)
    if (card.value && card.suit) {
        contentHTML += `<div>Value: ${getValueDisplayName(card.value)}</div>`;
        contentHTML += `<div>Suit: ${getSuitDisplayName(card.suit)}</div>`;
    }
    
    // Тип и редкость
    contentHTML += `<div class="info-type">Type: ${card.type}</div>`;
    if (card.rarity) {
        contentHTML += `<div class="info-rarity">Rarity: ${card.rarity}</div>`;
    }
    
    // Описание
    if (card.description) {
        contentHTML += `<div class="info-description">${card.description}</div>`;
    }
    
    // Эффект для специальных карт
    if (card.effect) {
        contentHTML += `<div class="info-effect">${getEffectDescription(card.effect, card.value)}</div>`;
    }
    
    // Обновляем содержимое
    content.innerHTML = contentHTML;
    
    // Показываем модальное окно
    modal.style.display = 'block';
}

// Вспомогательные функции

// Функция генерации стандартной колоды
function generateStandardDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const deck = [];
    
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({
                value: value,
                suit: suit
            });
        });
    });
    
    return deck;
}

// Функция получения отображаемого имени масти
function getSuitDisplayName(suit) {
    switch (suit) {
        case 'hearts': return '♥ Hearts';
        case 'diamonds': return '♦ Diamonds';
        case 'clubs': return '♣ Clubs';
        case 'spades': return '♠ Spades';
        default: return suit;
    }
}

// Функция получения отображаемого имени значения
function getValueDisplayName(value) {
    switch (value) {
        case 'A': return 'Ace (A)';
        case 'K': return 'King (K)';
        case 'Q': return 'Queen (Q)';
        case 'J': return 'Jack (J)';
        default: return value;
    }
}

// Функция получения короткого имени карты
function getShortCardName(card) {
    const valueSymbols = {
        'A': 'A',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        '7': '7',
        '8': '8',
        '9': '9',
        '10': '10',
        'J': 'J',
        'Q': 'Q',
        'K': 'K'
    };
    
    const suitSymbols = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
    };
    
    return `${valueSymbols[card.value]} ${suitSymbols[card.suit]}`;
}

// Функция для получения описания эффекта
function getEffectDescription(effect, value) {
    switch (effect) {
        case 'pointsMultiplier':
            return `Gives ${value}x points multiplier when used in a combination`;
        case 'wildcard':
            return 'Can be used with any die combination';
        case 'extraTurn':
            return 'Gives an extra turn when successfully used in a combination';
        case 'goldMultiplier':
            return 'Adds 1.25x multiplier to silver rewards for the level';
        case 'weightedLow':
            return 'Higher chance of rolling smaller numbers (1-3)';
        case 'weightedHigh':
            return 'Higher chance of rolling larger numbers (4-6)';
        case 'weightedEven':
            return 'Higher chance of rolling even numbers (2, 4, 6)';
        case 'weightedOdd':
            return 'Higher chance of rolling odd numbers (1, 3, 5)';
        default:
            return effect;
    }
}