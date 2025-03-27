/**
 * GameLogic.js - Основная игровая логика
 * 
 * Этот файл содержит функции для управления игровым процессом,
 * логику бросания кубиков, раздачи карт и подсчета очков.
 */

// Глобальное состояние игры
const gameState = {
    currentLevel: null,      // Текущий уровень
    currentTurn: 1,          // Текущий ход
    totalScore: 0,           // Общий счет
    turnScore: 0,            // Счет за текущий ход
    selectedDie: null,       // Выбранный кубик
    currentDice: [],         // Текущие значения кубиков
    currentCards: [],        // Текущие карты
    selectedCards: [],       // Выбранные карты
    isEndTurn: false,        // Флаг окончания хода
    statistics: {            // Статистика текущего уровня
        attempts: 0,
        turnsUsed: 0,
        silverEarned: 0
    }
};

// Функция для начала игры
function startGame(level) {
    console.log("Starting game for level:", level.id);
    
    // Сбрасываем состояние игры
    resetGameState();
    
    // Устанавливаем текущий уровень
    gameState.currentLevel = level;
    
    // Увеличиваем счетчик попыток
    gameState.statistics.attempts++;
    
    // Начинаем новый ход
    startNewTurn();
}

// Функция сброса состояния игры
function resetGameState() {
    gameState.currentLevel = null;
    gameState.currentTurn = 1;
    gameState.totalScore = 0;
    gameState.turnScore = 0;
    gameState.selectedDie = null;
    gameState.currentDice = [];
    gameState.currentCards = [];
    gameState.selectedCards = [];
    gameState.isEndTurn = false;
    
    // Сбрасываем статистику только если начинаем новую игру
    // (не сбрасываем счетчик попыток)
    gameState.statistics.turnsUsed = 0;
    gameState.statistics.silverEarned = 0;
    
    // Сбрасываем UI
    updateGameUI();
}

// Функция для начала нового хода
function startNewTurn() {
    console.log("Starting new turn:", gameState.currentTurn);
    
    // Сбрасываем состояние хода
    gameState.turnScore = 0;
    gameState.selectedDie = null;
    gameState.currentDice = [];
    gameState.currentCards = [];
    gameState.selectedCards = [];
    gameState.isEndTurn = false;
    
    // Обновляем номер текущего хода в интерфейсе
    document.getElementById('current-turn').textContent = gameState.currentTurn;
    
    // Обновляем счет за текущий ход
    document.getElementById('turn-score').textContent = '0';
    
    // Очищаем поле для карт
    document.getElementById('cards').innerHTML = '';
    
    // Очищаем информацию о валидных комбинациях
    document.getElementById('selected-die-value').textContent = '';
    document.getElementById('valid-combinations').textContent = '';
    
    // Отключаем кнопки
    document.getElementById('draw-card-btn').disabled = true;
    document.getElementById('end-turn-btn').disabled = true;
    
    // Бросаем кубики и раздаем карты
    rollDice();
}

// Функция для получения случайных 2 кубиков из выбранных
function getRandomSelectedDice() {
    // Проверяем наличие выбранных кубиков
    if (!playerData.selectedDice || playerData.selectedDice.length === 0) {
        // Если нет выбранных кубиков, используем стандартные
        return [
            { id: 'standard_dice_1', type: 'standard', name: 'Standard Dice' },
            { id: 'standard_dice_2', type: 'standard', name: 'Standard Dice' }
        ];
    }
    
    // Если выбрано ровно 2 кубика, возвращаем их
    if (playerData.selectedDice.length === 2) {
        return [...playerData.selectedDice];
    }
    
    // Если выбрано больше 2 кубиков, выбираем случайные 2
    const shuffled = [...playerData.selectedDice].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
}

// Функция для генерации взвешенного случайного значения
function generateWeightedValue(weights) {
    // Проверяем, что веса корректны
    if (!weights || weights.length !== 6) {
        return Math.floor(Math.random() * 6) + 1;
    }
    
    // Вычисляем сумму весов
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Генерируем случайное число в диапазоне [0, totalWeight)
    const random = Math.random() * totalWeight;
    
    // Определяем, какому кубику соответствует случайное число
    let weightSum = 0;
    for (let i = 0; i < weights.length; i++) {
        weightSum += weights[i];
        if (random < weightSum) {
            return i + 1; // +1, т.к. значения кубиков от 1 до 6
        }
    }
    
    // Если что-то пошло не так, возвращаем случайное значение
    return Math.floor(Math.random() * 6) + 1;
}

