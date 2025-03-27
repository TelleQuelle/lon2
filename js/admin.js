/**
 * Admin.js - Обновленная панель администратора
 * 
 * Этот файл содержит функции для панели администратора,
 * включая добавление товаров и управление игрой с поддержкой базы данных.
 */

// Глобальные переменные для админ-панели
const adminState = {
    initialized: false,
    currentTab: 'items',
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
    }

    // Инициализация базы данных
    async init() {
        if (this.initialized) return;

        // Проверяем, доступно ли IndexedDB
        if (!window.indexedDB) {
            console.log("IndexedDB не поддерживается в этом браузере. Используем localStorage.");
            this.useLocalStorage = true;
            this.initLocalStorage();
            this.initialized = true;
            return;
        }

        try {
            // Открываем или создаем базу данных
            const request = indexedDB.open(this.dbName, 1);

            // Создание схемы базы данных
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

            // Обработка успешного открытия
            const openPromise = new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.useLocalStorage = false;
                    this.initialized = true;
                    resolve();
                };

                request.onerror = (event) => {
                    console.error("Ошибка открытия базы данных:", event.target.error);
                    this.useLocalStorage = true;
                    this.initLocalStorage();
                    this.initialized = true;
                    reject(event.target.error);
                };
            });

            await openPromise;
            
            // Инициализация начальных данных, если их нет
            await this.initStatisticsIfNeeded();
            
        } catch (error) {
            console.error("Ошибка инициализации базы данных:", error);
            this.useLocalStorage = true;
            this.initLocalStorage();
            this.initialized = true;
        }
    }

    // Инициализация хранилища при использовании localStorage
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

    // Получение статистики текущего игрока
    async getCurrentPlayerStats(wallet) {
        await this.ensureInit();
        
        if (!wallet) return null;
        
        if (this.useLocalStorage) {
            const playersJson = localStorage.getItem(`${this.dbName}_${this.playersStore}`);
            const players = playersJson ? JSON.parse(playersJson) : [];
            return players.find(p => p.wallet === wallet) || null;
        }
        
        try {
            const transaction = this.db.transaction([this.playersStore], 'readonly');
            const store = transaction.objectStore(this.playersStore);
            
            const playerRequest = store.get(wallet);
            
            return new Promise((resolve, reject) => {
                playerRequest.onsuccess = () => {
                    resolve(playerRequest.result || null);
                };
                
                playerRequest.onerror = (event) => {
                    console.error("Ошибка получения данных игрока:", event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error("Ошибка при получении данных текущего игрока:", error);
            return null;
        }
    }

    // Инициализация статистики с значениями по умолчанию
    async initStatisticsIfNeeded() {
        const stats = await this.getGameStats();
        
        // Проверяем, есть ли уже данные
        if (Object.keys(stats).length > 0) return;
        
        // Инициализируем с значениями по умолчанию
        await this.updateGameStats(this.getDefaultStats());
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
    
    // Настраиваем обработчики событий и заполняем данные
    setupAdminTabs();
    setupItemForm();
    setupFileUpload();
    setupPreviewSystem();
    
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
            <button class="tab-btn active" data-tab="items">Add Items</button>
            <button class="tab-btn" data-tab="content">Content Manager</button>
            <button class="tab-btn" data-tab="stats">Statistics</button>
            <button class="tab-btn" data-tab="tools">Tools</button>
        </div>
        
        <div class="admin-tab-content">
            <!-- Вкладка добавления предметов -->
            <div id="items-tab" class="tab-panel active">
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
                                
                                <div class="form-group">
                                    <label for="item-image">Image Path:</label>
                                    <input type="text" id="item-image" class="form-control" placeholder="assets/cards/skins/example_{suit}.png">
                                </div>
                                
                                <p class="form-hint">Use {suit} placeholder for cards to support different suits</p>
                                
                                <div class="form-group">
                                    <label>Upload Image:</label>
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
                
                <div class="admin-panel-section">
                    <h3>Recently Added Items</h3>
                    <div id="recent-items" class="recent-items-grid">
                        <!-- Недавно добавленные предметы будут здесь -->
                    </div>
                </div>
            </div>
            
            <!-- Вкладка управления контентом -->
            <div id="content-tab" class="tab-panel">
                <div class="admin-panel-section">
                    <h3>Content Management</h3>
                    <div class="admin-flex-container">
                        <div class="admin-section-half">
                            <h4>Export & Import</h4>
                            <p>Export your content or import from JSON file.</p>
                            <div class="button-group">
                                <button id="export-content-btn" class="action-btn">Export All Content</button>
                                <div class="file-upload-container">
                                    <input type="file" id="import-content-file" accept=".json" class="file-upload">
                                    <button id="import-content-btn" class="action-btn">Import Content</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-section-half">
                            <h4>Content Overview</h4>
                            <div id="content-stats" class="stats-container">
                                <div class="stat-item">
                                    <span class="stat-label">Card Skins:</span>
                                    <span class="stat-value" id="card-skin-count">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Dice Skins:</span>
                                    <span class="stat-value" id="dice-skin-count">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Special Cards:</span>
                                    <span class="stat-value" id="special-card-count">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Special Dice:</span>
                                    <span class="stat-value" id="special-dice-count">0</span>
                                </div>
                            </div>
                            <button id="refresh-content-btn" class="action-btn">Refresh Content</button>
                        </div>
                    </div>
                </div>
                
                <div class="admin-panel-section">
                    <h3>Batch Item Management</h3>
                    <div class="admin-flex-container">
                        <div class="admin-section-half">
                            <h4>Templates</h4>
                            <p>Download templates for bulk content creation.</p>
                            <div class="button-group">
                                <button id="download-card-template-btn" class="action-btn">Card Template</button>
                                <button id="download-dice-template-btn" class="action-btn">Dice Template</button>
                            </div>
                        </div>
                        
                        <div class="admin-section-half">
                            <h4>Batch Upload</h4>
                            <p>Upload multiple items at once from a JSON file.</p>
                            <div class="file-upload-container">
                                <input type="file" id="batch-upload-file" accept=".json" class="file-upload">
                                <button id="batch-upload-btn" class="action-btn">Upload Batch</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Вкладка статистики -->
            <div id="stats-tab" class="tab-panel">
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
                
                <div class="admin-panel-section">
                    <h3>Player Management</h3>
                    <div class="admin-flex-container">
                        <div class="admin-section-half">
                            <h4>Current Player</h4>
                            <div id="current-player-info" class="player-info">
                                <!-- Информация о текущем игроке будет здесь -->
                            </div>
                        </div>
                        
                        <div class="admin-section-half">
                            <h4>Actions</h4>
                            <div class="button-group">
                                <button id="unlock-all-levels-btn" class="action-btn">Unlock All Levels</button>
                                <button id="give-silver-btn" class="action-btn">Give 1000 Silver</button>
                                <button id="reset-player-btn" class="danger-btn">Reset Player Data</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Вкладка инструментов -->
            <div id="tools-tab" class="tab-panel">
                <div class="admin-panel-section">
                    <h3>Database Management</h3>
                    <div class="admin-flex-container">
                        <div class="admin-section-half">
                            <h4>Backup & Restore</h4>
                            <div class="button-group">
                                <button id="backup-database-btn" class="action-btn">Backup Database</button>
                                <div class="file-upload-container">
                                    <input type="file" id="restore-database-file" accept=".json" class="file-upload">
                                    <button id="restore-database-btn" class="action-btn">Restore Database</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-section-half">
                            <h4>Database Operations</h4>
                            <div class="button-group">
                                <button id="clear-database-btn" class="danger-btn">Clear Database</button>
                                <button id="reset-shop-btn" class="danger-btn">Reset Shop to Default</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-panel-section">
                    <h3>Advanced Tools</h3>
                    <div class="admin-flex-container">
                        <div class="admin-section-half">
                            <h4>Testing</h4>
                            <div class="button-group">
                                <button id="test-game-btn" class="action-btn">Enable Test Mode</button>
                                <button id="generate-test-data-btn" class="action-btn">Generate Test Data</button>
                            </div>
                        </div>
                        
                        <div class="admin-section-half">
                            <h4>Performance</h4>
                            <div class="button-group">
                                <button id="clear-cache-btn" class="action-btn">Clear Cache</button>
                                <button id="optimize-db-btn" class="action-btn">Optimize Database</button>
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
        
        .admin-section-half {
            flex: 1;
            min-width: 280px;
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
        
        .danger-btn {
            background-color: #5a3a3a;
            color: #d4c2a7;
            border: 1px solid #cc6666;
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
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #4a3a2a;
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
        
        /* Информация об игроке */
        .player-info {
            background-color: #2b2b2b;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 15px;
        }
        
        /* Недавно добавленные предметы */
        .recent-items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        
        .recent-item {
            background-color: #2b2b2b;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        
        .recent-item:hover {
            transform: scale(1.05);
        }
        
        .recent-item img {
            max-width: 100%;
            height: auto;
            margin-bottom: 5px;
            border-radius: 3px;
        }
        
        .recent-item-name {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Кнопка группы */
        .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
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
    }
}

// Функция для настройки формы добавления предметов
function setupItemForm() {
    const itemTypeSelect = document.getElementById('item-type');
    const effectField = document.querySelector('.effect-field');
    const effectSelect = document.getElementById('item-effect');
    const previewBtn = document.getElementById('preview-item-btn');
    const addItemForm = document.getElementById('add-item-form');
    const fileUploadInput = document.getElementById('item-image-upload');
    const uploadTrigger = document.getElementById('upload-trigger');
    const fileNameSpan = document.getElementById('file-name');
    
    // Добавляем поле для партнерских предметов
    const partnerSection = document.createElement('div');
    partnerSection.className = 'form-group partner-field';
    partnerSection.style.display = 'none';
    partnerSection.innerHTML = `
        <label for="is-partner-item">Partner Item:</label>
        <select id="is-partner-item" class="form-control">
            <option value="false">No</option>
            <option value="true">Yes</option>
        </select>
        
        <div id="partner-details" style="display: none;">
            <div class="form-group">
                <label for="partner-name">Partner Name:</label>
                <input type="text" id="partner-name" class="form-control" placeholder="Partner Name">
            </div>
            
            <div class="form-group">
                <label for="partner-logo">Partner Logo URL:</label>
                <input type="text" id="partner-logo" class="form-control" placeholder="assets/partners/logo.png">
            </div>
            
            <div class="form-group">
                <label for="partner-twitter">Twitter URL:</label>
                <input type="text" id="partner-twitter" class="form-control" placeholder="https://twitter.com/partner">
            </div>
            
            <div class="form-group">
                <label for="partner-discord">Discord URL:</label>
                <input type="text" id="partner-discord" class="form-control" placeholder="https://discord.gg/partner">
            </div>
            
            <div class="form-group">
                <label>Upload Partner Logo:</label>
                <div class="file-upload-container">
                    <input type="file" id="partner-logo-upload" class="file-upload" accept="image/*">
                    <button type="button" id="partner-logo-trigger" class="upload-btn">Choose File</button>
                    <span id="partner-logo-name">No file chosen</span>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем поле для значения карты
    const cardValueSection = document.createElement('div');
    cardValueSection.className = 'form-group card-value-field';
    cardValueSection.style.display = 'none';
    cardValueSection.innerHTML = `
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
        <p class="form-hint">For card skins and special cards, you need to specify the value.</p>
    `;
    
    // Добавляем подсказку о форматах изображений для карт и кубиков
    const imageHintSection = document.createElement('div');
    imageHintSection.className = 'form-group image-hint-field';
    imageHintSection.innerHTML = `
        <div class="hint-box">
            <h4>Image Path Format:</h4>
            <p class="card-format-hint" style="display: none;">
                For cards, use placeholders in image path:<br>
                <code>{suit}</code> - will be replaced with heart, diamond, club, spade<br>
                <code>{value}</code> - will be replaced with card value (A, 2, 3... K)<br>
                Example: <code>assets/cards/skins/myskin_{suit}_{value}.png</code>
            </p>
            <p class="dice-format-hint" style="display: none;">
                For dice, use placeholders in image path:<br>
                <code>{value}</code> - will be replaced with dice value (1-6)<br>
                Example: <code>assets/dice/skins/myskin_{value}.png</code><br>
                For default dice image (without value): <code>assets/dice/skins/myskin.png</code>
            </p>
        </div>
    `;
    
    // Добавляем новые элементы в форму
    if (addItemForm) {
        // Находим место для вставки
        const effectField = document.querySelector('.effect-field');
        if (effectField) {
            // Вставляем после поля эффекта
            effectField.parentNode.insertBefore(cardValueSection, effectField.nextSibling);
            effectField.parentNode.insertBefore(partnerSection, cardValueSection.nextSibling);
            
            // Вставляем подсказку после поля изображения
            const imageField = document.querySelector('#item-image').parentNode;
            if (imageField) {
                imageField.parentNode.insertBefore(imageHintSection, imageField.nextSibling);
            }
        }
    }
    
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
            const cardValueField = document.querySelector('.card-value-field');
            if (cardValueField) {
                if (selectedType === 'card-skin' || selectedType === 'special-card') {
                    cardValueField.style.display = 'block';
                } else {
                    cardValueField.style.display = 'none';
                }
            }
            
            // Показываем/скрываем поле для партнерских предметов
            const partnerField = document.querySelector('.partner-field');
            if (partnerField) {
                partnerField.style.display = 'block'; // Можно для всех типов
            }
            
            // Обновляем подсказки о формате изображений
            const cardFormatHint = document.querySelector('.card-format-hint');
            const diceFormatHint = document.querySelector('.dice-format-hint');
            
            if (cardFormatHint && diceFormatHint) {
                if (selectedType === 'card-skin' || selectedType === 'special-card') {
                    cardFormatHint.style.display = 'block';
                    diceFormatHint.style.display = 'none';
                } else {
                    cardFormatHint.style.display = 'none';
                    diceFormatHint.style.display = 'block';
                }
            }
        });
        
        // Инициируем событие изменения
        itemTypeSelect.dispatchEvent(new Event('change'));
    }
    
    // Обработчик для переключения отображения деталей партнера
    const isPartnerItem = document.getElementById('is-partner-item');
    const partnerDetails = document.getElementById('partner-details');
    
    if (isPartnerItem && partnerDetails) {
        isPartnerItem.addEventListener('change', () => {
            if (isPartnerItem.value === 'true') {
                partnerDetails.style.display = 'block';
            } else {
                partnerDetails.style.display = 'none';
            }
        });
    }
    
    // Обработчик загрузки лого партнера
    const partnerLogoUpload = document.getElementById('partner-logo-upload');
    const partnerLogoTrigger = document.getElementById('partner-logo-trigger');
    const partnerLogoName = document.getElementById('partner-logo-name');
    
    if (partnerLogoUpload && partnerLogoTrigger && partnerLogoName) {
        partnerLogoTrigger.addEventListener('click', () => {
            partnerLogoUpload.click();
        });
        
        partnerLogoUpload.addEventListener('change', () => {
            if (partnerLogoUpload.files.length > 0) {
                const fileName = partnerLogoUpload.files[0].name;
                partnerLogoName.textContent = fileName;
                
                // Загружаем изображение и обновляем путь
                uploadPartnerLogo(partnerLogoUpload.files[0]);
            } else {
                partnerLogoName.textContent = 'No file chosen';
            }
        });
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
    
    // Добавляем стили для подсказки
    const style = document.createElement('style');
    style.textContent = `
        .hint-box {
            background-color: #3a3a3a;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .hint-box h4 {
            color: #b89d6e;
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        .hint-box p {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .hint-box code {
            background-color: #2b2b2b;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
            color: #d4c2a7;
        }
    `;
    
    document.head.appendChild(style);
}

// Функция для настройки загрузки файлов
function setupFileUpload() {
    // Настраиваем обработчики для экспорта/импорта
    const exportContentBtn = document.getElementById('export-content-btn');
    const importContentBtn = document.getElementById('import-content-btn');
    const importContentFile = document.getElementById('import-content-file');
    
    if (exportContentBtn) {
        exportContentBtn.addEventListener('click', exportContent);
    }
    
    if (importContentBtn && importContentFile) {
        importContentBtn.addEventListener('click', () => {
            importContentFile.click();
        });
        
        importContentFile.addEventListener('change', () => {
            if (importContentFile.files.length > 0) {
                importContent(importContentFile.files[0]);
            }
        });
    }
    
    // Настраиваем обработчики для шаблонов
    const downloadCardTemplateBtn = document.getElementById('download-card-template-btn');
    const downloadDiceTemplateBtn = document.getElementById('download-dice-template-btn');
    
    if (downloadCardTemplateBtn) {
        downloadCardTemplateBtn.addEventListener('click', () => downloadTemplate('card'));
    }
    
    if (downloadDiceTemplateBtn) {
        downloadDiceTemplateBtn.addEventListener('click', () => downloadTemplate('dice'));
    }
    
    // Настраиваем обработчики для пакетной загрузки
    const batchUploadBtn = document.getElementById('batch-upload-btn');
    const batchUploadFile = document.getElementById('batch-upload-file');
    
    if (batchUploadBtn && batchUploadFile) {
        batchUploadBtn.addEventListener('click', () => {
            batchUploadFile.click();
        });
        
        batchUploadFile.addEventListener('change', () => {
            if (batchUploadFile.files.length > 0) {
                uploadBatch(batchUploadFile.files[0]);
            }
        });
    }
}// Функция для настройки действий админ-панели

// Функция для резервного копирования базы данных
function backupDatabase() {
    // Получаем все данные
    Promise.all([
        ContentManager.getAllCards(),
        ContentManager.getAllDice(),
        gameDB.getAllPlayers(),
        gameDB.getGameStats()
    ]).then(([cards, dice, players, stats]) => {
        // Создаем объект с данными
        const exportData = {
            cards,
            dice,
            players,
            stats,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Преобразуем в JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Создаем Blob
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lands-of-nanti-backup-${new Date().toISOString().slice(0, 10)}.json`;
        
        // Добавляем в документ и симулируем клик
        document.body.appendChild(link);
        link.click();
        
        // Удаляем ссылку
        document.body.removeChild(link);
        
        // Показываем сообщение
        showGameMessage("Database backup created successfully", "success");
    }).catch(error => {
        console.error("Error creating database backup:", error);
        showGameMessage("Error creating database backup: " + error.message, "warning");
    });
}

// Функция для восстановления базы данных
function restoreDatabase(file) {
    // Проверяем файл
    if (!file) {
        showGameMessage("No file selected", "warning");
        return;
    }
    
    // Читаем файл
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Парсим JSON
            const data = JSON.parse(e.target.result);
            
            // Проверяем валидность
            if (!data.cards || !data.dice || !data.players || !data.stats) {
                showGameMessage("Invalid backup file format", "warning");
                return;
            }
            
            // Показываем диалог подтверждения
            if (confirm("This will replace your current database. Are you sure?")) {
                // Очищаем текущую базу данных
                Promise.all([
                    ContentManager._clearDatabase(),
                    gameDB.ensureInit()
                ]).then(() => {
                    // Импортируем данные
                    const promises = [];
                    
                    // Добавляем карты
                    data.cards.forEach(card => {
                        promises.push(ContentManager.addCard(card));
                    });
                    
                    // Добавляем кубики
                    data.dice.forEach(die => {
                        promises.push(ContentManager.addDie(die));
                    });
                    
                    // Добавляем игроков
                    data.players.forEach(player => {
                        promises.push(gameDB.registerPlayer(player.wallet, player.name, player));
                    });
                    
                    // Обновляем статистику
                    promises.push(gameDB.updateGameStats(data.stats));
                    
                    // Ждем завершения всех операций
                    Promise.all(promises).then(() => {
                        // Обновляем магазин
                        ContentManager.updateShopFromDatabase().then(() => {
                            // Обновляем статистику
                            refreshGameStats();
                            refreshContentStats();
                            
                            // Показываем сообщение
                            showGameMessage("Database restored successfully", "success");
                        });
                    });
                });
            }
        } catch (error) {
            console.error("Error parsing backup file:", error);
            showGameMessage("Error parsing backup file: " + error.message, "warning");
        }
    };
    
    reader.onerror = function(e) {
        console.error("Error reading backup file:", e);
        showGameMessage("Error reading backup file", "warning");
    };
    
    reader.readAsText(file);
}

// Функция для очистки базы данных
function clearDatabase() {
    // Запрашиваем подтверждение
    if (!confirm("Are you sure you want to clear the database? This will delete all custom content and statistics.")) {
        return;
    }
    
    // Очищаем базу данных
    Promise.all([
        ContentManager._clearDatabase(),
        gameDB.ensureInit().then(() => {
            // Очищаем все хранилища
            return Promise.all([
                new Promise((resolve, reject) => {
                    try {
                        localStorage.removeItem(`${gameDB.dbName}_${gameDB.statsStore}`);
                        localStorage.removeItem(`${gameDB.dbName}_${gameDB.playersStore}`);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
            ]);
        })
    ]).then(() => {
        // Инициализируем значения по умолчанию
        return Promise.all([
            gameDB.initStatisticsIfNeeded(),
            ContentManager.updateShopFromDatabase()
        ]);
    }).then(() => {
        // Обновляем статистику
        refreshGameStats();
        refreshContentStats();
        
        // Показываем сообщение
        showGameMessage("Database cleared successfully", "success");
    }).catch(error => {
        console.error("Error clearing database:", error);
        showGameMessage("Error clearing database: " + error.message, "warning");
    });
}

function setupAdminActions() {
    // Обработчики для вкладки статистики
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');
    const unlockAllLevelsBtn = document.getElementById('unlock-all-levels-btn');
    const giveSilverBtn = document.getElementById('give-silver-btn');
    const resetPlayerBtn = document.getElementById('reset-player-btn');
    
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', refreshGameStats);
    }
    
    if (unlockAllLevelsBtn) {
        unlockAllLevelsBtn.addEventListener('click', unlockAllLevels);
    }
    
    if (giveSilverBtn) {
        giveSilverBtn.addEventListener('click', giveSilverToPlayer);
    }
    
    if (resetPlayerBtn) {
        resetPlayerBtn.addEventListener('click', resetPlayerData);
    }
    
    // Обработчики для вкладки инструментов
    const backupDatabaseBtn = document.getElementById('backup-database-btn');
    const restoreDatabaseBtn = document.getElementById('restore-database-btn');
    const restoreDatabaseFile = document.getElementById('restore-database-file');
    const clearDatabaseBtn = document.getElementById('clear-database-btn');
    const resetShopBtn = document.getElementById('reset-shop-btn');
    const testGameBtn = document.getElementById('test-game-btn');
    const generateTestDataBtn = document.getElementById('generate-test-data-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const optimizeDbBtn = document.getElementById('optimize-db-btn');
    
    if (backupDatabaseBtn) {
        backupDatabaseBtn.addEventListener('click', backupDatabase);
    }
    
    if (restoreDatabaseBtn && restoreDatabaseFile) {
        restoreDatabaseBtn.addEventListener('click', () => {
            restoreDatabaseFile.click();
        });
        
        restoreDatabaseFile.addEventListener('change', () => {
            if (restoreDatabaseFile.files.length > 0) {
                restoreDatabase(restoreDatabaseFile.files[0]);
            }
        });
    }
    
    if (clearDatabaseBtn) {
        clearDatabaseBtn.addEventListener('click', clearDatabase);
    }
    
    if (resetShopBtn) {
        resetShopBtn.addEventListener('click', resetShop);
    }
    
    if (testGameBtn) {
        testGameBtn.addEventListener('click', enableTestMode);
    }
    
    if (generateTestDataBtn) {
        generateTestDataBtn.addEventListener('click', generateTestData);
    }
    
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }
    
    if (optimizeDbBtn) {
        optimizeDbBtn.addEventListener('click', optimizeDatabase);
    }
    
    // Кнопка закрытия админ-панели
    const closeAdminBtn = document.getElementById('close-admin-btn');
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', () => {
            showScreen('main-menu');
        });
    }
}

// Функция для сброса магазина к значениям по умолчанию
function resetShop() {
    // Запрашиваем подтверждение
    if (!confirm("Are you sure you want to reset the shop to default items?")) {
        return;
    }
    
    // Получаем стандартные данные магазина
    const defaultShopData = getShopData(true);
    
    // Сохраняем их
    saveShopData(defaultShopData);
    
    // Показываем сообщение
    showGameMessage("Shop reset to default", "success");
    
    // Перезагружаем магазин, если он открыт
    if (document.getElementById('shop-container').style.display === 'block') {
        loadShopItems();
    }
}

// Функция для включения тестового режима
function enableTestMode() {
    // Устанавливаем тестовый режим
    localStorage.setItem('testMode', 'true');
    
    // Показываем сообщение
    showGameMessage("Test mode enabled. The page will reload...", "success");
    
    // Перезагружаем страницу через 2 секунды
    setTimeout(() => {
        location.reload();
    }, 2000);
}

// Функция для генерации тестовых данных
function generateTestData() {
    // Запрашиваем подтверждение
    if (!confirm("This will generate test data in your database. Continue?")) {
        return;
    }
    
    // Генерируем тестовых игроков
    const players = [];
    
    for (let i = 1; i <= 10; i++) {
        const player = {
            wallet: `test_wallet_${i}`,
            name: `Test Player ${i}`,
            silver: Math.floor(Math.random() * 5000) + 500,
            completedLevels: [],
            inventory: {
                cards: [],
                dice: []
            },
            lastLogin: new Date().toISOString(),
            gameHistory: []
        };
        
        // Случайное количество пройденных уровней
        const completedLevelsCount = Math.floor(Math.random() * 10) + 1;
        for (let j = 1; j <= completedLevelsCount; j++) {
            player.completedLevels.push(j);
        }
        
        // Случайное количество игр
        const gameCount = Math.floor(Math.random() * 20) + 5;
        for (let j = 0; j < gameCount; j++) {
            player.gameHistory.push({
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                level: Math.floor(Math.random() * 10) + 1,
                score: Math.floor(Math.random() * 3000) + 500,
                result: Math.random() > 0.3 ? 'win' : 'lose'
            });
        }
        
        // Генерируем случайные предметы в инвентаре
        const cardCount = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < cardCount; j++) {
            player.inventory.cards.push({
                id: `test_card_${j}`,
                name: `Test Card ${j}`,
                type: Math.random() > 0.5 ? 'card-skin' : 'special-card',
                rarity: ['Common', 'Rare', 'Epic'][Math.floor(Math.random() * 3)]
            });
        }
        
        const diceCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < diceCount; j++) {
            player.inventory.dice.push({
                id: `test_dice_${j}`,
                name: `Test Dice ${j}`,
                type: Math.random() > 0.5 ? 'dice-skin' : 'special-dice',
                rarity: ['Common', 'Rare', 'Epic'][Math.floor(Math.random() * 3)]
            });
        }
        
        // Добавляем игрока
        players.push(player);
    }
    
    // Сохраняем игроков в базу данных
    const promises = players.map(player => 
        gameDB.registerPlayer(player.wallet, player.name, player)
    );
    
    // Ждем завершения всех операций
    Promise.all(promises).then(() => {
        // Обновляем статистику
        return gameDB.updatePlayerStats();
    }).then(() => {
        // Обновляем интерфейс
        refreshGameStats();
        
        // Показываем сообщение
        showGameMessage("Test data generated successfully", "success");
    }).catch(error => {
        console.error("Error generating test data:", error);
        showGameMessage("Error generating test data: " + error.message, "warning");
    });
}

// Функция для очистки кэша
function clearCache() {
    // Запрашиваем подтверждение
    if (!confirm("Are you sure you want to clear the cache? This will not delete your data.")) {
        return;
    }
    
    // Очищаем кэш
    try {
        // Очищаем локальное хранилище сессии
        sessionStorage.clear();
        
        // Очищаем кэш приложения, если возможно
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ action: 'clearCache' });
        }
        
        // Показываем сообщение
        showGameMessage("Cache cleared successfully", "success");
    } catch (error) {
        console.error("Error clearing cache:", error);
        showGameMessage("Error clearing cache: " + error.message, "warning");
    }
}

