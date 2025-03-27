/**
 * Shop.js - Модуль для логики магазина с разделением карт по мастям
 */

// Функция открытия магазина
function openShop() {
    // Обновляем отображение количества серебра
    document.getElementById('shop-silver').textContent = playerData.silver;
    
    // Загружаем предметы в магазин
    loadShopItems();
    
    // Показываем экран магазина
    showScreen('shop-container');
}

// Функция загрузки предметов в магазин
function loadShopItems() {
    // Получаем контейнеры для каждой категории товаров
    const cardSkinsContainer = document.getElementById('card-skins-items');
    const diceSkinsContainer = document.getElementById('dice-skins-items');
    const specialCardsContainer = document.getElementById('special-cards-items');
    const specialDiceContainer = document.getElementById('special-dice-items');
    
    // Очищаем контейнеры
    cardSkinsContainer.innerHTML = '';
    diceSkinsContainer.innerHTML = '';
    specialCardsContainer.innerHTML = '';
    specialDiceContainer.innerHTML = '';
    
    // Загружаем данные магазина
    const shopData = getShopData();
    
    // Создаем заголовки категорий
    createCategoryHeaders(cardSkinsContainer, diceSkinsContainer, specialCardsContainer, specialDiceContainer);
    
    // Отображение товаров с группировкой по типу и значению
    displayCardSkins(cardSkinsContainer, shopData);
    displayDiceSkins(diceSkinsContainer, shopData);
    displaySpecialCards(specialCardsContainer, shopData);
    displaySpecialDice(specialDiceContainer, shopData);
}

// Функция создания заголовков категорий
function createCategoryHeaders(cardSkinsContainer, diceSkinsContainer, specialCardsContainer, specialDiceContainer) {
    // Заголовок для скинов карт
    const cardSkinsHeader = document.createElement('div');
    cardSkinsHeader.className = 'category-header';
    cardSkinsHeader.innerHTML = '<h3>Card Skins</h3><p>Customize your cards with these stylish designs</p>';
    cardSkinsContainer.appendChild(cardSkinsHeader);
    
    // Заголовок для скинов кубиков
    const diceSkinsHeader = document.createElement('div');
    diceSkinsHeader.className = 'category-header';
    diceSkinsHeader.innerHTML = '<h3>Dice Skins</h3><p>Change the look of your dice</p>';
    diceSkinsContainer.appendChild(diceSkinsHeader);
    
    // Заголовок для специальных карт
    const specialCardsHeader = document.createElement('div');
    specialCardsHeader.className = 'category-header';
    specialCardsHeader.innerHTML = '<h3>Special Cards</h3><p>Cards with unique abilities and effects</p>';
    specialCardsContainer.appendChild(specialCardsHeader);
    
    // Заголовок для специальных кубиков
    const specialDiceHeader = document.createElement('div');
    specialDiceHeader.className = 'category-header';
    specialDiceHeader.innerHTML = '<h3>Special Dice</h3><p>Dice with unique properties and effects</p>';
    specialDiceContainer.appendChild(specialDiceHeader);
}

// Функция получения символа для масти
function getSymbolForSuit(suit) {
    switch (suit) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        case 'spades': return '♠';
        default: return '';
    }
}

// Функция получения названия масти
function getSuitName(suit) {
    switch (suit) {
        case 'hearts': return 'Hearts';
        case 'diamonds': return 'Diamonds';
        case 'clubs': return 'Clubs';
        case 'spades': return 'Spades';
        default: return '';
    }
}