// Функция для раздачи карт с учетом колоды игрока
function dealCards(count) {
    // Очищаем текущие карты
    gameState.currentCards = [];
    document.getElementById('cards').innerHTML = '';
    
    // Создаем колоду на основе данных игрока
    let deck = [];
    
    if (playerData.deck) {
        // Используем колоду игрока
        Object.values(playerData.deck).forEach(card => {
            deck.push(card);
        });
    } else {
        // Создаем стандартную колоду
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        suits.forEach(suit => {
            values.forEach(value => {
                deck.push({
                    value: value,
                    suit: suit,
                    type: 'standard',
                    name: `${value} of ${suit}`,
                    image: `assets/cards/default/${value}_of_${suit}.png`
                });
            });
        });
    }
    
    // Перемешиваем колоду
    deck = shuffle(deck);
    
    // Раздаем карты
    const cardsContainer = document.getElementById('cards');
    
    for (let i = 0; i < count; i++) {
        // Если колода пуста, создаем новую
        if (deck.length === 0) {
            if (playerData.deck) {
                deck = [...Object.values(playerData.deck)];
            } else {
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                
                suits.forEach(suit => {
                    values.forEach(value => {
                        deck.push({
                            value: value,
                            suit: suit,
                            type: 'standard',
                            name: `${value} of ${suit}`,
                            image: `assets/cards/default/${value}_of_${suit}.png`
                        });
                    });
                });
            }
            deck = shuffle(deck);
        }
        
        // Берем карту с верха колоды
        const card = deck.pop();
        gameState.currentCards.push(card);
        
        // Создаем элемент карты
        const cardElement = document.createElement('div');
        cardElement.className = 'card dealing';
        cardElement.setAttribute('data-value', card.value);
        cardElement.setAttribute('data-suit', card.suit);
        if (card.id) cardElement.setAttribute('data-id', card.id);
        if (card.type) cardElement.setAttribute('data-type', card.type);
        if (card.effect) cardElement.setAttribute('data-effect', card.effect);
        
        // Добавляем изображение
        const cardImage = document.createElement('img');
        cardImage.src = card.image;
        cardImage.alt = card.name;
        cardElement.appendChild(cardImage);
        
        // Добавляем подпись
        const cardLabel = document.createElement('span');
        cardLabel.className = 'card-label';
        cardLabel.textContent = card.name;
        cardElement.appendChild(cardLabel);
        
        // Добавляем карту в контейнер
        cardsContainer.appendChild(cardElement);
        
        // Убираем класс анимации после завершения
        setTimeout(() => {
            cardElement.classList.remove('dealing');
            
            // Добавляем обработчик события для выбора карты
            cardElement.addEventListener('click', () => selectCard(cardElement, i));
        }, 300 * (i + 1)); // Задержка для последовательной анимации
    }
}

// Функция для генерации значения кубика с учетом его эффекта
function generateDieValue(dieData) {
    // Если нет данных о кубике или у него нет эффекта, используем обычный генератор
    if (!dieData || !dieData.effect) {
        return Math.floor(Math.random() * 6) + 1;
    }
    
    // Генерируем значение в зависимости от эффекта
    switch (dieData.effect) {
        case 'weightedLow':
            // Больше шансов на меньшие значения
            return generateWeightedValue([30, 22.5, 17.5, 15, 10, 5]);
        case 'weightedHigh':
            // Больше шансов на большие значения
            return generateWeightedValue([5, 10, 15, 17.5, 22.5, 30]);
        case 'weightedEven':
            // Больше шансов на четные значения
            return generateWeightedValue([8.3, 25, 8.3, 25, 8.3, 25]);
        case 'weightedOdd':
            // Больше шансов на нечетные значения
            return generateWeightedValue([25, 8.3, 25, 8.3, 25, 8.3]);
        default:
            // Обычный генератор
            return Math.floor(Math.random() * 6) + 1;
    }
}