// Функция для оптимизации базы данных
function optimizeDatabase() {
    // Показываем сообщение
    showGameMessage("Optimizing database...", "info");
    
    // В реальном приложении здесь был бы код для оптимизации базы данных
    // Для демонстрации просто делаем паузу
    setTimeout(() => {
        showGameMessage("Database optimized successfully", "success");
    }, 1000);
}

// Вспомогательная функция для форматирования чисел
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    
    // Для партнерских предметов
    const isPartnerItem = document.getElementById('is-partner-item')?.value === 'true';
    const partnerName = document.getElementById('partner-name')?.value;
    const partnerLogo = document.getElementById('partner-logo')?.value;
    const partnerTwitter = document.getElementById('partner-twitter')?.value;
    const partnerDiscord = document.getElementById('partner-discord')?.value;
    
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
    
    // Добавляем информацию о партнере, если это партнерский предмет
    if (isPartnerItem && partnerName && partnerLogo) {
        item.partner = {
            name: partnerName,
            logo: partnerLogo
        };
        
        // Добавляем ссылки на соцсети, если они указаны
        if (partnerTwitter) {
            item.partner.twitter = partnerTwitter;
        }
        
        if (partnerDiscord) {
            item.partner.discord = partnerDiscord;
        }
    }
    
    // Сохраняем данные для предпросмотра
    adminState.preview.data = item;
    adminState.preview.visible = true;
    
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
    let previewHTML = '';
    
    if (isCard) {
        // Для карт показываем превью для всех мастей
        previewHTML = `
            <h4>${item.name}</h4>
            <p class="preview-price">${item.price} Silver</p>
            <p class="preview-rarity">Rarity: ${item.rarity}</p>
            <div class="preview-suits">
                <div class="preview-suit">
                    <img src="${item.image.replace('{suit}', 'hearts')}" 
                         alt="${item.name} Hearts" 
                         class="preview-image card-preview">
                    <span class="red-suit">♥ Hearts</span>
                </div>
                <div class="preview-suit">
                    <img src="${item.image.replace('{suit}', 'diamonds')}" 
                         alt="${item.name} Diamonds" 
                         class="preview-image card-preview">
                    <span class="red-suit">♦ Diamonds</span>
                </div>
                <div class="preview-suit">
                    <img src="${item.image.replace('{suit}', 'clubs')}" 
                         alt="${item.name} Clubs" 
                         class="preview-image card-preview">
                    <span class="black-suit">♣ Clubs</span>
                </div>
                <div class="preview-suit">
                    <img src="${item.image.replace('{suit}', 'spades')}" 
                         alt="${item.name} Spades" 
                         class="preview-image card-preview">
                    <span class="black-suit">♠ Spades</span>
                </div>
            </div>
        `;
        
        // Добавляем информацию об эффекте, если это специальная карта
        if (item.type === 'special-card' && item.effect) {
            previewHTML += `
                <div class="preview-effect">
                    <h5>Effect: ${getEffectDescription(item.effect, item.value)}</h5>
                </div>
            `;
        }
    } else {
        // Для кубиков показываем одно превью
        previewHTML = `
            <h4>${item.name}</h4>
            <p class="preview-price">${item.price} Silver</p>
            <p class="preview-rarity">Rarity: ${item.rarity}</p>
            <img src="${item.image}" alt="${item.name}" class="preview-image dice-preview">
        `;
        
        // Добавляем информацию об эффекте, если это специальный кубик
        if (item.type === 'special-dice' && item.effect) {
            previewHTML += `
                <div class="preview-effect">
                    <h5>Effect: ${getEffectDescription(item.effect, item.value)}</h5>
                </div>
            `;
        }
    }
    
    // Добавляем описание
    previewHTML += `
        <div class="preview-description">
            <p>${item.description}</p>
        </div>
    `;
    
    // Обновляем содержимое
    previewContainer.innerHTML = previewHTML;
    
    // Добавляем стили для предпросмотра
    addPreviewStyles();
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

