/**
 * Lands of Nanti - Основной JavaScript файл
 * 
 * Этот файл отвечает за инициализацию игры и координацию между
 * различными модулями.
 */

// Глобальный объект с данными игрока
const playerData = {
    name: '',
    wallet: '',
    silver: 0,
    completedLevels: [],
    inventory: {
        cards: [], // Список скинов и специальных карт, которые есть у игрока
        dice: []   // Список скинов и специальных кубиков, которые есть у игрока
    },
    selectedCards: [], // Текущие выбранные карты для колоды
    selectedDice: []   // Текущие выбранные кубики
};

// Глобальный объект с настройками игры
const gameSettings = {
    // Информация об уровнях
    levels: [
        {
            id: 1,
            name: "Treachery",
            goal: { points: 1000, turns: 5 },
            rewards: { silverMin: 100, silverMax: 150 },
            lore: {
                chapter1: {
                    title: "Awakening in the Ice",
                    text: [
                        "Awakening in an icy cell after a blow to the head, you smelled decay. A torch's faint light barely pierced the gloom. This is the Abyss's depth, like the ninth circle of hell, where traitors are punished with cold and solitude.",
                        "Frost coats the walls, and your breath mists in the air. A distant moan echoes, and the sting of betrayal pierces your soul like a knife. Here, your journey begins."
                    ]
                },
                chapter2: {
                    title: "The First Game",
                    text: [
                        "Before the cell stands a table where a gaunt old man in a tattered cloak sits. His face is hidden, but his eyes burn with emptiness. On the table lie dice and cards, tools of your fate.",
                        "\"Play,\" he rasps. \"Win, and you ascend; lose, and you freeze here.\" You prepare for your first battle, knowing this is just the start of your path through hell."
                    ]
                }
            }
        },
        {
            id: 2,
            name: "Fraud",
            goal: { points: 1200, turns: 5 },
            rewards: { silverMin: 150, silverMax: 200 },
            lore: {
                chapter1: {
                    title: "The Hall of Lies",
                    text: [
                        "Victorious, you climbed the stairs. The air grew slightly warmer, but the weight remained. You entered a circular hall where deceivers suffer in the shadows of their lies.",
                        "Walls are carved with faces of deceit. Puddles reflect torchlight, and whispers weave intrigue. Here, a cunning foe awaits you."
                    ]
                },
                chapter2: {
                    title: "The Thief's Challenge",
                    text: [
                        "At the table sits a thief with a crooked grin, fingers adorned with stolen rings. \"Here, wits win,\" he chuckles, gesturing to the game. You sit, ready to outsmart him.",
                        "The game begins, each move a struggle against this circle's deceit. Victory will bring you closer to freedom and prove you're stronger than his lies."
                    ]
                }
            }
        },
        {
            id: 3,
            name: "Violence",
            goal: { points: 1500, turns: 6 },
            rewards: { silverMin: 200, silverMax: 250 },
            lore: {
                chapter1: {
                    title: "The Arena of Wrath",
                    text: [
                        "Having won, you ascended to the seventh floor, where rage and blood reign. The air smells of iron, walls are scorched, and cries of fury echo.",
                        "You entered an arena where a bloodstained table stands amid the filth. Weapons and armor are scattered—remnants of past battles awaiting a new challenger."
                    ]
                },
                chapter2: {
                    title: "The Brute's Game",
                    text: [
                        "At the table sits a scarred brute, his gaze ablaze with anger. \"Strength is useless here,\" he growls. \"Only the game decides.\" You sit, feeling his rage.",
                        "Each turn tests your composure. You must stay calm to overcome this fight and move closer to the light."
                    ]
                }
            }
        },
        {
            id: 4,
            name: "Heresy",
            goal: { points: 1800, turns: 6 },
            rewards: { silverMin: 250, silverMax: 300 },
            lore: {
                chapter1: {
                    title: "The Library of the Damned",
                    text: [
                        "Ascending, you reached the sixth floor. Heat parches your throat, walls are lined with tombs of bones, and fires dance.",
                        "You're in the library of the damned, surrounded by scrolls and books. In the center, a table where your opponent waits, led here by his faith."
                    ]
                },
                chapter2: {
                    title: "The Fanatic's Trial",
                    text: [
                        "Your foe is a gaunt monk in rags, eyes full of zeal. \"I sought truth,\" he whispers, shuffling cards. You sit, feeling the weight of his words.",
                        "The game starts, and the whispers of the dead try to lead you astray. You keep your mind clear to win and proceed."
                    ]
                }
            }
        },
        {
            id: 5,
            name: "Wrath",
            goal: { points: 2000, turns: 7 },
            rewards: { silverMin: 300, silverMax: 350 },
            lore: {
                chapter1: {
                    title: "The Swamp of Rage",
                    text: [
                        "You rose to the fifth floor. The air is filled with screams, the floor is mud, walls stained with blood.",
                        "You're on an islet amid a swamp, where a table stands. Ghosts fight around you, their faces twisted with rage. Here, you must control yourself."
                    ]
                },
                chapter2: {
                    title: "The Wrathful Woman's Game",
                    text: [
                        "Your enemy is a woman with fiery hair, her face ablaze with anger. \"I lost to myself,\" she hisses, throwing dice. You sit, ready for the game.",
                        "Each move is a struggle against irritation. You must remain calm to defeat her and this floor of malice."
                    ]
                }
            }
        },
        {
            id: 6,
            name: "Greed",
            goal: { points: 2200, turns: 7 },
            rewards: { silverMin: 350, silverMax: 400 },
            lore: {
                chapter1: {
                    title: "The Hall of Rotting Wealth",
                    text: [
                        "You're on the fourth floor. The hall is filled with dull gold and jewels, but all is rotting.",
                        "In the center, a dilapidated table, once luxurious. Here, those who hoarded and squandered play for the illusion of their past."
                    ]
                },
                chapter2: {
                    title: "The Miser's Lament",
                    text: [
                        "Your foe is a fat man in faded finery, his rings tarnished. \"I lost everything,\" he groans, pointing to the game. You sit, knowing the cost of greed.",
                        "The game proceeds, and you learn balance, avoiding avarice. Victory here is a step toward freedom and a lesson in moderation."
                    ]
                }
            }
        },
        {
            id: 7,
            name: "Gluttony",
            goal: { points: 2500, turns: 8 },
            rewards: { silverMin: 400, silverMax: 450 },
            lore: {
                chapter1: {
                    title: "The Chamber of Filth",
                    text: [
                        "You're on the third floor, where gluttony drowns in filth. The floor is slick with slime, food rots, insects buzz.",
                        "Amid this, a sticky table. Here, those who lived for feasts now play in eternal hunger."
                    ]
                },
                chapter2: {
                    title: "The Glutton's Game",
                    text: [
                        "Your enemy is a corpulent man, clothes stained. \"Food was my god,\" he wails, taking the dice. You sit, fighting revulsion.",
                        "The game demands focus. You win, learning restraint where others succumbed to excess."
                    ]
                }
            }
        },
        {
            id: 8,
            name: "Lust",
            goal: { points: 2800, turns: 8 },
            rewards: { silverMin: 450, silverMax: 500 },
            lore: {
                chapter1: {
                    title: "The Whisper of Passion",
                    text: [
                        "You're on the second floor. Sighs and the rustle of fabric fill the air.",
                        "In a secluded corner, a table draped in silk. Here, those who yielded to passion seek peace through the game."
                    ]
                },
                chapter2: {
                    title: "The Temptress's Game",
                    text: [
                        "Your foe is a beauty with sad eyes. \"Love ruined me,\" she whispers, dealing cards. You sit, feeling temptation.",
                        "The game proceeds, and you resist allure. Victory teaches self-control where she lost it."
                    ]
                }
            }
        },
        {
            id: 9,
            name: "Limbo",
            goal: { points: 3000, turns: 9 },
            rewards: { silverMin: 500, silverMax: 550 },
            lore: {
                chapter1: {
                    title: "The Garden of Twilight",
                    text: [
                        "You're on the first floor, Limbo, where sages languish in twilight. The air is still, the light eternal dusk.",
                        "You're in a garden with a bare tree, beneath which stands a table. Here, they play not for torment but for the hope of moving on."
                    ]
                },
                chapter2: {
                    title: "The Sage's Game",
                    text: [
                        "Your enemy is an elder with wise eyes. \"I sought knowledge,\" he says, inviting you to play. You sit, feeling calm.",
                        "The game progresses, each move bringing you closer to freedom. This floor teaches that even in shadow, there is purpose."
                    ]
                }
            }
        },
        {
            id: 10,
            name: "Freedom",
            goal: { points: 3500, turns: 10 },
            rewards: { silverMin: 1000, silverMax: 1500, special: "NFT_Scroll" },
            lore: {
                chapter1: {
                    title: "The Light of Liberation",
                    text: [
                        "You climbed the final staircase and stepped into the light. The Abyss's gates opened, and fresh air filled your lungs. The sun warms you; you are free.",
                        "A clerk at the exit hands you a scroll: \"You've passed through hell. This is your freedom and stipend from the treasury.\" You take it, scarcely believing your fortune."
                    ]
                },
                chapter2: {
                    title: "A New Beginning",
                    text: [
                        "Leaving the Abyss, you look back at your journey. Each game tempered you, showing strength of spirit and the chance for redemption.",
                        "With the scroll and money, you walk toward a new life. The prison is behind you, but its lessons will stay with you forever."
                    ]
                }
            }
        }
    ],
    
    // Правила игры - комбинации кубиков и карт
    diceCombinations: {
        '1': { cards: ['7', 'J', 'Q', 'K', 'A'], points: 150 },
        '2': { cards: ['2', '4', '6', '8', '10', 'A'], points: 100 },
        '3': { cards: ['3', '6', '9', 'A'], points: 200 },
        '4': { cards: ['4', '8', 'A'], points: 250 },
        '5': { cards: ['5', '10', 'A'], points: 250 },
        '6': { cards: ['6', 'A'], points: 300 }
    },
    
    // Множители очков
    multipliers: {
        aces: 1.25,       // За каждый туз
        sameSuit: {
            2: 1.5,       // 2 карты одной масти
            3: 2,         // 3 карты одной масти
            4: 3          // 4+ карты одной масти
        }
    },
    
    // Список админских кошельков
    adminWallets: [
        "HVMaVhxKX6dLP1yLnkzH3ikRgDG1vqn2zP9PcXuYvZZH"
        // Добавь другие кошельки администраторов при необходимости
    ]
};