// Функция для бросания кубиков с учетом новой логики инвентаря
function rollDice() {
    // Получаем элементы кубиков
    const diceElements = document.querySelectorAll('.die');
    
    // Удаляем предыдущие обработчики событий и классы
    diceElements.forEach(die => {
        die.classList.remove('selected');
        die.classList.add('rolling');
        
        // Сбрасываем обработчики
        const newDie = die.cloneNode(true);
        die.parentNode.replaceChild(newDie, die);
    });
    
    // Анимируем бросок (задержка для анимации)
    setTimeout(() => {
        // Случайно выбираем 2 кубика из выбранных в инвентаре
        const selectedDice = getRandomSelectedDice();
        
        // Генерируем значения для кубиков с учетом их эффектов
        gameState.currentDice = [];
        
        // Получаем элементы кубиков (обновленные)
        const updatedDiceElements = document.querySelectorAll('.die');
        
        updatedDiceElements.forEach((die, index) => {
            // Удаляем класс анимации
            die.classList.remove('rolling');
            
            // Получаем данные кубика
            const dieData = selectedDice[index];
            
            // Генерируем значение с учетом эффекта кубика
            const randomValue = generateDieValue(dieData);
            
            // Сохраняем значение и данные кубика
            gameState.currentDice.push({
                value: randomValue,
                data: dieData
            });
            
            // Обновляем изображение кубика
            const dieImage = die.querySelector('.die-image');
            if (dieImage) {
                // Если у кубика есть свое изображение для значения
                if (dieData && dieData.images && dieData.images[randomValue]) {
                    dieImage.src = dieData.images[randomValue];
                } else {
                    // Иначе используем стандартное изображение
                    dieImage.src = `assets/dice/default/${randomValue}.png`;
                }
                dieImage.alt = `Die ${randomValue}`;
            }
            
            // Устанавливаем значение атрибута
            die.setAttribute('data-value', randomValue);
            die.setAttribute('data-die-id', dieData ? dieData.id : 'standard');
            
            // Добавляем обработчик события для выбора кубика
            die.addEventListener('click', () => selectDie(die, index));
        });
        
        // Раздаем карты
        dealCards(3);
    }, 800); // Время анимации броска
}

// Функция для раздачи карт
function dealCards(count) {
    // Очищаем текущие карты
    gameState.currentCards = [];
    document.getElementById('cards').innerHTML = '';
    
    // Создаем стандартную колоду карт
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ value, suit });
        });
    });
    
    // Перемешиваем колоду
    deck = shuffle(deck);
    
    // Раздаем карты
    const cardsContainer = document.getElementById('cards');
    
    for (let i = 0; i < count; i++) {
        // Если колода пуста, создаем новую
        if (deck.length === 0) {
            suits.forEach(suit => {
                values.forEach(value => {
                    deck.push({ value, suit });
                });
            });
            deck = shuffle(deck);
        }
        
        // Берем карту с верха колоды
        const card = deck.pop();
        gameState.currentCards.push(card);
        
        // Создаем элемент карты
        const cardElement = document.createElement('div');
        cardElement.className = 'card dealing';
        cardElement.setAttribute('data-value', card.value);
        cardElement.setAttribute('data-suit', card.suit);
        
        // Добавляем изображение
        const cardImage = document.createElement('img');
        cardImage.src = `assets/cards/default/${card.value}_of_${card.suit}.png`;
        cardImage.alt = `${card.value} of ${card.suit}`;
        cardElement.appendChild(cardImage);
        
        // Добавляем подпись
        const cardLabel = document.createElement('span');
        cardLabel.className = 'card-label';
        cardLabel.textContent = `${card.value} of ${card.suit}`;
        cardElement.appendChild(cardLabel);
        
        // Добавляем карту в контейнер
        cardsContainer.appendChild(cardElement);
        
        // Убираем класс анимации после завершения
        setTimeout(() => {
            cardElement.classList.remove('dealing');
            
            // Добавляем обработчик события для выбора карты
            cardElement.addEventListener('click', () => selectCard(cardElement, i));
        }, 300 * (i + 1)); // Задержка для последовательной анимации
    }
}

