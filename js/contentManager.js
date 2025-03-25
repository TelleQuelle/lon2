/**
 * contentManager.js - Система управления контентом игры
 * 
 * Этот файл содержит функции для работы с локальной базой данных (IndexedDB),
 * что позволяет добавлять новый контент без редактирования кода.
 */

// Объект для работы с базой данных
const ContentManager = {
    // Имя базы данных
    dbName: 'LandsOfNantiDB',
    // Версия базы данных
    dbVersion: 1,
    // Ссылка на базу данных
    db: null,
    
    // Инициализация базы данных
    init: function() {
        return new Promise((resolve, reject) => {
            // Проверяем поддержку IndexedDB
            if (!window.indexedDB) {
                console.log("Your browser doesn't support IndexedDB. Falling back to localStorage.");
                this.useLocalStorage = true;
                resolve();
                return;
            }
            
            // Открываем или создаем базу данных
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            // Обработка ошибки
            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                this.useLocalStorage = true;
                resolve();
            };
            
            // Обработка успешного открытия
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB connected successfully");
                this.useLocalStorage = false;
                resolve();
            };
            
            // Создание или обновление структуры базы данных
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилища объектов (таблицы)
                
                // Хранилище для карт
                if (!db.objectStoreNames.contains('cards')) {
                    const cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
                    cardsStore.createIndex('by_type', 'type', { unique: false });
                    cardsStore.createIndex('by_rarity', 'rarity', { unique: false });
                }
                
                // Хранилище для кубиков
                if (!db.objectStoreNames.contains('dice')) {
                    const diceStore = db.createObjectStore('dice', { keyPath: 'id' });
                    diceStore.createIndex('by_type', 'type', { unique: false });
                    diceStore.createIndex('by_rarity', 'rarity', { unique: false });
                }
                
                // Хранилище для уровней
                if (!db.objectStoreNames.contains('levels')) {
                    db.createObjectStore('levels', { keyPath: 'id' });
                }
                
                // Хранилище для настроек
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                console.log("Database structure created/updated");
            };
        });
    },
    
    // Добавление новой карты
    addCard: function(card) {
        return new Promise((resolve, reject) => {
            if (this.useLocalStorage) {
                this._addItemWithLocalStorage('cards', card, resolve, reject);
                return;
            }
            
            const transaction = this.db.transaction(['cards'], 'readwrite');
            const store = transaction.objectStore('cards');
            
            // Добавляем уникальный ID, если его нет
            if (!card.id) {
                card.id = 'card_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            
            // Добавляем дату создания
            card.createdAt = new Date().toISOString();
            
            const request = store.add(card);
            
            request.onsuccess = () => {
                console.log("Card added to database", card);
                resolve(card);
            };
            
            request.onerror = (event) => {
                console.error("Error adding card:", event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Добавление нового кубика
    addDie: function(die) {
        return new Promise((resolve, reject) => {
            if (this.useLocalStorage) {
                this._addItemWithLocalStorage('dice', die, resolve, reject);
                return;
            }
            
            const transaction = this.db.transaction(['dice'], 'readwrite');
            const store = transaction.objectStore('dice');
            
            // Добавляем уникальный ID, если его нет
            if (!die.id) {
                die.id = 'die_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            
            // Добавляем дату создания
            die.createdAt = new Date().toISOString();
            
            const request = store.add(die);
            
            request.onsuccess = () => {
                console.log("Die added to database", die);
                resolve(die);
            };
            
            request.onerror = (event) => {
                console.error("Error adding die:", event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Получение всех карт
    getAllCards: function() {
        return new Promise((resolve, reject) => {
            if (this.useLocalStorage) {
                this._getAllItemsWithLocalStorage('cards', resolve, reject);
                return;
            }
            
            const transaction = this.db.transaction(['cards'], 'readonly');
            const store = transaction.objectStore('cards');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error("Error getting cards:", event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Получение всех кубиков
    getAllDice: function() {
        return new Promise((resolve, reject) => {
            if (this.useLocalStorage) {
                this._getAllItemsWithLocalStorage('dice', resolve, reject);
                return;
            }
            
            const transaction = this.db.transaction(['dice'], 'readonly');
            const store = transaction.objectStore('dice');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error("Error getting dice:", event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Обновление магазина из базы данных
    updateShopFromDatabase: function() {
        return new Promise(async (resolve, reject) => {
            try {
                // Получаем все карты и кубики из базы данных
                const cards = await this.getAllCards();
                const dice = await this.getAllDice();
                
                // Получаем текущие данные магазина
                const shopData = getShopData();
                
                // Обрабатываем карты
                cards.forEach(card => {
                    if (card.type === 'card-skin') {
                        shopData.cardSkins[card.id] = {
                            name: card.name,
                            price: card.price,
                            rarity: card.rarity,
                            description: card.description,
                            image: card.image
                        };
                    } else if (card.type === 'special-card') {
                        shopData.specialCards[card.id] = {
                            name: card.name,
                            price: card.price,
                            rarity: card.rarity,
                            description: card.description,
                            effect: card.effect,
                            value: card.value,
                            image: card.image
                        };
                    }
                });
                
                // Обрабатываем кубики
                dice.forEach(die => {
                    if (die.type === 'dice-skin') {
                        shopData.diceSkins[die.id] = {
                            name: die.name,
                            price: die.price,
                            rarity: die.rarity,
                            description: die.description,
                            image: die.image
                        };
                    } else if (die.type === 'special-dice') {
                        shopData.specialDice[die.id] = {
                            name: die.name,
                            price: die.price,
                            rarity: die.rarity,
                            description: die.description,
                            effect: die.effect,
                            weights: die.weights,
                            value: die.value,
                            image: die.image
                        };
                    }
                });
                
                // Сохраняем обновленные данные магазина
                saveShopData(shopData);
                
                resolve(shopData);
            } catch (error) {
                console.error("Error updating shop from database:", error);
                reject(error);
            }
        });
    },
    
    // Экспорт всех данных базы
    exportAllData: function() {
        return new Promise(async (resolve, reject) => {
            try {
                // Получаем все данные из базы
                const cards = await this.getAllCards();
                const dice = await this.getAllDice();
                
                // Получаем настройки
                const settings = await this._getSettings();
                
                // Собираем данные в один объект
                const exportData = {
                    cards,
                    dice,
                    settings,
                    exportDate: new Date().toISOString(),
                    version: '1.0'
                };
                
                // Преобразуем в JSON-строку
                const jsonStr = JSON.stringify(exportData, null, 2);
                
                // Создаем объект Blob для скачивания
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                // Создаем ссылку для скачивания
                const a = document.createElement('a');
                a.href = url;
                a.download = `lands-of-nanti-data-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                
                // Освобождаем URL
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);
                
                resolve(exportData);
            } catch (error) {
                console.error("Error exporting data:", error);
                reject(error);
            }
        });
    },
    
    // Импорт данных в базу
    importData: function(jsonData) {
        return new Promise(async (resolve, reject) => {
            try {
                let data;
                
                // Проверяем, является ли jsonData строкой или объектом
                if (typeof jsonData === 'string') {
                    data = JSON.parse(jsonData);
                } else {
                    data = jsonData;
                }
                
                // Проверяем версию данных
                if (!data.version) {
                    throw new Error('Invalid data format: missing version');
                }
                
                // Очищаем текущие данные
                await this._clearDatabase();
                
                // Импортируем карты
                if (data.cards && Array.isArray(data.cards)) {
                    for (const card of data.cards) {
                        await this.addCard(card);
                    }
                }
                
                // Импортируем кубики
                if (data.dice && Array.isArray(data.dice)) {
                    for (const die of data.dice) {
                        await this.addDie(die);
                    }
                }
                
                // Импортируем настройки
                if (data.settings) {
                    await this._saveSettings(data.settings);
                }
                
                // Обновляем магазин
                await this.updateShopFromDatabase();
                
                resolve({
                    success: true,
                    message: "Data imported successfully",
                    importedCards: data.cards?.length || 0,
                    importedDice: data.dice?.length || 0
                });
            } catch (error) {
                console.error("Error importing data:", error);
                reject(error);
            }
        });
    },
    
    // Очистка базы данных
    _clearDatabase: function() {
        return new Promise(async (resolve, reject) => {
            if (this.useLocalStorage) {
                localStorage.removeItem('db_cards');
                localStorage.removeItem('db_dice');
                localStorage.removeItem('db_settings');
                resolve();
                return;
            }
            
            try {
                const transaction = this.db.transaction(['cards', 'dice', 'settings'], 'readwrite');
                
                // Очищаем хранилище карт
                const clearCards = new Promise((resolve) => {
                    const cardsStore = transaction.objectStore('cards');
                    const request = cardsStore.clear();
                    request.onsuccess = () => resolve();
                });
                
                // Очищаем хранилище кубиков
                const clearDice = new Promise((resolve) => {
                    const diceStore = transaction.objectStore('dice');
                    const request = diceStore.clear();
                    request.onsuccess = () => resolve();
                });
                
                // Очищаем хранилище настроек
                const clearSettings = new Promise((resolve) => {
                    const settingsStore = transaction.objectStore('settings');
                    const request = settingsStore.clear();
                    request.onsuccess = () => resolve();
                });
                
                // Ждем завершения всех операций
                await Promise.all([clearCards, clearDice, clearSettings]);
                
                resolve();
            } catch (error) {
                console.error("Error clearing database:", error);
                reject(error);
            }
        });
    },
    
    // Получение настроек
    _getSettings: function() {
        return new Promise((resolve, reject) => {
            if (this.useLocalStorage) {
                const settings = localStorage.getItem('db_settings');
                resolve(settings ? JSON.parse(settings) : {});
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();
            
            request.onsuccess = () => {
                // Преобразуем массив объектов в один объект
                const settings = {};
                (request.result || []).forEach(item => {
                    settings[item.key] = item.value;
                });
                
                resolve(settings);
            };
            
            request.onerror = (event) => {
                console.error("Error getting settings:", event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Сохранение настроек
    _saveSettings: function(settings) {
        return new Promise((resolve, reject) => {
            if (this.useLocalStorage) {
                localStorage.setItem('db_settings', JSON.stringify(settings));
                resolve();
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            // Очищаем текущие настройки
            store.clear();
            
            // Добавляем новые настройки
            let remaining = Object.keys(settings).length;
            
            for (const key in settings) {
                const request = store.add({
                    key: key,
                    value: settings[key]
                });
                
                request.onsuccess = () => {
                    remaining--;
                    if (remaining === 0) resolve();
                };
                
                request.onerror = (event) => {
                    console.error("Error saving setting:", key, event.target.error);
                    reject(event.target.error);
                };
            }
            
            // Если нет настроек для сохранения
            if (remaining === 0) resolve();
        });
    },
    
    // Дополнительные методы для работы с localStorage (резервный вариант)
    _addItemWithLocalStorage: function(storeName, item, resolve, reject) {
        try {
            // Получаем текущие элементы
            const items = this._getLocalStorageItems(storeName);
            
            // Добавляем уникальный ID, если его нет
            if (!item.id) {
                item.id = storeName.slice(0, -1) + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            
            // Добавляем дату создания
            item.createdAt = new Date().toISOString();
            
            // Добавляем новый элемент
            items.push(item);
            
            // Сохраняем обновленный массив
            localStorage.setItem(`db_${storeName}`, JSON.stringify(items));
            
            resolve(item);
        } catch (error) {
            console.error(`Error adding item to ${storeName} with localStorage:`, error);
            reject(error);
        }
    },
    
    _getAllItemsWithLocalStorage: function(storeName, resolve, reject) {
        try {
            const items = this._getLocalStorageItems(storeName);
            resolve(items);
        } catch (error) {
            console.error(`Error getting items from ${storeName} with localStorage:`, error);
            reject(error);
        }
    },
    
    _getLocalStorageItems: function(storeName) {
        const data = localStorage.getItem(`db_${storeName}`);
        return data ? JSON.parse(data) : [];
    }
};

// Инициализируем системму управления контентом при загрузке
document.addEventListener('DOMContentLoaded', () => {
    ContentManager.init().then(() => {
        console.log("Content Manager initialized");
        
        // Обновляем магазин из базы данных
        ContentManager.updateShopFromDatabase().then(() => {
            console.log("Shop updated from database");
        }).catch(error => {
            console.error("Error updating shop:", error);
        });
    }).catch(error => {
        console.error("Error initializing Content Manager:", error);
    });
});