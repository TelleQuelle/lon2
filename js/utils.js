/**
 * Utils.js - Вспомогательные функции
 * 
 * Этот файл содержит набор утилитарных функций, используемых
 * в различных частях приложения.
 */

// Функция для создания анимации появления элемента
function animateElement(element, animationClass, duration = 500) {
    if (!element) return;
    
    element.classList.add(animationClass);
    
    setTimeout(() => {
        element.classList.remove(animationClass);
    }, duration);
}

// Функция для плавного перехода между элементами
function fadeTransition(hideElement, showElement, duration = 300) {
    if (!hideElement || !showElement) return;
    
    // Скрываем первый элемент
    hideElement.classList.add('fade-out');
    
    setTimeout(() => {
        hideElement.style.display = 'none';
        hideElement.classList.remove('fade-out');
        
        // Показываем второй элемент
        showElement.style.display = 'block';
        showElement.classList.add('fade-in');
        
        setTimeout(() => {
            showElement.classList.remove('fade-in');
        }, duration);
    }, duration);
}

// Функция для форматирования числа с разделителями
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Функция для получения случайного числа в диапазоне
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Функция для получения случайного элемента из массива
function getRandomArrayElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Функция для перемешивания массива (алгоритм Фишера-Йетса)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Функция для проверки, находится ли элемент в области видимости
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Функция для задержки выполнения (промис)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Функция для создания анимации падения (например, для монет)
function createFallingAnimation(container, imgSrc, count = 10, duration = 2000) {
    for (let i = 0; i < count; i++) {
        // Создаем элемент
        const element = document.createElement('img');
        element.src = imgSrc;
        element.className = 'falling-item';
        element.style.position = 'absolute';
        element.style.width = '30px';
        element.style.height = '30px';
        element.style.opacity = '0';
        element.style.zIndex = '1000';
        
        // Случайная позиция по горизонтали
        const startX = Math.random() * 100;
        element.style.left = `${startX}%`;
        element.style.top = '-50px';
        
        // Случайная задержка
        const delay = Math.random() * 1000;
        
        // Добавляем в контейнер
        container.appendChild(element);
        
        // Запускаем анимацию
        setTimeout(() => {
            element.style.transition = `top ${duration}ms ease-in, left ${duration}ms ease-out, opacity 0.5s`;
            element.style.opacity = '1';
            
            // Случайное смещение по горизонтали
            const endX = startX + (Math.random() * 40 - 20);
            element.style.left = `${endX}%`;
            
            // Падение вниз
            element.style.top = `${container.offsetHeight + 50}px`;
            
            // Удаляем элемент после анимации
            setTimeout(() => {
                element.remove();
            }, duration + 100);
        }, delay);
    }
}

// Функция для создания эффекта пульсации
function pulseEffect(element, scale = 1.2, duration = 1000) {
    if (!element) return;
    
    element.style.transition = `transform ${duration / 2}ms ease-in-out`;
    
    // Увеличиваем
    element.style.transform = `scale(${scale})`;
    
    // Возвращаем к нормальному размеру
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, duration / 2);
}

// Функция для генерации уникального ID
function generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Функция для проверки поддержки локального хранилища
function isLocalStorageAvailable() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

// Функция для получения параметра из URL
function getURLParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Функция для определения типа устройства
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

// Экспортируем все функции
window.utils = {
    animateElement,
    fadeTransition,
    formatNumber,
    getRandomInt,
    getRandomArrayElement,
    shuffleArray,
    isInViewport,
    delay,
    createFallingAnimation,
    pulseEffect,
    generateUID,
    isLocalStorageAvailable,
    getURLParameter,
    getDeviceType,
};

function handleImageError(img, fallbackSrc) {
    img.onerror = function() {
        // Если указан резервный источник, используем его
        if (fallbackSrc) {
            img.src = fallbackSrc;
        } else {
            // Иначе создаем canvas с заполнителем
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 100;
            canvas.height = img.height || 100;
            
            // Получаем контекст для рисования
            const ctx = canvas.getContext('2d');
            
            // Заполняем фон
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Рисуем границу
            ctx.strokeStyle = '#b89d6e';
            ctx.lineWidth = 2;
            ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Добавляем текст "Image Not Found"
            ctx.fillStyle = '#d4c2a7';
            ctx.font = '12px MedievalSharp, Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Image', canvas.width / 2, canvas.height / 2 - 8);
            ctx.fillText('Not Found', canvas.width / 2, canvas.height / 2 + 8);
            
            // Применяем canvas как источник изображения
            img.src = canvas.toDataURL('image/png');
        }
    };
    
    return img;
}

// Функция для создания и проверки существования директорий
function ensureDirectoriesExist(directories) {
    // В веб-среде это будет просто выводить информацию
    console.log('Checking required directories:');
    
    directories.forEach(dir => {
        // Здесь только логируем, т.к. в браузере не можем создавать директории
        console.log(`- ${dir}`);
    });
    
    return true;
}

// Функция для создания базового изображения, если его нет
function createBasicImage(width, height, text, color = '#4a3a2a') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Заполняем фон
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Рисуем границу
    ctx.strokeStyle = '#b89d6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    
    // Добавляем текст
    ctx.fillStyle = '#d4c2a7';
    ctx.font = '16px MedievalSharp, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    return canvas.toDataURL('image/png');
}

// Добавляем новые функции в глобальный объект utils
Object.assign(window.utils, {
    handleImageError,
    ensureDirectoriesExist,
    createBasicImage
});