// Функция для выбора кубика
function selectDie(dieElement, index) {
    // Проверяем, не закончен ли ход
    if (gameState.isEndTurn) {
        return;
    }
    
    // Получаем значение кубика
    const dieValue = gameState.currentDice[index].value;
    
    // Снимаем выделение со всех кубиков сначала
    const diceElements = document.querySelectorAll('.die');
    diceElements.forEach(die => {
        die.classList.remove('selected');
        die.classList.remove('disabled');
    });
    
    // Если уже выбран этот кубик, снимаем выбор
    if (gameState.selectedDie === dieValue) {
        gameState.selectedDie = null;
        
        // Скрываем информацию о валидных комбинациях
        document.getElementById('selected-die-value').textContent = '';
        document.getElementById('valid-combinations').classList.remove('visible');
        document.getElementById('valid-combinations').textContent = '';
        
        // Снимаем выделение с карт
        const cardElements = document.querySelectorAll('.card');
        cardElements.forEach(cardElement => {
            cardElement.classList.remove('valid');
            cardElement.classList.remove('invalid');
        });
        
        // Отключаем кнопки
        document.getElementById('end-turn-btn').disabled = true;
        document.getElementById('draw-card-btn').disabled = true;
        
        return;
    }
    
    // Отмечаем выбранный кубик
    gameState.selectedDie = dieValue;
    dieElement.classList.add('selected');
    
    // Показываем валидные комбинации
    document.getElementById('selected-die-value').textContent = dieValue;
    
    // Получаем список валидных значений карт
    const validCards = gameSettings.diceCombinations[dieValue].cards;
    const pointsPerCard = gameSettings.diceCombinations[dieValue].points;
    
    // Отображаем информацию о валидных комбинациях
    document.getElementById('valid-combinations').textContent = 
        `Valid cards: ${validCards.join(', ')} (${pointsPerCard} points each)`;
    document.getElementById('valid-combinations').classList.add('visible');
    
    // Отмечаем валидные карты
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach((cardElement, i) => {
        const cardValue = cardElement.getAttribute('data-value');
        const cardEffect = cardElement.getAttribute('data-effect');
        
        // Проверяем как обычные карты, так и карты с эффектом wildcard
        if (validCards.includes(cardValue) || cardEffect === 'wildcard') {
            cardElement.classList.add('valid');
        } else {
            cardElement.classList.add('invalid');
        }
    });
    
    // Включаем кнопку завершения хода
    document.getElementById('end-turn-btn').disabled = false;
    
    // Проверяем, есть ли валидные комбинации
    if (!checkValidCombinations()) {
        showGameMessage("No valid combinations available! Turn will end automatically.", "warning");
        
        // Задержка перед автоматическим завершением хода
        setTimeout(() => {
            endTurnWithoutPoints();
        }, 2000);
    }
}

// Функция выбора карты с учетом эффектов
function selectCard(cardElement, index) {
    // Проверяем, выбран ли кубик
    if (gameState.selectedDie === null) {
        showGameMessage("Please select a die first", "warning");
        return;
    }
    
    // Проверяем, не закончен ли ход
    if (gameState.isEndTurn) {
        return;
    }
    
    // Получаем данные карты
    const card = gameState.currentCards[index];
    const cardValue = card.value;
    const cardSuit = card.suit;
    const cardId = card.id;
    const cardType = card.type;
    const cardEffect = card.effect;
    
    // Получаем валидные карты для выбранного кубика
    const dieValue = gameState.selectedDie;
    const validCards = gameSettings.diceCombinations[dieValue].cards;
    
    // Проверяем, является ли карта валидной или имеет эффект wildcard
    const isWildcard = cardEffect === 'wildcard';
    if (!validCards.includes(cardValue) && !isWildcard) {
        showGameMessage(`${cardValue} is not valid for die ${dieValue}`, "warning");
        return;
    }
    
    // Проверяем, не выбрана ли уже эта карта
    const cardIndex = gameState.selectedCards.findIndex(c => 
        c.value === cardValue && c.suit === cardSuit && c.index === index);
    
    if (cardIndex !== -1) {
        // Отменяем выбор карты
        gameState.selectedCards.splice(cardIndex, 1);
        cardElement.classList.remove('selected');
    } else {
        // Выбираем карту
        gameState.selectedCards.push({
            value: cardValue,
            suit: cardSuit,
            index: index,
            id: cardId,
            type: cardType,
            effect: cardEffect
        });
        cardElement.classList.add('selected');
    }
    
    // Пересчитываем очки за ход
    calculateTurnScore();
    
    // Включаем кнопку вытягивания дополнительной карты
    document.getElementById('draw-card-btn').disabled = false;
}