// Инициализация магазина
const shopItems = {
    cardSkins: [
        {
            id: "card-skin-1",
            name: "Medieval Cards",
            price: 300,
            rarity: "Common",
            description: "A set of cards with medieval design.",
            image: "assets/cards/skins/medieval.png"
        },
        {
            id: "card-skin-2",
            name: "Royal Flush",
            price: 500,
            rarity: "Rare",
            description: "Elegant cards with royal patterns.",
            image: "assets/cards/skins/royal.png"
        },
        {
            id: "card-skin-3",
            name: "Dragon Scale Cards",
            price: 800,
            rarity: "Epic",
            description: "Cards crafted from mystical dragon scales.",
            image: "assets/cards/skins/dragon.png"
        }
    ],
    diceSkins: [
        {
            id: "dice-skin-1",
            name: "Wooden Dice",
            price: 200,
            rarity: "Common",
            description: "Simple wooden dice carved by hand.",
            image: "assets/dice/skins/wooden.png"
        },
        {
            id: "dice-skin-2",
            name: "Stone Dice",
            price: 400,
            rarity: "Rare",
            description: "Solid stone dice with engraved numbers.",
            image: "assets/dice/skins/stone.png"
        },
        {
            id: "dice-skin-3",
            name: "Crystal Dice",
            price: 700,
            rarity: "Epic",
            description: "Magical crystal dice that shimmer with power.",
            image: "assets/dice/skins/crystal.png"
        }
    ],
    specialCards: [
        {
            id: "special-card-1",
            name: "Lucky Seven",
            price: 600,
            rarity: "Rare",
            description: "Gives 1.5x more points when used in a combination.",
            effect: "pointsMultiplier",
            value: 1.5,
            image: "assets/cards/special/lucky-seven.png"
        },
        {
            id: "special-card-2",
            name: "Joker's Wildcard",
            price: 1000,
            rarity: "Epic",
            description: "Can be used with any die combination, like an Ace but without multiplier.",
            effect: "wildcard",
            image: "assets/cards/special/joker.png"
        },
        {
            id: "special-card-3",
            name: "Extra Turn Card",
            price: 800,
            rarity: "Epic",
            description: "Gives an extra turn when successfully used in a combination.",
            effect: "extraTurn",
            image: "assets/cards/special/extra-turn.png"
        }
    ],
    specialDice: [
        {
            id: "special-dice-1",
            name: "Lower Numbers Die",
            price: 500,
            rarity: "Rare",
            description: "Higher chance of rolling smaller numbers (1-3).",
            effect: "weightedLow",
            weights: [30, 22.5, 17.5, 15, 10, 5],
            image: "assets/dice/special/low-numbers.png"
        },
        {
            id: "special-dice-2",
            name: "Higher Numbers Die",
            price: 500,
            rarity: "Rare",
            description: "Higher chance of rolling larger numbers (4-6).",
            effect: "weightedHigh",
            weights: [5, 10, 15, 17.5, 22.5, 30],
            image: "assets/dice/special/high-numbers.png"
        },
        {
            id: "special-dice-3",
            name: "Bonus Points Die",
            price: 800,
            rarity: "Epic",
            description: "Gives 1.5x points multiplier when used in a combination.",
            effect: "pointsMultiplier",
            value: 1.5,
            image: "assets/dice/special/bonus-points.png"
        }
    ]
};

