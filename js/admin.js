/**
 * Admin.js - Оптимизированная панель администратора
 * 
 * Этот файл содержит базовые функции для панели администратора:
 * 1. Отображение статистики игры
 * 2. Добавление новых предметов в магазин
 * 
 * Используется IndexedDB для хранения данных между сессиями и пользователями.
 */

// Глобальные переменные для админ-панели
const adminState = {
    initialized: false,
    currentTab: 'stats',
    preview: {
        visible: false,
        data: null
    }
};

// База данных для статистики и управления контентом
class GameDatabase {
    constructor() {
        this.dbName = 'LandsOfNantiDB';
        this.statsStore = 'gameStats';
        this.playersStore = 'players';
        this.initialized = false;
        this.db = null;
    }

    // Инициализация базы данных
    init() {
        return new Promise((resolve, reject) => {
            // Проверяем поддержку IndexedDB
            if (!window.indexedDB) {
                console.log("Your browser doesn't support IndexedDB. Falling back to localStorage.");
                this.useLocalStorage = true;
                this.initLocalStorage();
                this.initialized = true;
                resolve();
                return;
            }
            
            // Открываем или создаем базу данных
            const request = indexedDB.open(this.dbName, 1);
            
            // Обработка ошибки
            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                this.useLocalStorage = true;
                this.initLocalStorage();
                this.initialized = true;
                resolve();
            };
            
            // Обработка успешного открытия
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB connected successfully");
                this.useLocalStorage = false;
                this.initialized = true;
                resolve();
            };
            
            // Создание или обновление структуры базы данных
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для статистики
                if (!db.objectStoreNames.contains(this.statsStore)) {
                    db.createObjectStore(this.statsStore, { keyPath: 'id' });
                }
                
                // Создаем хранилище для игроков
                if (!db.objectStoreNames.contains(this.playersStore)) {
                    const playersStore = db.createObjectStore(this.playersStore, { keyPath: 'wallet' });
                    playersStore.createIndex('by_silver', 'silver', { unique: false });
                    playersStore.createIndex('by_lastLogin', 'lastLogin', { unique: false });
                }
            };
        });
    }

    // Инициализация хранилища при использовании localStorage (резервный вариант)
    initLocalStorage() {
        // Проверяем, есть ли уже данные
        if (!localStorage.getItem(`${this.dbName}_${this.statsStore}`)) {
            localStorage.setItem(`${this.dbName}_${this.statsStore}`, JSON.stringify(this.getDefaultStats()));
        }
        
        if (!localStorage.getItem(`${this.dbName}_${this.playersStore}`)) {
            localStorage.setItem(`${this.dbName}_${this.playersStore}`, JSON.stringify([]));
        }
    }

    // Получение статистики игры
    async getGameStats() {
        await this.ensureInit();
        
        if (this.useLocalStorage) {
            const statsJson = localStorage.getItem(`${this.dbName}_${this.statsStore}`);
            return statsJson ? JSON.parse(statsJson) : this.getDefaultStats();
        }
        
        try {
            const transaction = this.db.transaction([this.statsStore], 'readonly');
            const store = transaction.objectStore(this.statsStore);
            
            // Получаем все статистические данные
            const statsRequest = store.getAll();
            
            return new Promise((resolve, reject) => {
                statsRequest.onsuccess = () => {
                    // Если данных нет, возвращаем значения по умолчанию
                    if (!statsRequest.result || statsRequest.result.length === 0) {
                        resolve(this.getDefaultStats());
                    } else {
                        // Преобразуем массив в объект
                        const stats = {};
                        statsRequest.result.forEach(item => {
                            stats[item.id] = item.value;
                        });
                        resolve(stats);
                    }
                };
                
                statsRequest.onerror = (event) => {
                    console.error("Ошибка получения статистики:", event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error("Ошибка при получении статистики:", error);
            return this.getDefaultStats();
        }
    }

    // Обновление статистики игры
    async updateGameStats(stats) {
        await this.ensureInit();
        
        if (this.useLocalStorage) {
            localStorage.setItem(`${this.dbName}_${this.statsStore}`, JSON.stringify(stats));
            return true;
        }
        
        try {
            const transaction = this.db.transaction([this.statsStore], 'readwrite');
            const store = transaction.objectStore(this.statsStore);
            
            // Очищаем хранилище
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = resolve;
                clearRequest.onerror = reject;
            });
            
            // Добавляем новые данные
            for (const [key, value] of Object.entries(stats)) {
                await new Promise((resolve, reject) => {
                    const addRequest = store.add({ id: key, value: value });
                    addRequest.onsuccess = resolve;
                    addRequest.onerror = reject;
                });
            }
            
            return true;
        } catch (error) {
            console.error("Ошибка при обновлении статистики:", error);
            return false;
        }
    }

    // Регистрация игрока (или обновление данных)
    async registerPlayer(wallet, name, data = {}) {
        await this.ensureInit();
        
        const player = {
            wallet,
            name,
            silver: data.silver || 0,
            completedLevels: data.completedLevels || [],
            inventory: data.inventory || { cards: [], dice: [] },
            lastLogin: new Date().toISOString(),
            ...data
        };
        
        if (this.useLocalStorage) {
            // Получаем текущих игроков
            const playersJson = localStorage.getItem(`${this.dbName}_${this.playersStore}`);
            const players = playersJson ? JSON.parse(playersJson) : [];
            
            // Ищем игрока, чтобы обновить данные
            const playerIndex = players.findIndex(p => p.wallet === wallet);
            
            if (playerIndex !== -1) {
                players[playerIndex] = { ...players[playerIndex], ...player };
            } else {
                players.push(player);
            }
            
            // Сохраняем обновленные данные
            localStorage.setItem(`${this.dbName}_${this.playersStore}`, JSON.stringify(players));
            
            // Обновляем статистику
            await this.updatePlayerStats();
            
            return true;
        }
        
        try {
            const transaction = this.db.transaction([this.playersStore], 'readwrite');
            const store = transaction.objectStore(this.playersStore);
            
            // Проверяем, существует ли игрок
            const getRequest = store.get(wallet);
            
            return new Promise((resolve, reject) => {
                getRequest.onsuccess = async () => {
                    try {
                        if (getRequest.result) {
                            // Обновляем существующего игрока
                            const updatedPlayer = { ...getRequest.result, ...player };
                            await store.put(updatedPlayer);
                        } else {
                            // Добавляем нового игрока
                            await store.add(player);
                        }
                        
                        // Обновляем статистику
                        await this.updatePlayerStats();
                        
                        resolve(true);
                    } catch (error) {
                        console.error("Ошибка при сохранении игрока:", error);
                        reject(error);
                    }
                };
                
                getRequest.onerror = (event) => {
                    console.error("Ошибка проверки игрока:", event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error("Ошибка при регистрации игрока:", error);
            return false;
        }
    }

    // Получение всех игроков
    async getAllPlayers() {
        await this.ensureInit();
        
        if (this.useLocalStorage) {
            const playersJson = localStorage.getItem(`${this.dbName}_${this.playersStore}`);
            return playersJson ? JSON.parse(playersJson) : [];
        }
        
        try {
            const transaction = this.db.transaction([this.playersStore], 'readonly');
            const store = transaction.objectStore(this.playersStore);
            
            const playersRequest = store.getAll();
            
            return new Promise((resolve, reject) => {
                playersRequest.onsuccess = () => {
                    resolve(playersRequest.result || []);
                };
                
                playersRequest.onerror = (event) => {
                    console.error("Ошибка получения игроков:", event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error("Ошибка при получении игроков:", error);
            return [];
        }
    }

    // Обновление статистики на основе данных игроков
    async updatePlayerStats() {
        try {
            const players = await this.getAllPlayers();
            const stats = await this.getGameStats();
            
            // Обновляем статистику
            stats.totalPlayers = players.length;
            stats.activePlayers = players.filter(p => {
                const lastLogin = new Date(p.lastLogin);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return lastLogin > thirtyDaysAgo;
            }).length;
            
            stats.totalSilver = players.reduce((sum, player) => sum + (player.silver || 0), 0);
            stats.completedCampaigns = players.filter(p => 
                p.completedLevels && p.completedLevels.includes(10) // Уровень 10 - это последний уровень
            ).length;
            
            stats.mintedNfts = players.filter(p => p.hasNft).length;
            
            // Считаем общее количество игр
            let totalGames = 0;
            players.forEach(player => {
                if (player.gameHistory) {
                    totalGames += player.gameHistory.length;
                }
            });
            stats.totalGames = totalGames;
            
            // Сохраняем обновленную статистику
            await this.updateGameStats(stats);
            
            return stats;
        } catch (error) {
            console.error("Ошибка при обновлении статистики игроков:", error);
            return null;
        }
    }

    // Получение значений статистики по умолчанию
    getDefaultStats() {
        return {
            totalPlayers: 0,
            activePlayers: 0,
            totalGames: 0,
            totalSilver: 0,
            completedCampaigns: 0,
            mintedNfts: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    // Проверка инициализации базы данных
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    }
}

// Создаем экземпляр базы данных
const gameDB = new GameDatabase();

// Функция для открытия админ-панели
function openAdminPanel() {
    // Проверяем, имеет ли пользователь права администратора
    if (!gameSettings.adminWallets.includes(playerData.wallet)) {
        console.warn("Попытка несанкционированного доступа к админ-панели");
        return;
    }
    
    // Инициализируем админ-панель при первом открытии
    if (!adminState.initialized) {
        initAdminPanel();
    }
    
    // Показываем панель администратора
    showScreen('admin-container');
}

// Функция для инициализации админ-панели
async function initAdminPanel() {
    // Инициализируем базу данных
    await gameDB.init();
    
    // Обновляем HTML админ-панели
    updateAdminPanelHTML();
    
    // Настраиваем обработчики событий
    setupAdminTabs();
    setupItemForm();
    
    // Загружаем реальную статистику
    refreshGameStats();
    
    // Отмечаем, что панель инициализирована
    adminState.initialized = true;
}

// Функция для обновления HTML админ-панели
function updateAdminPanelHTML() {
    const adminContainer = document.getElementById('admin-container');
    if (!adminContainer) return;
    
    // Очищаем контейнер
    adminContainer.innerHTML = '';
    
    // Создаем новое содержимое
    adminContainer.innerHTML = `
        <h2>Admin Panel</h2>
        
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="stats">Statistics</button>
            <button class="tab-btn" data-tab="items">Add Items</button>
        </div>
        
        <div class="admin-tab-content">
            <!-- Вкладка статистики -->
            <div id="stats-tab" class="tab-panel active">
                <div class="admin-panel-section">
                    <h3>Game Statistics</h3>
                    <div class="admin-flex-container">
                        <div class="stats-container" id="stats-overview">
                            <div class="stat-card">
                                <div class="stat-icon">👤</div>
                                <div class="stat-value" id="total-players">0</div>
                                <div class="stat-label">Total Players</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🎮</div>
                                <div class="stat-value" id="total-games">0</div>
                                <div class="stat-label">Games Played</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🏆</div>
                                <div class="stat-value" id="completed-campaigns">0</div>
                                <div class="stat-label">Campaigns Completed</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">💰</div>
                                <div class="stat-value" id="total-silver">0</div>
                                <div class="stat-label">Total Silver</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📜</div>
                                <div class="stat-value" id="minted-nfts">0</div>
                                <div class="stat-label">NFTs Minted</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🔥</div>
                                <div class="stat-value" id="active-players">0</div>
                                <div class="stat-label">Active Players</div>
                            </div>
                        </div>
                    </div>
                    <div class="admin-actions">
                        <button id="refresh-stats-btn" class="action-btn">Refresh Stats</button>
                        <span id="last-updated">Last updated: Never</span>
                    </div>
                </div>
            </div>
            
            <!-- Вкладка добавления предметов -->
            <div id="items-tab" class="tab-panel">
                <div class="admin-panel-section">
                    <h3>Add New Item</h3>
                    <div class="admin-flex-container">
                        <div class="admin-form-container">
                            <form id="add-item-form">
                                <div class="form-group">
                                    <label for="item-type">Item Type:</label>
                                    <select id="item-type" class="form-control">
                                        <option value="card-skin">Card Skin</option>
                                        <option value="dice-skin">Dice Skin</option>
                                        <option value="special-card">Special Card</option>
                                        <option value="special-dice">Special Dice</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="item-name">Name:</label>
                                    <input type="text" id="item-name" class="form-control" placeholder="e.g. Dragon Scale Cards">
                                </div>
                                
                                <div class="form-group">
                                    <label for="item-price">Price (Silver):</label>
                                    <input type="number" id="item-price" class="form-control" min="0" value="100">
                                </div>
                                
                                <div class="form-group">
                                    <label for="item-rarity">Rarity:</label>
                                    <select id="item-rarity" class="form-control">
                                        <option value="Common">Common</option>
                                        <option value="Rare">Rare</option>
                                        <option value="Epic">Epic</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="item-description">Description:</label>
                                    <textarea id="item-description" class="form-control" rows="3" placeholder="Describe your item here..."></textarea>
                                </div>
                                
                                <div class="form-group effect-field" style="display: none;">
                                    <label for="item-effect">Effect:</label>
                                    <select id="item-effect" class="form-control"></select>
                                </div>
                                
                                <div class="form-group card-value-field" style="display: none;">
                                    <label for="card-value">Card Value:</label>
                                    <select id="card-value" class="form-control">
                                        <option value="A">Ace (A)</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                        <option value="6">6</option>
                                        <option value="7">7</option>
                                        <option value="8">8</option>
                                        <option value="9">9</option>
                                        <option value="10">10</option>
                                        <option value="J">Jack (J)</option>
                                        <option value="Q">Queen (Q)</option>
                                        <option value="K">King (K)</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="item-image">Image Path:</label>
                                    <input type="text" id="item-image" class="form-control" placeholder="assets/cards/skins/example_{suit}.png">
                                    <p class="form-hint">Use {suit} for cards, {value} for dice values</p>
                                </div>
                                
                                <div class="form-group">
                                    <label for="item-image-upload">Upload Image:</label>
                                    <div class="file-upload-container">
                                        <input type="file" id="item-image-upload" class="file-upload" accept="image/*">
                                        <button type="button" id="upload-trigger" class="upload-btn">Choose File</button>
                                        <span id="file-name">No file chosen</span>
                                    </div>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="button" id="preview-item-btn" class="preview-btn">Preview</button>
                                    <button type="submit" id="add-item-btn" class="submit-btn">Add Item</button>
                                </div>
                            </form>
                        </div>
                        
                        <div class="admin-preview-container" id="item-preview">
                            <h4>Preview</h4>
                            <div class="preview-content">
                                <p>Item preview will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <button id="close-admin-btn" class="close-btn">Close Admin Panel</button>
    `;
    
    // Добавляем стили для админ-панели
    addAdminStyles();
}

// Функция для добавления стилей админ-панели
function addAdminStyles() {
    // Проверяем, есть ли уже стили
    if (document.getElementById('admin-styles')) return;
    
    // Создаем элемент стиля
    const styleElement = document.createElement('style');
    styleElement.id = 'admin-styles';
    styleElement.textContent = `
        /* Основные стили админ-панели */
        .admin-container {
            background-color: #2b2b2b;
            color: #d4c2a7;
            max-width: 900px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        }
        
        .admin-container h2 {
            text-align: center;
            color: #b89d6e;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #4a3a2a;
        }
        
        .admin-container h3 {
            color: #b89d6e;
            margin-top: 0;
            margin-bottom: 15px;
        }
        
        .admin-container h4 {
            color: #b89d6e;
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        /* Вкладки */
        .admin-tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #4a3a2a;
        }
        
        .tab-btn {
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
            text-align: center;
        }
        
        .tab-btn:hover {
            background-color: #3a3a3a;
        }
        
        .tab-btn.active {
            background-color: #4a3a2a;
            font-weight: bold;
        }
        
        /* Панели вкладок */
        .tab-panel {
            display: none;
            margin-bottom: 20px;
        }
        
        .tab-panel.active {
            display: block;
        }
        
        /* Секции */
        .admin-panel-section {
            background-color: #353535;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        /* Гибкие контейнеры */
        .admin-flex-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .admin-form-container {
            flex: 1;
            min-width: 280px;
        }
        
        .admin-preview-container {
            flex: 1;
            min-width: 280px;
            background-color: #2b2b2b;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        /* Форма */
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-control {
            background-color: #2b2b2b;
            color: #d4c2a7;
            border: 1px solid #4a3a2a;
            padding: 8px 12px;
            border-radius: 4px;
            width: 100%;
            font-family: 'MedievalSharp', 'Georgia', serif;
        }
        
        .form-hint {
            font-size: 12px;
            color: #b89d6e;
            margin-top: -10px;
            margin-bottom: 15px;
            font-style: italic;
        }
        
        /* Загрузка файлов */
        .file-upload-container {
            position: relative;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .file-upload {
            position: absolute;
            width: 0.1px;
            height: 0.1px;
            opacity: 0;
            overflow: hidden;
            z-index: -1;
        }
        
        .upload-btn {
            background-color: #4a3a2a;
            color: #d4c2a7;
            border: 1px solid #b89d6e;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 4px;
            font-family: 'MedievalSharp', 'Georgia', serif;
        }
        
        #file-name {
            margin-left: 10px;
            font-style: italic;
            color: #a89d8e;
        }
        
        /* Кнопки */
        .form-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        
        .preview-btn {
            background-color: #3a3a3a;
            color: #d4c2a7;
            border: 1px solid #b89d6e;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 4px;
            font-family: 'MedievalSharp', 'Georgia', serif;
        }
        
        .submit-btn {
            background-color: #4a3a2a;
            color: #d4c2a7;
            border: 1px solid #b89d6e;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 4px;
            font-family: 'MedievalSharp', 'Georgia', serif;
        }
        
        .action-btn {
            background-color: #4a3a2a;
            color: #d4c2a7;
            border: 1px solid #b89d6e;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 4px;
            margin: 5px 0;
            font-family: 'MedievalSharp', 'Georgia', serif;
        }
        
        .close-btn {
            background-color: #4a3a2a;
            color: #d4c2a7;
            border: 1px solid #b89d6e;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 4px;
            margin: 20px auto 0;
            display: block;
            font-family: 'MedievalSharp', 'Georgia', serif;
        }
        
        /* Предварительный просмотр */
        .preview-content {
            width: 100%;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .preview-image-container {
            margin: 15px 0;
            border: 1px solid #4a3a2a;
            padding: 10px;
            border-radius: 5px;
            background-color: #1a1a1a;
        }
        
        .preview-image {
            max-width: 100%;
            max-height: 200px;
            object-fit: contain;
        }
        
        .card-preview {
            height: 150px;
            width: auto;
        }
        
        .dice-preview {
            height: 100px;
            width: auto;
        }
        
        .preview-effect {
            background-color: #3a3a3a;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            width: 100%;
            text-align: center;
        }
        
        .preview-price, .preview-rarity {
            margin: 5px 0;
        }
        
        /* Статистика */
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        
        .stat-card {
            background-color: #2b2b2b;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 15px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #b89d6e;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #a89d8e;
        }
        
        .admin-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 15px;
        }
        
        #last-updated {
            font-size: 12px;
            color: #a89d8e;
            font-style: italic;
        }
    `;
    
    // Добавляем стили в head
    document.head.appendChild(styleElement);
}

// Функция для настройки вкладок админ-панели
function setupAdminTabs() {
    // Получаем все кнопки вкладок
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // Добавляем обработчики событий
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Получаем ID вкладки
            const tabId = button.getAttribute('data-tab');
            
            // Сохраняем текущую вкладку
            adminState.currentTab = tabId;
            
            // Убираем активный класс со всех кнопок и вкладок
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-panel').forEach(content => {
                content.classList.remove('active');
            });
            
            // Делаем активной выбранную вкладку
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Устанавливаем начальную вкладку
    const initialTabButton = document.querySelector(`.tab-btn[data-tab="${adminState.currentTab}"]`);
    if (initialTabButton) {
        initialTabButton.click();
    } else {
        // По умолчанию показываем вкладку статистики
        const statsButton = document.querySelector(`.tab-btn[data-tab="stats"]`);
        if (statsButton) {
            statsButton.click();
        }
    }
}

// Функция для настройки формы добавления предметов
function setupItemForm() {
    const itemTypeSelect = document.getElementById('item-type');
    const effectField = document.querySelector('.effect-field');
    const effectSelect = document.getElementById('item-effect');
    const cardValueField = document.querySelector('.card-value-field');
    const previewBtn = document.getElementById('preview-item-btn');
    const addItemForm = document.getElementById('add-item-form');
    const fileUploadInput = document.getElementById('item-image-upload');
    const uploadTrigger = document.getElementById('upload-trigger');
    const fileNameSpan = document.getElementById('file-name');
    
    // Обработчик изменения типа предмета
    if (itemTypeSelect) {
        itemTypeSelect.addEventListener('change', () => {
            const selectedType = itemTypeSelect.value;
            
            // Показываем/скрываем поле эффекта
            if (selectedType === 'special-card' || selectedType === 'special-dice') {
                effectField.style.display = 'block';
                
                // Заполняем варианты эффектов
                const effectOptions = getEffectOptionsForType(selectedType);
                if (effectOptions && effectSelect) {
                    effectSelect.innerHTML = '';
                    
                    effectOptions.forEach(option => {
                        const optElement = document.createElement('option');
                        optElement.value = option.value;
                        optElement.textContent = option.text;
                        effectSelect.appendChild(optElement);
                    });
                }
            } else {
                effectField.style.display = 'none';
            }
            
            // Показываем/скрываем поле значения карты
            if (cardValueField) {
                if (selectedType === 'card-skin' || selectedType === 'special-card') {
                    cardValueField.style.display = 'block';
                } else {
                    cardValueField.style.display = 'none';
                }
            }
        });
        
        // Инициируем событие изменения
        itemTypeSelect.dispatchEvent(new Event('change'));
    }
    
    // Обработчик предварительного просмотра
    if (previewBtn) {
        previewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            previewItem();
        });
    }
    
    // Обработчик отправки формы
    if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewItem();
        });
    }
    
    // Обработчик загрузки файла
    if (uploadTrigger && fileUploadInput) {
        uploadTrigger.addEventListener('click', () => {
            fileUploadInput.click();
        });
        
        fileUploadInput.addEventListener('change', () => {
            if (fileUploadInput.files.length > 0) {
                const fileName = fileUploadInput.files[0].name;
                fileNameSpan.textContent = fileName;
                
                // Загружаем изображение и обновляем путь
                uploadImage(fileUploadInput.files[0]);
            } else {
                fileNameSpan.textContent = 'No file chosen';
            }
        });
    }
    
    // Кнопка закрытия админ-панели
    const closeAdminBtn = document.getElementById('close-admin-btn');
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', () => {
            showScreen('main-menu');
        });
    }
    
    // Кнопка обновления статистики
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', refreshGameStats);
    }
}