// Функция для подсчета очков с учетом эффектов карт и кубиков
function calculateTurnScore() {
    if (gameState.selectedCards.length === 0) {
        gameState.turnScore = 0;
        document.getElementById('turn-score').textContent = '0';
        return;
    }
    
    // Получаем очки за каждую карту
    const dieValue = gameState.selectedDie;
    const pointsPerCard = gameSettings.diceCombinations[dieValue].points;
    let baseScore = 0;
    
    // Считаем базовые очки с учетом эффектов карт
    gameState.selectedCards.forEach(card => {
        // Если карта имеет эффект pointsMultiplier
        if (card.effect === 'pointsMultiplier') {
            // Прибавляем очки с множителем
            baseScore += Math.round(pointsPerCard * 1.5);
        } else {
            // Прибавляем стандартные очки
            baseScore += pointsPerCard;
        }
    });
    
    // Подсчитываем множители
    let multiplier = 1.0;
    
    // Множитель за тузы
    const aceCount = gameState.selectedCards.filter(card => card.value === 'A').length;
    if (aceCount > 0) {
        multiplier *= Math.pow(gameSettings.multipliers.aces, aceCount);
    }
    
    // Множитель за карты одной масти
    const suitCounts = {};
    gameState.selectedCards.forEach(card => {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });
    
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    
    if (maxSuitCount >= 4) {
        multiplier *= gameSettings.multipliers.sameSuit[4];
    } else if (maxSuitCount === 3) {
        multiplier *= gameSettings.multipliers.sameSuit[3];
    } else if (maxSuitCount === 2) {
        multiplier *= gameSettings.multipliers.sameSuit[2];
    }
    
    // Применяем множитель кубика, если есть
    const selectedDieData = gameState.currentDice.find(die => die.value === dieValue)?.data;
    if (selectedDieData && selectedDieData.effect === 'pointsMultiplier') {
        multiplier *= selectedDieData.value || 1.5;
    }
    
    // Применяем множитель и округляем
    gameState.turnScore = Math.round(baseScore * multiplier);
    
    // Обновляем интерфейс
    document.getElementById('turn-score').textContent = gameState.turnScore;
}

// Функция для вытягивания дополнительной карты
function drawAdditionalCard() {
    // Проверяем, не закончен ли ход
    if (gameState.isEndTurn) {
        return;
    }
    
    // Создаем стандартную колоду карт
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    
    suits.forEach(suit => {
        values.forEach(value => {
            // Проверяем, нет ли такой карты уже в руке
            const isInHand = gameState.currentCards.some(
                card => card.value === value && card.suit === suit
            );
            
            if (!isInHand) {
                deck.push({ value, suit });
            }
        });
    });
    
    // Перемешиваем колоду
    deck = shuffle(deck);
    
    // Берем карту с верха колоды
    const card = deck.pop();
    
    // Добавляем карту в текущие карты
    gameState.currentCards.push(card);
    
    // Создаем элемент карты
    const cardElement = document.createElement('div');
    cardElement.className = 'card dealing';
    cardElement.setAttribute('data-value', card.value);
    cardElement.setAttribute('data-suit', card.suit);
    
    // Добавляем изображение
    const cardImage = document.createElement('img');
    cardImage.src = `assets/cards/default/${card.value}_of_${card.suit}.png`;
    cardImage.alt = `${card.value} of ${card.suit}`;
    cardElement.appendChild(cardImage);
    
    // Добавляем подпись
    const cardLabel = document.createElement('span');
    cardLabel.className = 'card-label';
    cardLabel.textContent = `${card.value} of ${card.suit}`;
    cardElement.appendChild(cardLabel);
    
    // Добавляем карту в контейнер
    document.getElementById('cards').appendChild(cardElement);
    
    // Проверяем, является ли карта валидной
    const validCards = gameSettings.diceCombinations[gameState.selectedDie].cards;
    const isValid = validCards.includes(card.value);
    
    // Убираем класс анимации после завершения
    setTimeout(() => {
        cardElement.classList.remove('dealing');
        
        if (isValid) {
            cardElement.classList.add('valid');
            
            // Добавляем обработчик события для выбора карты
            const cardIndex = gameState.currentCards.length - 1;
            cardElement.addEventListener('click', () => selectCard(cardElement, cardIndex));
            
            showGameMessage(`You drew a valid card: ${card.value} of ${card.suit}!`, "success");
        } else {
            cardElement.classList.add('invalid');
            
            // Если карта невалидная, ход заканчивается и очки сгорают
            showGameMessage(`Bad luck! ${card.value} of ${card.suit} is not valid. Turn ends.`, "warning");
            
            // Заканчиваем ход без очков
            gameState.turnScore = 0;
            endTurnWithoutPoints();
        }
    }, 300);
}