// Функция создания элемента товара в магазине
function createShopItem(item, type, isOwned) {
    // Создаем элемент товара
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.setAttribute('data-id', item.id);
    itemElement.setAttribute('data-rarity', item.rarity);
    
    // Если это карта, добавляем масть и значение как атрибут
    if (item.suit) {
        itemElement.setAttribute('data-suit', item.suit);
    }
    if (item.value) {
        itemElement.setAttribute('data-value', item.value);
    }
    
    // Определяем класс изображения
    const imageClass = type === 'card' || type === 'special-card' ? 'card-image' : 'dice-image';
    
    // Устанавливаем цвет для символов масти
    let suitClass = '';
    if (item.suit) {
        suitClass = item.suit === 'hearts' || item.suit === 'diamonds' ? 'red-suit' : 'black-suit';
    }
    
    // Базовый HTML для товара
    let itemHTML = `
        <img src="${item.image}" alt="${item.name}" class="shop-image ${imageClass}">
        <span class="${suitClass}">${item.name}</span>
        <p>${item.price} Silver</p>
        <button class="description-btn">Description</button>
        <button class="buy-btn" ${isOwned ? 'disabled' : ''}>${isOwned ? 'Owned' : 'Buy'}</button>
    `;
    
    // Добавляем партнерскую информацию, если она есть
    if (item.partner) {
        itemHTML += `
            <div class="partner-section">
                <img src="${item.partner.logo}" alt="Partner Logo" class="partner-logo">
                <div class="partner-socials">
                    ${item.partner.twitter ? `<a href="${item.partner.twitter}" target="_blank"><img src="assets/images/ui/twitter.png" alt="Twitter" class="partner-social-icon"></a>` : ''}
                    ${item.partner.discord ? `<a href="${item.partner.discord}" target="_blank"><img src="assets/images/ui/discord.png" alt="Discord" class="partner-social-icon"></a>` : ''}
                </div>
            </div>
        `;
    }
    
    // Устанавливаем HTML
    itemElement.innerHTML = itemHTML;
    
    // Добавляем обработчики событий
    const descriptionBtn = itemElement.querySelector('.description-btn');
    const buyBtn = itemElement.querySelector('.buy-btn');
    
    // Предотвращаем повторную анимацию при покупке
    itemElement.setAttribute('data-animated', 'false');
    
    descriptionBtn.addEventListener('click', () => showItemDescription(item));
    
    if (!isOwned) {
        buyBtn.addEventListener('click', () => {
            buyItem(item, type);
            // Помечаем, что элемент уже анимирован
            itemElement.setAttribute('data-animated', 'true');
        });
    }
    
    return itemElement;
}

// Функция показа описания товара
function showItemDescription(item) {
    // Получаем элементы модального окна
    const modal = document.getElementById('shop-description-modal');
    const title = document.getElementById('item-title');
    const description = document.getElementById('item-description');
    
    // Заполняем информацией
    title.textContent = item.parentId ? getItemNameById(item.parentId) : item.name;
    if (item.suit) {
        const suitClass = item.suit === 'hearts' || item.suit === 'diamonds' ? 'red-suit' : 'black-suit';
        const suitSymbol = getSymbolForSuit(item.suit);
        title.innerHTML += ` <span class="${suitClass}">${suitSymbol} ${getSuitName(item.suit)}</span>`;
    }
    
    // Формируем полное описание
    let fullDescription = `${item.description}\n\nRarity: ${item.rarity}`;
    
    // Добавляем информацию об эффекте для специальных предметов
    if (item.effect) {
        let effectDescription = '';
        
        switch (item.effect) {
            case 'pointsMultiplier':
                effectDescription = `Gives ${item.value}x points multiplier when used in a combination.`;
                break;
            case 'wildcard':
                effectDescription = 'Can be used with any die combination, like an Ace but without multiplier.';
                break;
            case 'extraTurn':
                effectDescription = 'Gives an extra turn when successfully used in a combination.';
                break;
            case 'goldMultiplier':
                effectDescription = 'Adds 1.25x multiplier to silver rewards for the level.';
                break;
            case 'weightedLow':
                effectDescription = 'Higher chance of rolling smaller numbers (1-3).';
                break;
            case 'weightedHigh':
                effectDescription = 'Higher chance of rolling larger numbers (4-6).';
                break;
            case 'weightedEven':
                effectDescription = 'Higher chance of rolling even numbers (2, 4, 6).';
                break;
            case 'weightedOdd':
                effectDescription = 'Higher chance of rolling odd numbers (1, 3, 5).';
                break;
            default:
                effectDescription = 'Special effect: ' + item.effect;
        }
        
        fullDescription += `\n\nEffect: ${effectDescription}`;
    }
    
    description.textContent = fullDescription;
    
    // Показываем модальное окно
    modal.style.display = 'block';
}

// Функция для получения названия предмета по его ID
function getItemNameById(itemId) {
    const shopData = getShopData();
    
    // Проверяем все категории
    if (shopData.cardSkins[itemId]) return shopData.cardSkins[itemId].name;
    if (shopData.diceSkins[itemId]) return shopData.diceSkins[itemId].name;
    if (shopData.specialCards[itemId]) return shopData.specialCards[itemId].name;
    if (shopData.specialDice[itemId]) return shopData.specialDice[itemId].name;
    
    return 'Unknown Item';
}

