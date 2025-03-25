/**
 * Tutorial.js - Модуль для управления обучающим туториалом
 * 
 * Этот файл содержит функции для проведения туториала и
 * введение игрока в игровую механику.
 */

// Запуск туториала
function startTutorial() {
    // Показываем контейнер туториала
    showScreen('tutorial-container');
    
    // Отображаем первый шаг
    showTutorialStep(1);
}

// Отображение конкретного шага туториала
function showTutorialStep(stepNumber) {
    // Скрываем все шаги
    const allSteps = document.querySelectorAll('.tutorial-step');
    allSteps.forEach(step => {
        step.style.display = 'none';
    });
    
    // Показываем запрошенный шаг
    const currentStep = document.getElementById(`tutorial-step-${stepNumber}`);
    if (currentStep) {
        currentStep.style.display = 'block';
        
        // Добавляем анимацию появления
        currentStep.classList.add('fade-in');
        setTimeout(() => {
            currentStep.classList.remove('fade-in');
        }, 500);
    } else {
        console.error(`Tutorial step ${stepNumber} not found`);
    }
}

// Переход к следующему шагу туториала
function nextTutorialStep(currentStep) {
    const nextStep = currentStep + 1;
    
    // Проверяем, существует ли следующий шаг
    const nextStepElement = document.getElementById(`tutorial-step-${nextStep}`);
    
    if (nextStepElement) {
        // Добавляем анимацию исчезновения
        const currentStepElement = document.getElementById(`tutorial-step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('fade-out');
            
            setTimeout(() => {
                currentStepElement.classList.remove('fade-out');
                showTutorialStep(nextStep);
            }, 300);
        } else {
            showTutorialStep(nextStep);
        }
    } else {
        console.error(`Next tutorial step ${nextStep} not found`);
    }
}

// Возвращение к предыдущему шагу туториала
function prevTutorialStep(currentStep) {
    const prevStep = currentStep - 1;
    
    // Проверяем, существует ли предыдущий шаг
    const prevStepElement = document.getElementById(`tutorial-step-${prevStep}`);
    
    if (prevStepElement) {
        // Добавляем анимацию исчезновения
        const currentStepElement = document.getElementById(`tutorial-step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('fade-out');
            
            setTimeout(() => {
                currentStepElement.classList.remove('fade-out');
                showTutorialStep(prevStep);
            }, 300);
        } else {
            showTutorialStep(prevStep);
        }
    } else {
        console.error(`Previous tutorial step ${prevStep} not found`);
    }
}

// Завершение туториала и переход к лору
function completeTutorial() {
    // Отмечаем, что туториал пройден
    localStorage.setItem('tutorialCompleted', 'true');
    
    // Переходим к показу вступительного лора
    startLore();
}

// Функция для перезапуска туториала
function restartTutorial() {
    startTutorial();
}

// Запуск показа лора
function startLore() {
    // Показываем контейнер лора
    showScreen('lore-container');
    
    // Отображаем первый шаг лора
    showLoreStep(1);
}

// Отображение конкретного шага лора
function showLoreStep(stepNumber) {
    // Скрываем все шаги
    const allSteps = document.querySelectorAll('.lore-step');
    allSteps.forEach(step => {
        step.style.display = 'none';
    });
    
    // Показываем запрошенный шаг
    const currentStep = document.getElementById(`lore-step-${stepNumber}`);
    if (currentStep) {
        currentStep.style.display = 'block';
        
        // Добавляем анимацию появления
        currentStep.classList.add('fade-in');
        setTimeout(() => {
            currentStep.classList.remove('fade-in');
        }, 500);
    } else {
        console.error(`Lore step ${stepNumber} not found`);
    }
}

// Переход к следующему шагу лора
function nextLoreStep(currentStep) {
    const nextStep = currentStep + 1;
    
    // Проверяем, существует ли следующий шаг
    const nextStepElement = document.getElementById(`lore-step-${nextStep}`);
    
    if (nextStepElement) {
        // Добавляем анимацию исчезновения
        const currentStepElement = document.getElementById(`lore-step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('fade-out');
            
            setTimeout(() => {
                currentStepElement.classList.remove('fade-out');
                showLoreStep(nextStep);
            }, 300);
        } else {
            showLoreStep(nextStep);
        }
    } else {
        console.error(`Next lore step ${nextStep} not found`);
    }
}

// Возвращение к предыдущему шагу лора
function prevLoreStep(currentStep) {
    const prevStep = currentStep - 1;
    
    // Проверяем, существует ли предыдущий шаг
    const prevStepElement = document.getElementById(`lore-step-${prevStep}`);
    
    if (prevStepElement) {
        // Добавляем анимацию исчезновения
        const currentStepElement = document.getElementById(`lore-step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('fade-out');
            
            setTimeout(() => {
                currentStepElement.classList.remove('fade-out');
                showLoreStep(prevStep);
            }, 300);
        } else {
            showLoreStep(prevStep);
        }
    } else {
        console.error(`Previous lore step ${prevStep} not found`);
    }
}

// Завершение лора и переход к главному меню
function completeLore() {
    // Отмечаем, что лор просмотрен
    localStorage.setItem('loreViewed', 'true');
    
    // Переходим к главному меню
    showMainMenu();
}