/**
 * Wallet.js - Модуль для работы с кошельком Solana
 * 
 * Этот файл отвечает за подключение и взаимодействие с кошельком Phantom.
 */

// Проверка наличия установленного расширения Phantom
function isPhantomInstalled() {
    const provider = window?.solana;
    
    if (!provider?.isPhantom) {
        console.log("Phantom wallet not found");
        return false;
    }
    
    console.log("Phantom wallet found");
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
        // Пытаемся подключиться к кошельку
        const resp = await window.solana.connect();
        console.log("Wallet connected:", resp.publicKey.toString());
        
        // Сохраняем адрес кошелька
        playerData.wallet = resp.publicKey.toString();
        savePlayerData();
        
        // Переходим к следующему шагу (ввод имени)
        showScreen('profile-container');
        document.querySelector('#wallet-address span').textContent = formatWalletAddress(playerData.wallet);
        
        showGameMessage("Wallet connected successfully!", "success");
    } catch (err) {
        console.error("Error connecting to wallet:", err);
        showGameMessage("Failed to connect wallet. Please try again.", "warning");
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
        showGameMessage("Wallet not connected", "warning");
        return false;
    }
    
    try {
        // В реальном приложении здесь был бы код для взаимодействия с контрактом Solana
        // и создания NFT. Это упрощенная версия для демонстрации.
        
        console.log("Minting NFT Scroll for wallet:", playerData.wallet);
        
        // Симуляция задержки на операцию блокчейна
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showGameMessage("Freedom Scroll NFT successfully minted to your wallet!", "success");
        return true;
    } catch (err) {
        console.error("Error minting NFT:", err);
        showGameMessage("Failed to mint NFT. Please try again later.", "warning");
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