// Функция закрытия описания товара
function closeItemDescription() {
    document.getElementById('shop-description-modal').style.display = 'none';
}

// Функция покупки товара
function buyItem(item, type) {
    // Проверяем, достаточно ли серебра
    if (playerData.silver < item.price) {
        showGameMessage("Not enough silver to buy this item", "warning");
        return;
    }
    
    // Отнимаем серебро
    playerData.silver -= item.price;
    
    // Добавляем товар в инвентарь игрока
    if (type === 'card' || type === 'special-card') {
        playerData.inventory.cards.push({
            id: item.id,
            name: item.name,
            image: item.image,
            type: type,
            effect: item.effect,
            value: item.value,
            rarity: item.rarity,
            suit: item.suit,
            parentId: item.parentId
        });
    } else {
        playerData.inventory.dice.push({
            id: item.id,
            name: item.name,
            image: item.image,
            type: type,
            effect: item.effect,
            weights: item.weights,
            value: item.value,
            rarity: item.rarity
        });
    }
    
    // Сохраняем данные игрока
    savePlayerData();
    
    // Обновляем отображение количества серебра
    document.getElementById('shop-silver').textContent = playerData.silver;
    
    // Обновляем отображение товаров
    loadShopItems();
    
    // Показываем сообщение об успешной покупке
    showGameMessage(`You've successfully purchased ${item.name}!`, "success");
}

// Функция получения данных магазина
function getShopData() {
    // Пытаемся получить данные из IndexedDB или localStorage
    const storedData = localStorage.getItem('shopItems');
    
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (error) {
            console.error("Error parsing shop data:", error);
        }
    }
    
    // Возвращаем стандартные данные, если нет сохраненных
    return {
        cardSkins: {
            'card-skin-1': {
                name: "Medieval Cards",
                price: 300,
                rarity: "Common",
                description: "A set of cards with medieval design.",
                image: "assets/cards/skins/medieval_{suit}.png"
            },
            'card-skin-2': {
                name: "Royal Flush",
                price: 500,
                rarity: "Rare",
                description: "Elegant cards with royal patterns.",
                image: "assets/cards/skins/royal_{suit}.png"
            },
            'card-skin-3': {
                name: "Dragon Scale Cards",
                price: 800,
                rarity: "Epic",
                description: "Cards crafted from mystical dragon scales.",
                image: "assets/cards/skins/dragon_{suit}.png"
            }
        },
        diceSkins: {
            'dice-skin-1': {
                name: "Wooden Dice",
                price: 200,
                rarity: "Common",
                description: "Simple wooden dice carved by hand.",
                image: "assets/dice/skins/wooden.png"
            },
            'dice-skin-2': {
                name: "Stone Dice",
                price: 400,
                rarity: "Rare",
                description: "Solid stone dice with engraved numbers.",
                image: "assets/dice/skins/stone.png"
            },
            'dice-skin-3': {
                name: "Crystal Dice",
                price: 700,
                rarity: "Epic",
                description: "Magical crystal dice that shimmer with power.",
                image: "assets/dice/skins/crystal.png"
            }
        },
        specialCards: {
            'special-card-1': {
                name: "Lucky Seven",
                price: 600,
                rarity: "Rare",
                description: "Gives 1.5x more points when used in a combination.",
                effect: "pointsMultiplier",
                value: 1.5,
                image: "assets/cards/special/lucky-seven_{suit}.png"
            },
            'special-card-2': {
                name: "Joker's Wildcard",
                price: 1000,
                rarity: "Epic",
                description: "Can be used with any die combination, like an Ace but without multiplier.",
                effect: "wildcard",
                image: "assets/cards/special/joker_{suit}.png"
            },
            'special-card-3': {
                name: "Extra Turn Card",
                price: 800,
                rarity: "Epic",
                description: "Gives an extra turn when successfully used in a combination.",
                effect: "extraTurn",
                image: "assets/cards/special/extra-turn_{suit}.png"
            }
        },
        specialDice: {
            'special-dice-1': {
                name: "Lower Numbers Die",
                price: 500,
                rarity: "Rare",
                description: "Higher chance of rolling smaller numbers (1-3).",
                effect: "weightedLow",
                weights: [30, 22.5, 17.5, 15, 10, 5],
                image: "assets/dice/special/low-numbers.png"
            },
            'special-dice-2': {
                name: "Higher Numbers Die",
                price: 500,
                rarity: "Rare",
                description: "Higher chance of rolling larger numbers (4-6).",
                effect: "weightedHigh",
                weights: [5, 10, 15, 17.5, 22.5, 30],
                image: "assets/dice/special/high-numbers.png"
            },
            'special-dice-3': {
                name: "Bonus Points Die",
                price: 800,
                rarity: "Epic",
                description: "Gives 1.5x points multiplier when used in a combination.",
                effect: "pointsMultiplier",
                value: 1.5,
                image: "assets/dice/special/bonus-points.png"
            }
        }
    };
}

