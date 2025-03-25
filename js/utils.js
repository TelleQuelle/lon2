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

// Функция для создания эффекта "шторки" для элемента
function curtainEffect(element, direction = 'right', duration = 500) {
    if (!element) return;
    
    // Создаем обертку
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';
    
    // Перемещаем элемент внутрь обертки
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    
    // Создаем шторку
    const curtain = document.createElement('div');
    curtain.style.position = 'absolute';
    curtain.style.top = '0';
    curtain.style.height = '100%';
    curtain.style.width = '100%';
    curtain.style.backgroundColor = '#4a3a2a';
    curtain.style.zIndex = '1';
    
    // Устанавливаем начальную позицию шторки
    if (direction === 'right') {
        curtain.style.left = '-100%';
    } else {
        curtain.style.left = '100%';
    }
    
    // Добавляем шторку в обертку
    wrapper.appendChild(curtain);
    
    // Запускаем анимацию
    setTimeout(() => {
        curtain.style.transition = `left ${duration}ms ease-in-out`;
        curtain.style.left = '0%';
        
        // Убираем шторку после окончания анимации
        setTimeout(() => {
            curtain.style.transition = `left ${duration}ms ease-in-out`;
            
            if (direction === 'right') {
                curtain.style.left = '100%';
            } else {
                curtain.style.left = '-100%';
            }
            
            // Удаляем шторку после анимации
            setTimeout(() => {
                // Перемещаем элемент обратно в родительский контейнер
                wrapper.parentNode.insertBefore(element, wrapper);
                wrapper.remove();
            }, duration + 100);
        }, duration + 100);
    }, 100);
}

// Функция для создания эффекта мерцания
function blinkEffect(element, count = 3, duration = 300) {
    if (!element) return;
    
    let counter = 0;
    
    const intervalId = setInterval(() => {
        element.style.opacity = element.style.opacity === '0' ? '1' : '0';
        counter++;
        
        if (counter >= count * 2) {
            clearInterval(intervalId);
            element.style.opacity = '1';
        }
    }, duration / 2);
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

// Функция для создания пульсирующего текста
function createPulsingText(element, text, duration = 2000) {
    if (!element) return;
    
    // Очищаем содержимое
    element.innerHTML = '';
    
    // Создаем обертку
    const wrapper = document.createElement('div');
    wrapper.className = 'pulsing-text-wrapper';
    wrapper.style.display = 'inline-block';
    
    // Добавляем каждый символ с анимацией
    for (let i = 0; i < text.length; i++) {
        const charElement = document.createElement('span');
        charElement.textContent = text[i];
        charElement.style.display = 'inline-block';
        charElement.style.animation = `pulse ${duration / 1000}s ease-in-out infinite`;
        charElement.style.animationDelay = `${i * (duration / text.length) / 1000}s`;
        
        wrapper.appendChild(charElement);
    }
    
    // Добавляем в элемент
    element.appendChild(wrapper);
}

// Функция для создания эффекта печатающегося текста
function typeWriter(element, text, speed = 50) {
    if (!element) return;
    
    // Очищаем содержимое
    element.textContent = '';
    
    return new Promise(resolve => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                resolve();
            }
        }, speed);
    });
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
    curtainEffect,
    blinkEffect,
    pulseEffect,
    generateUID,
    isLocalStorageAvailable,
    getURLParameter,
    getDeviceType,
    createPulsingText,
    typeWriter
};