// Функция добавления стилей для предпросмотра
function addPreviewStyles() {
    // Проверяем, есть ли уже стили
    if (document.getElementById('preview-styles')) return;
    
    // Создаем элемент стиля
    const styleElement = document.createElement('style');
    styleElement.id = 'preview-styles';
    styleElement.textContent = `
        .preview-content {
            padding: 10px;
        }
        
        .preview-content h4 {
            color: #b89d6e;
            margin-bottom: 5px;
        }
        
        .preview-price {
            color: #b89d6e;
            font-weight: bold;
            margin: 5px 0;
        }
        
        .preview-rarity {
            margin: 5px 0 15px;
            font-style: italic;
        }
        
        .preview-suits {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .preview-suit {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .preview-image {
            max-width: 100%;
            border: 1px solid #4a3a2a;
            border-radius: 5px;
            margin-bottom: 5px;
        }
        
        .card-preview {
            height: 120px;
            width: 90px;
            object-fit: cover;
        }
        
        .dice-preview {
            height: 100px;
            width: 100px;
            object-fit: contain;
        }
        
        .red-suit {
            color: #cc3333 !important;
        }
        
        .black-suit {
            color: #d4c2a7 !important;
        }
        
        .preview-effect {
            margin: 10px 0;
            background-color: #3a3a3a;
            padding: 10px;
            border-radius: 5px;
        }
        
        .preview-effect h5 {
            color: #b89d6e;
            margin: 0;
        }
        
        .preview-description {
            margin-top: 15px;
            border-top: 1px solid #4a3a2a;
            padding-top: 10px;
        }
        
        .preview-description p {
            text-align: left;
            font-size: 14px;
            line-height: 1.4;
        }
    `;
    
    // Добавляем стили в head
    document.head.appendChild(styleElement);
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
        adminState.preview.visible = false;
        adminState.preview.data = null;
        
        // Очищаем предпросмотр
        const previewContainer = document.querySelector('.preview-content');
        if (previewContainer) {
            previewContainer.innerHTML = '<p>Item preview will appear here</p>';
        }
        
        // Обновляем магазин
        ContentManager.updateShopFromDatabase().then(() => {
            // Показываем сообщение об успехе
            showGameMessage(`Item "${item.name}" added successfully!`, "success");
            
            // Обновляем статистику контента
            refreshContentStats();
            
            // Добавляем предмет в список недавно добавленных
            addToRecentItems(newItem);
        });
    }).catch(error => {
        console.error("Error adding item:", error);
        showGameMessage("Failed to add item: " + error.message, "warning");
    });
}