// Функция для инициализации игры
async function initGame() {
    console.log("Initializing Lands of Nanti...");
    
    // Загрузка данных игрока из localStorage
    loadPlayerData();
    
    // Инициализация обработчиков событий
    setupEventListeners();
    
    // Показ начального экрана
    checkInitialScreen();
}

// Функция загрузки данных игрока
function loadPlayerData() {
    const savedData = localStorage.getItem('landsOfNantiPlayer');
    if (savedData) {
        const data = JSON.parse(savedData);
        // Обновляем только если есть сохраненные данные
        if (data.name) playerData.name = data.name;
        if (data.wallet) playerData.wallet = data.wallet;
        if (data.silver) playerData.silver = data.silver;
        if (data.completedLevels) playerData.completedLevels = data.completedLevels;
        if (data.inventory) playerData.inventory = data.inventory;
        if (data.selectedCards) playerData.selectedCards = data.selectedCards;
        if (data.selectedDice) playerData.selectedDice = data.selectedDice;
        
        console.log("Player data loaded:", playerData);
    } else {
        console.log("No saved player data found");
    }
}

// Функция сохранения данных игрока
function savePlayerData() {
    localStorage.setItem('landsOfNantiPlayer', JSON.stringify(playerData));
    console.log("Player data saved");
}

