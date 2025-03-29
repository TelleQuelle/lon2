/**
 * Wallet.js - Модуль для работы с кошельком Solana
 * 
 * Этот файл отвечает за подключение и взаимодействие с кошельком Phantom.
 */

// Проверка наличия установленного расширения Phantom
function isPhantomInstalled() {
    // Проверка наличия и доступности объекта window.solana
    if (typeof window === 'undefined' || !window.solana) {
        console.log("Phantom wallet not detected on this page");
        return false;
    }
    
    // Проверка, является ли wallet Phantom
    if (!window.solana.isPhantom) {
        console.log("Detected wallet is not Phantom");
        return false;
    }
    
    console.log("Phantom wallet detected");
    return true;
}

// Перенаправление на сайт для установки кошелька Phantom
function redirectToPhantomInstall() {
    window.open('https://phantom.app/', '_blank');
}

// Функция подключения кошелька
async function connectWallet() {
    // Проверяем, установлен ли Phantom
    if (!isPhantomInstalled()) {
        // Показываем сообщение о необходимости установки
        showGameMessage("Phantom wallet not detected. Redirecting to installation page...", "warning");
        setTimeout(() => {
            redirectToPhantomInstall();
        }, 2000);
        return;
    }
    
    try {
        // Проверяем доступность метода connect
        if (!window.solana.connect || typeof window.solana.connect !== 'function') {
            throw new Error("Connect method is not available");
        }
        
        // Пытаемся подключиться к кошельку
        const resp = await window.solana.connect();
        
        // Проверяем успешность подключения и наличие публичного ключа
        if (!resp || !resp.publicKey) {
            throw new Error("Failed to retrieve wallet public key");
        }
        
        console.log("Wallet connected:", resp.publicKey.toString());
        
        // Сохраняем адрес кошелька
        playerData.wallet = resp.publicKey.toString();
        savePlayerData();
        
        // Переходим к следующему шагу (ввод имени)
        showScreen('profile-container');
        
        // Обновляем отображение адреса кошелька
        const walletAddressElement = document.querySelector('#wallet-address span');
        if (walletAddressElement) {
            walletAddressElement.textContent = formatWalletAddress(playerData.wallet);
        }
        
        showGameMessage("Wallet connected successfully!", "success");
    } catch (err) {
        console.error("Error connecting to wallet:", err);
        showGameMessage("Failed to connect wallet: " + (err.message || "Unknown error"), "warning");
    }
}

// Функция отключения кошелька
async function disconnectWallet() {
    try {
        await window.solana.disconnect();
        console.log("Wallet disconnected");
        
        // Сбрасываем данные игрока
        playerData.wallet = '';
        savePlayerData();
        
        // Возвращаемся к экрану подключения кошелька
        showScreen('wallet-container');
        
        showGameMessage("Wallet disconnected", "info");
    } catch (err) {
        console.error("Error disconnecting wallet:", err);
        showGameMessage("Failed to disconnect wallet", "warning");
    }
}

// Функция для минтинга NFT при завершении кампании
async function mintNFTScroll() {
    // Проверяем, подключен ли кошелек
    if (!playerData.wallet) {
        showGameMessage("Wallet not connected. Please connect your wallet first.", "warning");
        return false;
    }
    
    // Проверяем наличие Phantom
    if (!isPhantomInstalled()) {
        showGameMessage("Phantom wallet required for NFT minting", "warning");
        return false;
    }
    
    try {
        // Показываем сообщение о начале минтинга
        showGameMessage("Preparing to mint your NFT Scroll...", "info");
        
        console.log("Minting NFT Scroll for wallet:", playerData.wallet);
        
        // В реальном приложении здесь бы шла интеграция с Solana
        // Симуляция минтинга с задержкой
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // В реальном приложении здесь бы была проверка успешности транзакции
        // Симулируем успешный минтинг
        
        // Добавляем отметку о наличии NFT в данных игрока
        playerData.hasNft = true;
        savePlayerData();
        
        showGameMessage("Freedom Scroll NFT successfully minted to your wallet!", "success");
        return true;
    } catch (err) {
        console.error("Error minting NFT:", err);
        showGameMessage("Failed to mint NFT: " + (err.message || "Unknown error"), "warning");
        return false;
    }
}

// Инициализация кошелька (проверка при загрузке страницы)
function initWallet() {
    // Если в браузере нет объекта solana, добавляем слушатель событий
    if (!window.solana && window.addEventListener) {
        window.addEventListener('load', () => {
            // Еще раз проверяем после полной загрузки
            if (!isPhantomInstalled()) {
                console.log("Phantom wallet still not detected after page load");
            }
        });
    } else {
        // Если есть, сразу проверяем
        isPhantomInstalled();
    }
}

// Вызываем инициализацию после загрузки модуля
initWallet();