// Функция для добавления предмета в список недавно добавленных
function addToRecentItems(item) {
    // Получаем контейнер
    const recentItemsContainer = document.getElementById('recent-items');
    if (!recentItemsContainer) return;
    
    // Создаем элемент
    const itemElement = document.createElement('div');
    itemElement.className = 'recent-item';
    itemElement.setAttribute('data-id', item.id);
    
    // Определяем тип изображения
    const isCard = item.type === 'card-skin' || item.type === 'special-card';
    const imagePath = isCard ? item.image.replace('{suit}', 'spades') : item.image;
    
    // Создаем содержимое
    itemElement.innerHTML = `
        <img src="${imagePath}" alt="${item.name}">
        <div class="recent-item-name">${item.name}</div>
    `;
    
    // Добавляем обработчик для предпросмотра
    itemElement.addEventListener('click', () => {
        // Здесь можно добавить код для предпросмотра предмета
    });
    
    // Добавляем в начало списка
    if (recentItemsContainer.firstChild) {
        recentItemsContainer.insertBefore(itemElement, recentItemsContainer.firstChild);
    } else {
        recentItemsContainer.appendChild(itemElement);
    }
    
    // Ограничиваем количество элементов
    const recentItems = recentItemsContainer.querySelectorAll('.recent-item');
    if (recentItems.length > 8) {
        recentItemsContainer.removeChild(recentItems[recentItems.length - 1]);
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
        path = `assets/dice/skins/${fileName}`;
    } else {
        path = `assets/dice/special/${fileName}`;
    }
    
    // Обновляем поле ввода
    imagePathInput.value = path;
    
    // Обновляем предпросмотр
    previewItem();
}