// Функция сохранения данных магазина
function saveShopData(shopData) {
    try {
        localStorage.setItem('shopItems', JSON.stringify(shopData));
        return true;
    } catch (error) {
        console.error("Error saving shop data:", error);
        return false;
    }
}

// Инициализация магазина
function initShop() {
    // Загружаем сохраненные товары из localStorage
    const storedData = localStorage.getItem('shopItems');
    if (!storedData) {
        // Если нет сохраненных данных, инициализируем стандартные и сохраняем
        saveShopData(getShopData());
    }
    
    // Добавляем стили для символов масти
    addSuitStyles();
}

// Функция добавления стилей для символов масти
function addSuitStyles() {
    // Создаем элемент стиля
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .red-suit {
            color: #cc3333;
        }
        .black-suit {
            color: #d4c2a7;
        }
        .shop-item[data-suit="hearts"],
        .shop-item[data-suit="diamonds"] {
            border-color: #cc3333;
        }
        .shop-item[data-suit="clubs"],
        .shop-item[data-suit="spades"] {
            border-color: #d4c2a7;
        }
        .category-header {
            margin-bottom: 15px;
            text-align: center;
        }
        .category-header h3 {
            margin-bottom: 5px;
        }
        .category-header p {
            font-size: 14px;
            opacity: 0.8;
        }
        .skin-group, .special-card-group {
            background-color: rgba(50, 40, 30, 0.3);
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
        }
        .group-header {
            width: 100%;
            text-align: center;
            margin-bottom: 10px;
            color: #b89d6e;
            font-size: 16px;
        }
    `;
    
    // Добавляем стили в head
    document.head.appendChild(styleElement);
}

// Вызываем инициализацию при загрузке скрипта
initShop();

// Функция для отображения скинов карт с группировкой по значению и масти
function displayCardSkins(container, shopData) {
    // Группировка скинов карт по значению
    const valueGroups = {};
    
    // Проходим по всем скинам карт
    Object.entries(shopData.cardSkins).forEach(([skinId, skinData]) => {
        // Для каждого значения карты
        ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].forEach(value => {
            if (!valueGroups[value]) {
                valueGroups[value] = [];
            }
            
            // Добавляем скин с этим значением
            valueGroups[value].push({
                id: `${skinId}_${value}`,
                name: `${skinData.name} (${value})`,
                originalName: skinData.name,
                value: value,
                price: skinData.price,
                rarity: skinData.rarity,
                description: skinData.description,
                imagePath: skinData.image,
                parentId: skinId
            });
        });
    });
    
    // Создаем группы для каждого значения
    Object.entries(valueGroups).forEach(([value, skins]) => {
        // Создаем заголовок для значения
        const valueHeader = document.createElement('h3');
        valueHeader.textContent = getValueDisplayName(value);
        container.appendChild(valueHeader);
        
        // Создаем контейнер для скинов этого значения
        const valueContainer = document.createElement('div');
        valueContainer.className = 'skin-group';
        container.appendChild(valueContainer);
        
        // Добавляем скины
        skins.forEach(skin => {
            // Создаем подгруппу для скина
            const skinGroup = document.createElement('div');
            skinGroup.className = 'card-skin-item';
            skinGroup.innerHTML = `<h4>${skin.originalName}</h4>`;
            valueContainer.appendChild(skinGroup);
            
            // Добавляем карты по мастям
            ['hearts', 'diamonds', 'clubs', 'spades'].forEach(suit => {
                // Формируем ID для карты конкретной масти
                const itemId = `${skin.id}_${suit}`;
                
                // Проверяем, куплен ли скин для этой масти
                const isOwned = playerData.inventory.cards.some(card => card.id === itemId);
                
                // Создаем элемент товара
                const itemElement = createShopItem({
                    id: itemId,
                    name: `${getSymbolForSuit(suit)} ${getSuitName(suit)}`,
                    price: skin.price,
                    rarity: skin.rarity,
                    description: skin.description,
                    image: skin.imagePath.replace('{suit}', suit).replace('{value}', value),
                    parentId: skin.parentId,
                    suit: suit,
                    value: value
                }, 'card', isOwned);
                
                // Добавляем в группу
                skinGroup.appendChild(itemElement);
            });
        });
    });
}

// Функция для отображения скинов кубиков
function displayDiceSkins(container, shopData) {
    Object.entries(shopData.diceSkins).forEach(([skinId, skinData]) => {
        // Проверяем, куплен ли скин
        const isOwned = playerData.inventory.dice.some(die => die.id === skinId);
        
        // Собираем изображения для всех значений
        const dieImages = {};
        for (let i = 1; i <= 6; i++) {
            dieImages[i] = skinData.image.replace('{value}', i);
        }
        
        // Создаем элемент товара с дополнительными данными
        const itemElement = createShopItem({
            id: skinId,
            name: skinData.name,
            price: skinData.price,
            rarity: skinData.rarity,
            description: skinData.description,
            image: skinData.image.replace('{value}', ''), // Общее изображение
            images: dieImages // Изображения для каждого значения
        }, 'dice', isOwned);
        
        // Добавляем в контейнер
        container.appendChild(itemElement);
    });
}

// Функция для отображения специальных карт
function displaySpecialCards(container, shopData) {
    // Подход аналогичен displayCardSkins
    const valueGroups = {};
    
    Object.entries(shopData.specialCards).forEach(([cardId, cardData]) => {
        ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].forEach(value => {
            if (!valueGroups[value]) {
                valueGroups[value] = [];
            }
            
            valueGroups[value].push({
                id: `${cardId}_${value}`,
                name: `${cardData.name} (${value})`,
                originalName: cardData.name,
                value: value,
                price: cardData.price,
                rarity: cardData.rarity,
                description: cardData.description,
                imagePath: cardData.image,
                effect: cardData.effect,
                effectValue: cardData.value,
                parentId: cardId,
                partner: cardData.partner
            });
        });
    });
    
    Object.entries(valueGroups).forEach(([value, cards]) => {
        const valueHeader = document.createElement('h3');
        valueHeader.textContent = getValueDisplayName(value);
        container.appendChild(valueHeader);
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'special-card-group';
        container.appendChild(valueContainer);
        
        cards.forEach(card => {
            const cardGroup = document.createElement('div');
            cardGroup.className = 'card-special-item';
            cardGroup.innerHTML = `<h4>${card.originalName}</h4>`;
            valueContainer.appendChild(cardGroup);
            
            ['hearts', 'diamonds', 'clubs', 'spades'].forEach(suit => {
                const itemId = `${card.id}_${suit}`;
                const isOwned = playerData.inventory.cards.some(c => c.id === itemId);
                
                const itemElement = createShopItem({
                    id: itemId,
                    name: `${getSymbolForSuit(suit)} ${getSuitName(suit)}`,
                    price: card.price,
                    rarity: card.rarity,
                    description: card.description,
                    image: card.imagePath.replace('{suit}', suit).replace('{value}', value),
                    effect: card.effect,
                    value: card.effectValue,
                    parentId: card.parentId,
                    suit: suit,
                    cardValue: value,
                    partner: card.partner
                }, 'special-card', isOwned);
                
                cardGroup.appendChild(itemElement);
            });
        });
    });
}

// Функция для отображения специальных кубиков
function displaySpecialDice(container, shopData) {
    Object.entries(shopData.specialDice).forEach(([diceId, diceData]) => {
        // Проверяем, куплен ли кубик
        const isOwned = playerData.inventory.dice.some(die => die.id === diceId);
        
        // Собираем изображения для всех значений
        const dieImages = {};
        for (let i = 1; i <= 6; i++) {
            dieImages[i] = diceData.image.replace('{value}', i);
        }
        
        // Создаем элемент товара с дополнительными данными
        const itemElement = createShopItem({
            id: diceId,
            name: diceData.name,
            price: diceData.price,
            rarity: diceData.rarity,
            description: diceData.description,
            image: diceData.image.replace('{value}', ''), // Общее изображение
            images: dieImages, // Изображения для каждого значения
            effect: diceData.effect,
            weights: diceData.weights,
            value: diceData.value,
            partner: diceData.partner
        }, 'special-dice', isOwned);
        
        // Добавляем в контейнер
        container.appendChild(itemElement);
    });
}