// Функция для загрузки изображения
function uploadImage(file) {
    // В реальном приложении здесь был бы код для загрузки файла на сервер
    // В этой демонстрации мы просто обновляем путь к изображению
    
    const itemTypeSelect = document.getElementById('item-type');
    const imagePathInput = document.getElementById('item-image');
    
    if (!itemTypeSelect || !imagePathInput) return;
    
    const type = itemTypeSelect.value;
    const fileName = file.name;
    
    // Генерируем относительный путь в зависимости от типа предмета
    let path;
    
    if (type === 'card-skin') {
        path = `assets/cards/skins/${fileName.replace(/\.\w+$/, '')}_{suit}.png`;
    } else if (type === 'special-card') {
        path = `assets/cards/special/${fileName.replace(/\.\w+$/, '')}_{suit}.png`;
    } else if (type === 'dice-skin') {
        path = `assets/dice/skins/${fileName.replace(/\.\w+$/, '')}_{value}.png`;
    } else {
        path = `assets/dice/special/${fileName.replace(/\.\w+$/, '')}_{value}.png`;
    }
    
    // Обновляем поле ввода
    imagePathInput.value = path;
    
    // Обновляем предпросмотр
    previewItem();
}

// Функция для обновления игровой статистики
async function refreshGameStats() {
    try {
        // Инициализируем базу данных, если еще не сделано
        await gameDB.ensureInit();
        
        // Регистрируем текущего игрока, если его еще нет в базе
        await gameDB.registerPlayer(playerData.wallet, playerData.name, playerData);
        
        // Обновляем статистику игроков
        const stats = await gameDB.updatePlayerStats();
        
        if (!stats) {
            showGameMessage("Failed to update statistics", "warning");
            return;
        }
        
        // Обновляем элементы интерфейса
        document.getElementById('total-players').textContent = stats.totalPlayers;
        document.getElementById('active-players').textContent = stats.activePlayers;
        document.getElementById('total-games').textContent = stats.totalGames;
        document.getElementById('total-silver').textContent = formatNumber(stats.totalSilver);
        document.getElementById('completed-campaigns').textContent = stats.completedCampaigns;
        document.getElementById('minted-nfts').textContent = stats.mintedNfts;
        
        // Обновляем время последнего обновления
        document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleString()}`;
        
        // Показываем сообщение
        showGameMessage("Statistics refreshed successfully", "success");
    } catch (error) {
        console.error("Error refreshing game stats:", error);
        showGameMessage("Error refreshing game stats: " + error.message, "warning");
    }
}

// Функция для получения опций эффектов в зависимости от типа
function getEffectOptionsForType(type) {
    if (type === 'special-card') {
        return [
            { value: 'pointsMultiplier', text: 'Points Multiplier (1.5x)' },
            { value: 'wildcard', text: 'Wildcard (Works with any die)' },
            { value: 'extraTurn', text: 'Extra Turn' },
            { value: 'goldMultiplier', text: 'Gold Multiplier (1.25x)' }
        ];
    } else if (type === 'special-dice') {
        return [
            { value: 'weightedLow', text: 'Higher chance of lower numbers (1-3)' },
            { value: 'weightedHigh', text: 'Higher chance of higher numbers (4-6)' },
            { value: 'weightedEven', text: 'Higher chance of even numbers (2, 4, 6)' },
            { value: 'weightedOdd', text: 'Higher chance of odd numbers (1, 3, 5)' },
            { value: 'pointsMultiplier', text: 'Points Multiplier (1.5x)' },
            { value: 'extraTurn', text: 'Extra Turn' }
        ];
    }
    
    return [];
}

// Функция для предварительного просмотра предмета
function previewItem() {
    // Получаем данные из формы
    const type = document.getElementById('item-type').value;
    const name = document.getElementById('item-name').value;
    const price = parseInt(document.getElementById('item-price').value) || 0;
    const rarity = document.getElementById('item-rarity').value;
    const description = document.getElementById('item-description').value;
    const effect = document.getElementById('item-effect')?.value;
    const imagePath = document.getElementById('item-image').value;
    
    // Для карт получаем значение
    const cardValue = document.getElementById('card-value')?.value;
    
    // Проверяем, что есть минимально необходимые данные
    if (!name || !imagePath) {
        showGameMessage("Please fill in at least the name and image path", "warning");
        return;
    }
    
    // Создаем объект предмета
    const item = {
        type,
        name,
        price,
        rarity,
        description,
        image: imagePath
    };
    
    // Для карт добавляем значение
    if ((type === 'card-skin' || type === 'special-card') && cardValue) {
        item.value = cardValue;
    }
    
    // Добавляем эффект для специальных предметов
    if ((type === 'special-card' || type === 'special-dice') && effect) {
        item.effect = effect;
        
        // Добавляем дополнительные параметры в зависимости от эффекта
        switch (effect) {
            case 'pointsMultiplier':
                item.value = 1.5;
                break;
            case 'weightedLow':
                item.weights = [30, 22.5, 17.5, 15, 10, 5];
                break;
            case 'weightedHigh':
                item.weights = [5, 10, 15, 17.5, 22.5, 30];
                break;
            case 'weightedEven':
                item.weights = [8.3, 25, 8.3, 25, 8.3, 25];
                break;
            case 'weightedOdd':
                item.weights = [25, 8.3, 25, 8.3, 25, 8.3];
                break;
        }
    }
    
    // Сохраняем данные для предпросмотра
    adminState.preview = {
        visible: true,
        data: item
    };
    
    // Обновляем предпросмотр
    updateItemPreview(item);
}

// Функция обновления предпросмотра предмета
function updateItemPreview(item) {
    const previewContainer = document.querySelector('.preview-content');
    if (!previewContainer) return;
    
    // Определяем тип предпросмотра
    const isCard = item.type === 'card-skin' || item.type === 'special-card';
    
    // Создаем HTML для предпросмотра
    let previewHTML = `
        <h4>${item.name}</h4>
        <p class="preview-price">${item.price} Silver</p>
        <p class="preview-rarity">Rarity: ${item.rarity}</p>
    `;
    
    // Добавляем изображение
    if (isCard) {
        // Заменяем плейсхолдер для масти на spades для предпросмотра
        const imagePath = item.image.replace('{suit}', 'spades');
        
        previewHTML += `
            <div class="preview-image-container">
                <img src="${imagePath}" alt="${item.name}" class="preview-image card-preview">
            </div>
            <p>Preview shown with Spades suit</p>
        `;
    } else {
        // Для кубиков используем изображение без плейсхолдера или с плейсхолдером значения 1
        const imagePath = item.image.replace('{value}', '1');
        
        previewHTML += `
            <div class="preview-image-container">
                <img src="${imagePath}" alt="${item.name}" class="preview-image dice-preview">
            </div>
        `;
    }
    
    // Добавляем информацию об эффекте
    if (item.effect) {
        previewHTML += `
            <div class="preview-effect">
                <h5>Effect: ${getEffectDescription(item.effect)}</h5>
            </div>
        `;
    }
    
    // Добавляем описание
    previewHTML += `
        <div class="preview-description">
            <p>${item.description || 'No description provided'}</p>
        </div>
    `;
    
    // Обновляем содержимое
    previewContainer.innerHTML = previewHTML;
}

// Функция для получения описания эффекта
function getEffectDescription(effect) {
    switch (effect) {
        case 'pointsMultiplier':
            return 'Gives 1.5x points multiplier when used in a combination';
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

// Функция для добавления нового предмета
function addNewItem() {
    // Проверяем, есть ли данные предпросмотра
    if (!adminState.preview.visible || !adminState.preview.data) {
        // Если нет, создаем предпросмотр
        previewItem();
        
        // Если всё еще нет данных, значит есть ошибки
        if (!adminState.preview.visible || !adminState.preview.data) {
            return;
        }
    }
    
    // Получаем данные предмета
    const item = adminState.preview.data;
    
    // Проверяем для карт необходимость значения
    if ((item.type === 'card-skin' || item.type === 'special-card') && !item.value) {
        showGameMessage("Please select a card value for this item", "warning");
        return;
    }
    
    // Добавляем предмет в соответствующую категорию
    let addPromise;
    
    if (item.type === 'card-skin' || item.type === 'special-card') {
        addPromise = ContentManager.addCard(item);
    } else {
        addPromise = ContentManager.addDie(item);
    }
    
    // Обрабатываем результат
    addPromise.then(newItem => {
        // Очищаем форму
        document.getElementById('add-item-form').reset();
        document.getElementById('file-name').textContent = 'No file chosen';
        
        // Сбрасываем предпросмотр
        adminState.preview = {
            visible: false,
            data: null
        };
        
        // Очищаем предпросмотр
        const previewContainer = document.querySelector('.preview-content');
        if (previewContainer) {
            previewContainer.innerHTML = '<p>Item preview will appear here</p>';
        }
        
        // Обновляем магазин
        ContentManager.updateShopFromDatabase().then(() => {
            // Показываем сообщение об успехе
            showGameMessage(`Item "${item.name}" added successfully!`, "success");
        });
    }).catch(error => {
        console.error("Error adding item:", error);
        showGameMessage("Failed to add item: " + error.message, "warning");
    });
}

// Вспомогательная функция для форматирования чисел
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}