// Функция проверки начального экрана
function checkInitialScreen() {
    // Если игрок уже подключил кошелек и ввел имя, показываем главное меню
    if (playerData.wallet && playerData.name) {
        showMainMenu();
        updateUserInfo();
    } else if (playerData.wallet) {
        // Если только кошелек, но нет имени
        showScreen('profile-container');
        document.querySelector('#wallet-address span').textContent = formatWalletAddress(playerData.wallet);
    } else {
        // Если ничего нет, показываем экран подключения кошелька
        showScreen('wallet-container');
    }
}

// Функция настройки обработчиков событий
function setupEventListeners() {
    // Кнопка подключения кошелька
    document.getElementById('connect-wallet-btn').addEventListener('click', connectWallet);
    
    // Кнопка начала путешествия (после ввода имени)
    document.getElementById('start-journey-btn').addEventListener('click', startJourney);
    
    // Кнопки туториала
    document.getElementById('tutorial-next-1').addEventListener('click', () => nextTutorialStep(1));
    document.getElementById('tutorial-prev-2').addEventListener('click', () => prevTutorialStep(2));
    document.getElementById('tutorial-next-2').addEventListener('click', () => nextTutorialStep(2));
    document.getElementById('tutorial-prev-3').addEventListener('click', () => prevTutorialStep(3));
    document.getElementById('tutorial-next-3').addEventListener('click', () => nextTutorialStep(3));
    document.getElementById('tutorial-prev-4').addEventListener('click', () => prevTutorialStep(4));
    document.getElementById('tutorial-start').addEventListener('click', completeTutorial);
    
    // Кнопки лора
    document.getElementById('lore-next-1').addEventListener('click', () => nextLoreStep(1));
    document.getElementById('lore-prev-2').addEventListener('click', () => prevLoreStep(2));
    document.getElementById('lore-begin').addEventListener('click', completeLore);
    
    // Кнопки главного меню
    document.getElementById('play-btn').addEventListener('click', () => showScreen('play-menu'));
    document.getElementById('shop-btn').addEventListener('click', openShop);
    document.getElementById('inventory-btn').addEventListener('click', openInventory);
    document.getElementById('about-btn').addEventListener('click', () => showScreen('about-container'));
    document.getElementById('disconnect-wallet-btn').addEventListener('click', disconnectWallet);
    
    // Кнопки меню игры
    document.getElementById('campaign-option').addEventListener('click', openCampaign);
    document.getElementById('back-to-menu-btn').addEventListener('click', () => showScreen('main-menu'));
    
    // Кнопки кампании
    document.getElementById('back-to-play-btn').addEventListener('click', () => showScreen('play-menu'));
    
    // Кнопки экрана уровня
    document.getElementById('begin-level-btn').addEventListener('click', startLevel);
    document.getElementById('level-lore-btn').addEventListener('click', showLevelLore);
    document.getElementById('back-to-campaign-btn').addEventListener('click', () => showScreen('campaign-container'));
    
    // Кнопки в игре
    document.getElementById('draw-card-btn').addEventListener('click', drawAdditionalCard);
    document.getElementById('end-turn-btn').addEventListener('click', endTurn);
    document.getElementById('leave-game-btn').addEventListener('click', leaveGame);
    
    // Кнопки результатов уровня
    document.getElementById('claim-rewards-btn').addEventListener('click', claimRewards);
    document.getElementById('return-to-levels-btn').addEventListener('click', () => {
        document.getElementById('level-result').classList.remove('active');
        document.getElementById('level-result').querySelector('.overlay-content').classList.remove('active');
        showScreen('campaign-container');
    });
    
    // Кнопки магазина
    document.getElementById('close-shop-btn').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('close-description-btn').addEventListener('click', closeItemDescription);
    
    // Кнопки инвентаря
    document.getElementById('close-inventory-btn').addEventListener('click', () => showScreen('main-menu'));
    
    // Кнопки раздела "О игре"
    document.getElementById('restart-tutorial-btn').addEventListener('click', restartTutorial);
    document.getElementById('close-about-btn').addEventListener('click', () => showScreen('main-menu'));
    
    // Кнопка админа
    document.getElementById('admin-button').addEventListener('click', openAdminPanel);
    document.getElementById('close-admin-btn').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('add-item-form').addEventListener('submit', addNewItem);

    document.getElementById('view-combinations-btn')?.addEventListener('click', showAllCombinations);
}