// Функция для экспорта контента
function exportContent() {
    // Получаем данные контента
    Promise.all([
        ContentManager.getAllCards(),
        ContentManager.getAllDice()
    ]).then(([cards, dice]) => {
        // Создаем объект с данными
        const exportData = {
            cards,
            dice,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Преобразуем в JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Создаем Blob
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lands-of-nanti-content-${new Date().toISOString().slice(0, 10)}.json`;
        
        // Добавляем в документ и симулируем клик
        document.body.appendChild(link);
        link.click();
        
        // Удаляем ссылку
        document.body.removeChild(link);
        
        // Показываем сообщение
        showGameMessage("Content exported successfully", "success");
    }).catch(error => {
        console.error("Error exporting content:", error);
        showGameMessage("Error exporting content: " + error.message, "warning");
    });
}

// Функция для импорта контента
function importContent(file) {
    // Проверяем файл
    if (!file) {
        showGameMessage("No file selected", "warning");
        return;
    }
    
    // Читаем файл
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Парсим JSON
            const data = JSON.parse(e.target.result);
            
            // Проверяем валидность
            if (!data.cards || !data.dice) {
                showGameMessage("Invalid content file format", "warning");
                return;
            }
            
            // Показываем диалог подтверждения
            if (confirm("This will replace your current content. Are you sure?")) {
                // Импортируем данные
                ContentManager.importData(data).then(() => {
                    // Обновляем магазин
                    ContentManager.updateShopFromDatabase().then(() => {
                        // Обновляем статистику контента
                        refreshContentStats();
                        
                        // Показываем сообщение
                        showGameMessage("Content imported successfully", "success");
                    });
                }).catch(error => {
                    console.error("Error importing content:", error);
                    showGameMessage("Error importing content: " + error.message, "warning");
                });
            }
        } catch (error) {
            console.error("Error parsing content file:", error);
            showGameMessage("Error parsing content file: " + error.message, "warning");
        }
    };
    
    reader.onerror = function(e) {
        console.error("Error reading content file:", e);
        showGameMessage("Error reading content file", "warning");
    };
    
    reader.readAsText(file);
}

// Функция для скачивания шаблона
function downloadTemplate(type) {
    // Создаем шаблон
    let template;
    let filename;
    
    if (type === 'card') {
        template = {
            cards: [
                {
                    id: "example_card_skin_1",
                    type: "card-skin",
                    name: "Example Card Skin",
                    price: 300,
                    rarity: "Common",
                    description: "This is an example card skin template.",
                    image: "assets/cards/skins/example_{suit}.png"
                },
                {
                    id: "example_special_card_1",
                    type: "special-card",
                    name: "Example Special Card",
                    price: 600,
                    rarity: "Rare",
                    description: "This is an example special card template.",
                    effect: "pointsMultiplier",
                    value: 1.5,
                    image: "assets/cards/special/example_{suit}.png"
                }
            ]
        };
        filename = "card_template.json";
    } else {
        template = {
            dice: [
                {
                    id: "example_dice_skin_1",
                    type: "dice-skin",
                    name: "Example Dice Skin",
                    price: 200,
                    rarity: "Common",
                    description: "This is an example dice skin template.",
                    image: "assets/dice/skins/example.png"
                },
                {
                    id: "example_special_dice_1",
                    type: "special-dice",
                    name: "Example Special Dice",
                    price: 500,
                    rarity: "Rare",
                    description: "This is an example special dice template.",
                    effect: "weightedLow",
                    weights: [30, 22.5, 17.5, 15, 10, 5],
                    image: "assets/dice/special/example.png"
                }
            ]
        };
        filename = "dice_template.json";
    }
    
    // Преобразуем в JSON
    const jsonData = JSON.stringify(template, null, 2);
    
    // Создаем Blob
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // Добавляем в документ и симулируем клик
    document.body.appendChild(link);
    link.click();
    
    // Удаляем ссылку
    document.body.removeChild(link);
}

// Функция для пакетной загрузки предметов
function uploadBatch(file) {
    // Проверяем файл
    if (!file) {
        showGameMessage("No file selected", "warning");
        return;
    }
    
    // Читаем файл
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Парсим JSON
            const data = JSON.parse(e.target.result);
            
            // Проверяем наличие карт или кубиков
            const hasCards = data.cards && Array.isArray(data.cards) && data.cards.length > 0;
            const hasDice = data.dice && Array.isArray(data.dice) && data.dice.length > 0;
            
            if (!hasCards && !hasDice) {
                showGameMessage("No valid items found in the file", "warning");
                return;
            }
            
            // Показываем информацию
            const message = `Found ${hasCards ? data.cards.length : 0} cards and ${hasDice ? data.dice.length : 0} dice. Add them to the database?`;
            
            if (confirm(message)) {
                // Добавляем карты
                if (hasCards) {
                    data.cards.forEach(card => {
                        ContentManager.addCard(card).catch(error => {
                            console.error("Error adding card:", error);
                        });
                    });
                }
                
                // Добавляем кубики
                if (hasDice) {
                    data.dice.forEach(die => {
                        ContentManager.addDie(die).catch(error => {
                            console.error("Error adding die:", error);
                        });
                    });
                }
                
                // Обновляем магазин
                ContentManager.updateShopFromDatabase().then(() => {
                    // Обновляем статистику контента
                    refreshContentStats();
                    
                    // Показываем сообщение
                    showGameMessage("Batch upload completed successfully", "success");
                });
            }
        } catch (error) {
            console.error("Error parsing batch file:", error);
            showGameMessage("Error parsing batch file: " + error.message, "warning");
        }
    };
    
    reader.onerror = function(e) {
        console.error("Error reading batch file:", e);
        showGameMessage("Error reading batch file", "warning");
    };
    
    reader.readAsText(file);
}


// Функция для настройки системы предпросмотра
function setupPreviewSystem() {
    // Здесь мы настраиваем обработчики для предпросмотра предметов
    // в админ-панели перед их добавлением
}

// Функция для настройки вкладок
function setupContentTabs() {
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
            
            document.querySelectorAll('.tab-content').forEach(content => {
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
    }
}

// Функция для настройки функций экспорта и импорта
function setupExportImportFunctions() {
    // Экспорт контента
    const exportBtn = document.getElementById('export-content-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            ContentManager.exportAllData().then(() => {
                showGameMessage("Content exported successfully", "success");
            }).catch(error => {
                showGameMessage("Error exporting content: " + error.message, "warning");
            });
        });
    }
    
    // Импорт контента
    const importBtn = document.getElementById('import-content-btn');
    const importFile = document.getElementById('import-file');
    
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                
                // Показываем модальное окно подтверждения
                showConfirmationModal(
                    "Import Content",
                    "This will replace all your custom content. Are you sure you want to continue?",
                    "Import",
                    "Cancel",
                    () => {
                        ContentManager.importData(content).then(result => {
                            showGameMessage(`Content imported successfully: ${result.importedCards} cards, ${result.importedDice} dice`, "success");
                            refreshContentStats();
                        }).catch(error => {
                            showGameMessage("Error importing content: " + error.message, "warning");
                        });
                    }
                );
            };
            reader.readAsText(file);
            
            // Сбрасываем значение input, чтобы можно было загрузить тот же файл повторно
            importFile.value = '';
        });
    }
    
    // Обновление статистики контента
    const refreshContentBtn = document.getElementById('refresh-content-btn');
    if (refreshContentBtn) {
        refreshContentBtn.addEventListener('click', refreshContentStats);
    }
    
    // Загрузка шаблонов
    const downloadCardTemplateBtn = document.getElementById('download-card-template-btn');
    if (downloadCardTemplateBtn) {
        downloadCardTemplateBtn.addEventListener('click', () => {
            downloadTemplate('cards');
        });
    }
    
    const downloadDiceTemplateBtn = document.getElementById('download-dice-template-btn');
    if (downloadDiceTemplateBtn) {
        downloadDiceTemplateBtn.addEventListener('click', () => {
            downloadTemplate('dice');
        });
    }
    
    // Кнопка очистки базы данных
    const clearDatabaseBtn = document.getElementById('clear-database-btn');
    if (clearDatabaseBtn) {
        clearDatabaseBtn.addEventListener('click', () => {
            showConfirmationModal(
                "Clear Database",
                "This will delete all custom content. This action cannot be undone! Are you sure?",
                "Clear",
                "Cancel",
                () => {
                    ContentManager._clearDatabase().then(() => {
                        showGameMessage("Database cleared successfully", "success");
                        refreshContentStats();
                    }).catch(error => {
                        showGameMessage("Error clearing database: " + error.message, "warning");
                    });
                }
            );
        });
    }
    
    // Кнопка сброса магазина к значениям по умолчанию
    const resetShopBtn = document.getElementById('reset-shop-btn');
    if (resetShopBtn) {
        resetShopBtn.addEventListener('click', () => {
            showConfirmationModal(
                "Reset Shop",
                "This will reset the shop to default items. Are you sure?",
                "Reset",
                "Cancel",
                () => {
                    // Получаем стандартные данные магазина
                    const defaultShopData = getShopData(true);
                    
                    // Сохраняем их
                    saveShopData(defaultShopData);
                    
                    showGameMessage("Shop reset to default", "success");
                    
                    // Перезагружаем магазин, если он открыт
                    if (document.getElementById('shop-container').style.display === 'block') {
                        loadShopItems();
                    }
                }
            );
        });
    }
    
    // Кнопка тестового режима
    const testGameBtn = document.getElementById('test-game-btn');
    if (testGameBtn) {
        testGameBtn.addEventListener('click', () => {
            // Устанавливаем тестовый режим
            localStorage.setItem('testMode', 'true');
            
            showGameMessage("Test mode enabled. Refreshing page...", "success");
            
            // Перезагружаем страницу через 2 секунды
            setTimeout(() => {
                location.reload();
            }, 2000);
        });
    }
    
    // Инициализируем статистику контента
    refreshContentStats();
}

// Функция для обновления статистики контента
function refreshContentStats() {
    // Получаем данные контента
    Promise.all([
        ContentManager.getAllCards(),
        ContentManager.getAllDice()
    ]).then(([cards, dice]) => {
        // Подсчитываем количество элементов каждого типа
        const cardSkins = cards.filter(card => card.type === 'card-skin').length;
        const specialCards = cards.filter(card => card.type === 'special-card').length;
        const diceSkins = dice.filter(die => die.type === 'dice-skin').length;
        const specialDice = dice.filter(die => die.type === 'special-dice').length;
        
        // Обновляем элементы интерфейса
        document.getElementById('card-skin-count').textContent = cardSkins;
        document.getElementById('special-card-count').textContent = specialCards;
        document.getElementById('dice-skin-count').textContent = diceSkins;
        document.getElementById('special-dice-count').textContent = specialDice;
        
        // Показываем сообщение
        showGameMessage("Content statistics refreshed", "info");
    }).catch(error => {
        console.error("Error refreshing content stats:", error);
        showGameMessage("Error refreshing content stats: " + error.message, "warning");
    });
}

// Функция для скачивания шаблона
function downloadTemplate(type) {
    let template;
    let filename;
    
    if (type === 'cards') {
        template = {
            cards: [
                {
                    id: "example_card_skin_1",
                    type: "card-skin",
                    name: "Example Card Skin",
                    price: 300,
                    rarity: "Common",
                    description: "This is an example card skin template.",
                    image: "assets/cards/skins/example_{suit}.png"
                },
                {
                    id: "example_special_card_1",
                    type: "special-card",
                    name: "Example Special Card",
                    price: 600,
                    rarity: "Rare",
                    description: "This is an example special card template.",
                    effect: "pointsMultiplier",
                    value: 1.5,
                    image: "assets/cards/special/example_{suit}.png"
                }
            ]
        };
        filename = "card_template.json";
    } else {
        template = {
            dice: [
                {
                    id: "example_dice_skin_1",
                    type: "dice-skin",
                    name: "Example Dice Skin",
                    price: 200,
                    rarity: "Common",
                    description: "This is an example dice skin template.",
                    image: "assets/dice/skins/example.png"
                },
                {
                    id: "example_special_dice_1",
                    type: "special-dice",
                    name: "Example Special Dice",
                    price: 500,
                    rarity: "Rare",
                    description: "This is an example special dice template.",
                    effect: "weightedLow",
                    weights: [30, 22.5, 17.5, 15, 10, 5],
                    image: "assets/dice/special/example.png"
                }
            ]
        };
        filename = "dice_template.json";
    }
    
    // Преобразуем в JSON-строку
    const jsonStr = JSON.stringify(template, null, 2);
    
    // Создаем объект Blob для скачивания
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // Освобождаем URL
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

// Функция для показа модального окна подтверждения
function showConfirmationModal(title, message, confirmText, cancelText, onConfirm) {
    // Проверяем, существует ли уже модальное окно
    let modal = document.getElementById('admin-confirmation-modal');
    
    if (!modal) {
        // Создаем модальное окно
        modal = document.createElement('div');
        modal.id = 'admin-confirmation-modal';
        modal.className = 'admin-modal';
        
        // Добавляем содержимое
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3 id="modal-title"></h3>
                    <button class="admin-modal-close">&times;</button>
                </div>
                <div class="admin-modal-body">
                    <p id="modal-message"></p>
                </div>
                <div class="admin-modal-footer">
                    <button id="modal-cancel" class="action-btn"></button>
                    <button id="modal-confirm" class="danger-btn"></button>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно в документ
        document.body.appendChild(modal);
    }
    
    // Обновляем содержимое
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-confirm').textContent = confirmText;
    document.getElementById('modal-cancel').textContent = cancelText;
    
    // Добавляем обработчики событий
    const closeButton = modal.querySelector('.admin-modal-close');
    const cancelButton = document.getElementById('modal-cancel');
    const confirmButton = document.getElementById('modal-confirm');
    
    // Функция для закрытия модального окна
    const closeModal = () => {
        modal.style.display = 'none';
    };
    
    // Удаляем предыдущие обработчики
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    
    // Добавляем новые обработчики
    newCloseButton.addEventListener('click', closeModal);
    newCancelButton.addEventListener('click', closeModal);
    
    newConfirmButton.addEventListener('click', () => {
        closeModal();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// Функция для настройки выбора типа товара
function setupItemTypeSelect() {
    const itemTypeSelect = document.getElementById('item-type');
    const effectField = document.getElementById('item-effect');
    
    if (!itemTypeSelect || !effectField) return;
    
    // Обработчик изменения типа товара
    itemTypeSelect.addEventListener('change', () => {
        const selectedType = itemTypeSelect.value;
        
        // Показываем/скрываем поле эффекта в зависимости от типа
        if (selectedType === 'special-card' || selectedType === 'special-dice') {
            effectField.parentElement.style.display = 'block';
            
            // Добавляем варианты эффектов
            const effectOptions = getEffectOptionsForType(selectedType);
            if (effectOptions) {
                effectField.innerHTML = '';
                
                effectOptions.forEach(option => {
                    const optElement = document.createElement('option');
                    optElement.value = option.value;
                    optElement.textContent = option.text;
                    effectField.appendChild(optElement);
                });
            }
        } else {
            effectField.parentElement.style.display = 'none';
        }
    });
    
    // Инициируем событие изменения для установки начального состояния
    itemTypeSelect.dispatchEvent(new Event('change'));
}

// Функция для настройки статистики в админ-панели
function setupAdminStats() {
    // Добавляем обработчики событий
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', refreshGameStats);
    }
    
    const resetPlayerBtn = document.getElementById('reset-player-btn');
    if (resetPlayerBtn) {
        resetPlayerBtn.addEventListener('click', resetPlayerData);
    }
    
    const unlockAllLevelsBtn = document.getElementById('unlock-all-levels-btn');
    if (unlockAllLevelsBtn) {
        unlockAllLevelsBtn.addEventListener('click', unlockAllLevels);
    }
    
    const giveSilverBtn = document.getElementById('give-silver-btn');
    if (giveSilverBtn) {
        giveSilverBtn.addEventListener('click', giveSilverToPlayer);
    }
    
    // Обновляем статистику
    refreshGameStats();
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
        
        // Обновляем информацию о текущем игроке
        updateCurrentPlayerInfo();
        
        // Показываем сообщение
        showGameMessage("Statistics refreshed successfully", "success");
    } catch (error) {
        console.error("Error refreshing game stats:", error);
        showGameMessage("Error refreshing game stats: " + error.message, "warning");
    }
}

// Функция для обновления информации о текущем игроке
async function updateCurrentPlayerInfo() {
    try {
        // Получаем информацию о текущем игроке
        const playerInfo = await gameDB.getCurrentPlayerStats(playerData.wallet);
        
        if (!playerInfo) {
            console.log("No player info found");
            return;
        }
        
        // Получаем контейнер
        const playerInfoContainer = document.getElementById('current-player-info');
        if (!playerInfoContainer) return;
        
        // Создаем HTML
        playerInfoContainer.innerHTML = `
            <div class="player-info-item">
                <span class="player-info-label">Name:</span>
                <span class="player-info-value">${playerInfo.name}</span>
            </div>
            <div class="player-info-item">
                <span class="player-info-label">Silver:</span>
                <span class="player-info-value">${playerInfo.silver}</span>
            </div>
            <div class="player-info-item">
                <span class="player-info-label">Completed Levels:</span>
                <span class="player-info-value">${playerInfo.completedLevels.length}</span>
            </div>
            <div class="player-info-item">
                <span class="player-info-label">Last Login:</span>
                <span class="player-info-value">${new Date(playerInfo.lastLogin).toLocaleString()}</span>
            </div>
            <div class="player-info-item">
                <span class="player-info-label">Items:</span>
                <span class="player-info-value">${(playerInfo.inventory.cards.length || 0) + (playerInfo.inventory.dice.length || 0)}</span>
            </div>
        `;
        
        // Добавляем стили
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .player-info-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #4a3a2a;
            }
            
            .player-info-label {
                font-weight: bold;
                color: #b89d6e;
            }
            
            .player-info-value {
                color: #d4c2a7;
            }
        `;
        
        document.head.appendChild(styleElement);
    } catch (error) {
        console.error("Error updating player info:", error);
    }
}



// Функция для сброса данных игрока
function resetPlayerData() {
    // Запрашиваем подтверждение
    if (!confirm("Are you sure you want to reset all player data? This action cannot be undone.")) {
        return;
    }
    
    // Сохраняем только адрес кошелька
    const wallet = playerData.wallet;
    
    // Сбрасываем данные игрока
    Object.assign(playerData, {
        name: '',
        wallet: wallet,
        silver: 0,
        completedLevels: [],
        inventory: {
            cards: [],
            dice: []
        },
        selectedCards: ['default'],
        selectedDice: ['default']
    });
    
    // Сохраняем данные
    savePlayerData();
    
    // Очищаем статистику уровней
    gameSettings.levels.forEach(level => {
        localStorage.removeItem(`levelStats_${level.id}`);
    });
    
    // Сбрасываем флаги туториала и лора
    localStorage.removeItem('tutorialCompleted');
    localStorage.removeItem('loreViewed');
    
    // Обновляем информацию о игроке в базе данных
    gameDB.registerPlayer(playerData.wallet, playerData.name, playerData).then(() => {
        // Обновляем статистику
        refreshGameStats();
    });
    
    // Показываем сообщение
    showGameMessage("Player data has been reset", "success");
}

// Функция для разблокировки всех уровней
function unlockAllLevels() {
    // Запрашиваем подтверждение
    if (!confirm("Are you sure you want to unlock all levels for the current player?")) {
        return;
    }
    
    // Добавляем все уровни, кроме последнего, в список пройденных
    playerData.completedLevels = Array.from({ length: 9 }, (_, i) => i + 1);
    
    // Сохраняем данные
    savePlayerData();
    
    // Обновляем список уровней, если открыт
    updateLevelsList();
    
    // Обновляем информацию о игроке в базе данных
    gameDB.registerPlayer(playerData.wallet, playerData.name, playerData).then(() => {
        // Обновляем статистику
        refreshGameStats();
    });
    
    // Показываем сообщение
    showGameMessage("All levels have been unlocked", "success");
}

// Функция для выдачи серебра игроку
function giveSilverToPlayer() {
    // Добавляем серебро
    playerData.silver += 1000;
    
    // Сохраняем данные
    savePlayerData();
    
    // Обновляем отображение в интерфейсе
    updateUserInfo();
    
    // Обновляем информацию о игроке в базе данных
    gameDB.registerPlayer(playerData.wallet, playerData.name, playerData).then(() => {
        // Обновляем статистику
        refreshGameStats();
    });
    
    // Показываем сообщение
    showGameMessage("1000 silver has been added to the player", "success");
}

// Функция для добавления нового товара
function addNewItem(e) {
    if (e) e.preventDefault();
    
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
        adminState.preview.visible = false;
        adminState.preview.data = null;
        
        // Очищаем предпросмотр
        const previewContainer = document.querySelector('.preview-content');
        if (previewContainer) {
            previewContainer.innerHTML = '<p>Item preview will appear here</p>';
        }
        
        // Обновляем магазин
        ContentManager.updateShopFromDatabase().then(() => {
            // Показываем сообщение об успехе
            showGameMessage(`Item "${item.name}" added successfully!`, "success");
            
            // Обновляем статистику контента
            refreshContentStats();
            
            // Добавляем предмет в список недавно добавленных
            addToRecentItems(newItem);
        });
    }).catch(error => {
        console.error("Error adding item:", error);
        showGameMessage("Failed to add item: " + error.message, "warning");
    });
}

// Функция для загрузки логотипа партнера
function uploadPartnerLogo(file) {
    // В реальном приложении здесь был бы код для загрузки файла на сервер
    // В этой демонстрации мы просто обновляем путь к изображению
    
    const partnerLogoInput = document.getElementById('partner-logo');
    
    if (!partnerLogoInput) return;
    
    const fileName = file.name;
    
    // Генерируем относительный путь
    const path = `assets/partners/${fileName}`;
    
    // Обновляем поле ввода
    partnerLogoInput.value = path;
}

// Функция получения опций эффектов в зависимости от типа (обновленная)
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
    
    return null;
}