// Функция завершения хода без очков
function endTurnWithoutPoints() {
    // Отмечаем, что ход закончен
    gameState.isEndTurn = true;
    
    // Отключаем кнопки
    document.getElementById('draw-card-btn').disabled = true;
    document.getElementById('end-turn-btn').disabled = true;
    
    // Сбрасываем выбранные карты
    document.querySelectorAll('.card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Обновляем счет
    document.getElementById('turn-score').textContent = '0';
    
    // Переходим к следующему ходу с задержкой
    setTimeout(() => {
        nextTurn();
    }, 2000);
}

// Функция завершения хода с учетом эффектов
function endTurn() {
    // Проверяем, не закончен ли ход
    if (gameState.isEndTurn) {
        return;
    }
    
    // Отмечаем, что ход закончен
    gameState.isEndTurn = true;
    
    // Обновляем общий счет
    gameState.totalScore += gameState.turnScore;
    document.getElementById('current-score').textContent = gameState.totalScore;
    
    // Отключаем кнопки
    document.getElementById('draw-card-btn').disabled = true;
    document.getElementById('end-turn-btn').disabled = true;
    
    // Обновляем статистику
    gameState.statistics.turnsUsed++;
    
    // Проверяем наличие эффекта extraTurn
    const hasExtraTurn = gameState.selectedCards.some(card => card.effect === 'extraTurn') ||
                         gameState.currentDice.some(die => die.data && die.data.effect === 'extraTurn' && 
                                                  die.value === gameState.selectedDie);
    
    // Проверяем условия победы или продолжения игры
    if (gameState.totalScore >= gameState.currentLevel.goal.points) {
        // Победа - игрок достиг целевого количества очков
        gameVictory();
    } else if (gameState.currentTurn >= gameState.currentLevel.goal.turns && !hasExtraTurn) {
        // Поражение - использованы все ходы, но цель не достигнута
        gameDefeat();
    } else {
        // Если есть эффект дополнительного хода, не увеличиваем счетчик ходов
        if (hasExtraTurn) {
            showGameMessage("You got an extra turn!", "success");
            
            // Переход к следующему ходу без увеличения счетчика
            setTimeout(() => {
                nextTurn(false);
            }, 1500);
        } else {
            // Обычный переход к следующему ходу
            setTimeout(() => {
                nextTurn(true);
            }, 1500);
        }
    }
}

// Функция перехода к следующему ходу
function nextTurn(incrementTurn = true) {
    // Увеличиваем счетчик ходов, если нужно
    if (incrementTurn) {
        gameState.currentTurn++;
    }
    
    // Начинаем новый ход
    startNewTurn();
}

// Модифицированная функция победы для учета эффектов карт
function gameVictory() {
    console.log("Victory!");
    
    // Рассчитываем награду за уровень
    let silverEarned = Math.floor(
        Math.random() * (gameState.currentLevel.rewards.silverMax - gameState.currentLevel.rewards.silverMin + 1) + 
        gameState.currentLevel.rewards.silverMin
    );
    
    // Проверяем наличие эффекта goldMultiplier в выбранных картах
    const hasGoldMultiplier = gameState.selectedCards.some(card => card.effect === 'goldMultiplier');
    
    if (hasGoldMultiplier) {
        // Увеличиваем награду на 25%
        silverEarned = Math.round(silverEarned * 1.25);
    }
    
    // Обновляем статистику
    gameState.statistics.silverEarned = silverEarned;
    
    // Показываем экран результатов
    showLevelResults(true, gameState.currentLevel, gameState.statistics);
    
    // Добавляем уровень в список пройденных (временно, до клейма наград)
    if (!playerData.completedLevels.includes(gameState.currentLevel.id)) {
        playerData.completedLevels.push(gameState.currentLevel.id);
        savePlayerData();
    }
}

// Функция поражения в игре
function gameDefeat() {
    console.log("Defeat!");
    
    // Показываем экран результатов
    showLevelResults(false, gameState.currentLevel, gameState.statistics);
}

// Функция для перемешивания массива (алгоритм Фишера-Йетса)
function shuffle(array) {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;
    
    // Пока есть элементы для перемешивания
    while (0 !== currentIndex) {
        // Выбираем оставшийся элемент
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        
        // Меняем местами с текущим элементом
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    
    return array;
}

// Функция обновления игрового интерфейса
function updateGameUI() {
    // Обновляем счет
    document.getElementById('current-score').textContent = gameState.totalScore;
    document.getElementById('turn-score').textContent = gameState.turnScore;
    
    // Обновляем номер текущего хода
    document.getElementById('current-turn').textContent = gameState.currentTurn;
}

// Проверка наличия валидных комбинаций
function checkValidCombinations() {
    // Если не выбран кубик, не проверяем
    if (gameState.selectedDie === null) return true;
    
    // Получаем валидные карты для выбранного кубика
    const dieValue = gameState.selectedDie;
    const validCards = gameSettings.diceCombinations[dieValue].cards;
    
    // Проверяем, есть ли хотя бы одна валидная карта
    for (const card of gameState.currentCards) {
        // Проверяем и специальные эффекты (wildcard)
        if (validCards.includes(card.value) || card.effect === 'wildcard') {
            return true;
        }
    }
    
    return false;
}

// Функция для отображения всех комбинаций и множителей
function showAllCombinations() {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.id = 'combinations-modal';
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '2000';
    modal.style.maxWidth = '80%';
    modal.style.maxHeight = '80%';
    modal.style.overflow = 'auto';
    
    // Создаем содержимое
    let content = `
        <h3>Dice Combinations</h3>
        <table class="combinations-table">
            <thead>
                <tr>
                    <th>Die</th>
                    <th>Valid Cards</th>
                    <th>Points per Card</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Добавляем информацию о комбинациях кубиков
    for (const [die, combo] of Object.entries(gameSettings.diceCombinations)) {
        content += `
            <tr>
                <td>${die}</td>
                <td>${combo.cards.join(', ')}</td>
                <td>${combo.points}</td>
            </tr>
        `;
    }
    
    content += `
            </tbody>
        </table>
        
        <h3>Multipliers</h3>
        <table class="combinations-table">
            <thead>
                <tr>
                    <th>Condition</th>
                    <th>Multiplier</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Each Ace (A)</td>
                    <td>×${gameSettings.multipliers.aces}</td>
                </tr>
                <tr>
                    <td>2 cards of same suit</td>
                    <td>×${gameSettings.multipliers.sameSuit[2]}</td>
                </tr>
                <tr>
                    <td>3 cards of same suit</td>
                    <td>×${gameSettings.multipliers.sameSuit[3]}</td>
                </tr>
                <tr>
                    <td>4+ cards of same suit</td>
                    <td>×${gameSettings.multipliers.sameSuit[4]}</td>
                </tr>
            </tbody>
        </table>
        
        <button id="close-combinations-btn" class="action-btn">Close</button>
    `;
    
    modal.innerHTML = content;
    
    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        .combinations-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .combinations-table th, .combinations-table td {
            border: 1px solid #4a3a2a;
            padding: 8px;
            text-align: center;
        }
        
        .combinations-table th {
            background-color: #3a3a3a;
            color: #b89d6e;
        }
        
        .combinations-table tr:nth-child(even) {
            background-color: #333333;
        }
        
        #close-combinations-btn {
            display: block;
            margin: 20px auto 10px;
        }
    `;
    
    document.head.appendChild(style);
    
    // Добавляем модальное окно в документ
    document.body.appendChild(modal);
    
    // Добавляем обработчик для кнопки закрытия
    document.getElementById('close-combinations-btn').addEventListener('click', () => {
        modal.remove();
    });
}

// Функция для показа уведомления о подтверждении
function showConfirmationDialog(message, onConfirm, onCancel) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.id = 'confirmation-modal';
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '2000';
    modal.style.maxWidth = '400px';
    
    // Создаем содержимое
    modal.innerHTML = `
        <h3>Confirmation</h3>
        <p>${message}</p>
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button id="confirm-yes-btn" class="action-btn">Yes</button>
            <button id="confirm-no-btn" class="action-btn">No</button>
        </div>
    `;
    
    // Добавляем модальное окно в документ
    document.body.appendChild(modal);
    
    // Добавляем обработчики для кнопок
    document.getElementById('confirm-yes-btn').addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    document.getElementById('confirm-no-btn').addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });
}

// Функция для возврата из игры в меню уровня с подтверждением
function leaveGame() {
    // Показываем диалог подтверждения
    showConfirmationDialog(
        "Are you sure you want to leave the game? Your progress will be lost.",
        () => {
            // Если подтверждено, возвращаемся в меню уровня
            showScreen('level-container');
        }
    );
}