window.showAllCombinations = showAllCombinations;

// Функция для форматирования адреса кошелька (сокращение)
function formatWalletAddress(address) {
    if (!address) return '';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

// Функция для отображения конкретного экрана
function showScreen(screenId) {
    // Скрываем все экраны
    const screens = [
        'wallet-container', 'profile-container', 'tutorial-container',
        'lore-container', 'main-menu', 'play-menu', 'campaign-container',
        'level-container', 'game-screen', 'shop-container',
        'inventory-container', 'about-container', 'admin-container'
    ];
    
    screens.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Показываем запрошенный экран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'block';
        
        // Если это главное меню, убедимся, что информация актуальна
        if (screenId === 'main-menu') {
            updateUserInfo();
        }
        
        // Если это экран кампании, обновим список уровней
        if (screenId === 'campaign-container') {
            updateLevelsList();
        }
    }
}

// Функция обновления информации о пользователе в интерфейсе
function updateUserInfo() {
    // Обновляем имя в главном меню
    const nameDisplay = document.getElementById('player-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = playerData.name;
    }
    
    // Обновляем количество серебра
    const silverDisplays = document.querySelectorAll('#silver-amount, #shop-silver, #inventory-silver');
    silverDisplays.forEach(el => {
        if (el) {
            el.textContent = playerData.silver;
        }
    });
    
    // Показываем кнопку админа, если этот кошелек имеет права админа
    const adminButton = document.getElementById('admin-button');
    if (adminButton) {
        adminButton.style.display = 
            gameSettings.adminWallets.includes(playerData.wallet) ? 'block' : 'none';
    }
}

// Запуск инициализации игры при загрузке страницы
document.addEventListener('DOMContentLoaded', initGame);

// Обработка ошибок и отладка (для разработки)
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Error occurred:', message, 'at', source, ':', lineno, ':', colno);
    console.error('Error details:', error);
    return true; // Предотвращаем стандартное сообщение об ошибке
};