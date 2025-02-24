window.Telegram.WebApp.ready();

function switchToCategory(category) {
    switchTab('category');
    document.getElementById('category-title').textContent = category;
    const performersList = document.getElementById('performers-list');
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    performersList.innerHTML = '<div class="spinner"></div>';

    setTimeout(() => {
        performersList.innerHTML = `
            <div class="flex space-x-2 mb-4">
                <button onclick="filterPerformers('subscribed')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Только Premium</button>
                <button onclick="filterPerformers('all')" class="py-2 px-4 bg-gray-600 text-gray-200 rounded-lg">Все</button>
            </div>
            <div id="performer-list" class="space-y-4">
                ${companies.filter(c => c.category === category).map((company, index) => `
                    <div class="card cursor-pointer p-4 flex justify-between items-center hover:bg-gray-700 transition ${company.premium ? 'subscribed' : ''}">
                        <div>
                            <p class="font-semibold">${company.name} ${company.premium ? '<i class="ti ti-crown text-yellow-500 text-sm ml-1"></i>' : ''}</p>
                            <p class="text-sm text-gray-400">${company.description}</p>
                            <p class="text-sm text-gray-400">Рейтинг: ${company.rating || 'Нет оценок'}</p>
                        </div>
                        <button onclick="selectPerformer('${company.id}')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Выбрать</button>
                    </div>
                `).join('') || '<p class="text-center">Исполнителей в этой категории пока нет</p>'}
            </div>
        `;
        let delay = 0;
        document.querySelectorAll('#performer-list > div').forEach(card => {
            card.style.animationDelay = `${delay}s`;
            card.classList.add('slide-in');
            delay += 0.1;
        });
    }, 1000);
}

function filterPerformers(type) {
    const performers = document.querySelectorAll('#performer-list > div');
    performers.forEach(p => {
        if (type === 'subscribed') {
            p.classList.toggle('hidden', !p.classList.contains('subscribed'));
        } else {
            p.classList.remove('hidden');
        }
    });
}

function selectPerformer(companyId) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const selectedTaskIndex = tasks.findIndex(task => task.status === 'Открыто' && task.creatorId === Telegram.WebApp.initDataUnsafe.user.id);
    if (selectedTaskIndex !== -1) {
        tasks[selectedTaskIndex].status = 'В работе';
        tasks[selectedTaskIndex].performerId = companyId;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        showNotification(`Исполнитель с ID ${companyId} назначен на задачу!`);
        updateTaskList();
        switchTab('tasks');
    } else {
        showNotification('Нет открытых задач для назначения исполнителя!');
    }
}

function createTask() {
    const role = localStorage.getItem('role');
    if (!role) {
        showNotification('Пожалуйста, зарегистрируйтесь!');
        switchTab('register');
        return;
    }
    if (role !== 'client') {
        showNotification('Только заказчики могут создавать задания!');
        return;
    }
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-input').value = '';
    document.querySelectorAll('input[name="tags"]').forEach(tag => tag.checked = false);
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-teal-500 text-white p-3 rounded-lg shadow-lg notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function submitTask() {
    const task = document.getElementById('task-input').value;
    const category = document.getElementById('task-category').value;
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(tag => tag.value);
    if (task && category) {
        showNotification(`Задание "${task}" создано в категории "${category}"!`);
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const newTask = { 
            text: task, 
            category: category, 
            responses: 0, 
            views: 0, 
            tags: tags, 
            creatorId: Telegram.WebApp.initDataUnsafe.user.id, 
            status: 'Открыто', 
            performerId: null 
        };
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        const taskCount = document.getElementById('task-count');
        taskCount.textContent = tasks.length;
        updateTaskList();
        updateStats();
        closeModal();
    } else {
        showNotification('Заполните все поля!');
    }
}

function updateTaskList() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskList = document.getElementById('task-list');
    const myTasksList = document.getElementById('my-tasks-list');
    const performerTasks = document.getElementById('performer-tasks');
    const role = localStorage.getItem('role');
    const userId = Telegram.WebApp.initDataUnsafe.user ? Telegram.WebApp.initDataUnsafe.user.id : null;

    taskList.innerHTML = '<div class="spinner"></div>';
    performerTasks.innerHTML = '<div class="spinner"></div>';
    myTasksList.innerHTML = '<div class="spinner"></div>';

    setTimeout(() => {
        // Список всех задач (для заказчиков и исполнителей)
        taskList.innerHTML = tasks.length ? tasks.map((task, index) => {
            task.views = task.views ? task.views + 1 : 1;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            const statusClass = task.status === 'Открыто' ? 'status-open' : task.status === 'В работе' ? 'status-in-progress' : 'status-completed';
            return `
                <div class="card p-4 flex justify-between items-center">
                    <div>
                        <p>${task.text}</p>
                        <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                        <p class="text-sm text-gray-400"><span class="status-dot ${statusClass}"></span> Статус: ${task.status}</p>
                        <div>${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
                    </div>
                    ${role === 'client' && task.status === 'Открыто' ? `<button onclick="switchToCategory('${task.category}')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Выбрать исполнителя</button>` : ''}
                    ${role === 'client' && task.status === 'В работе' ? `<button onclick="completeTask(${index})" class="py-2 px-4 bg-green-500 text-white rounded-lg">Завершить</button>` : ''}
                    ${role === 'client' && task.status === 'Завершено' && !task.rating ? `<button onclick="openRatingModal(${index})" class="py-2 px-4 bg-yellow-500 text-white rounded-lg">Оценить</button>` : ''}
                    ${role === 'performer' && task.status === 'Открыто' ? `<button onclick="respondToTask(${index})" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Откликнуться</button>` : ''}
                </div>
            `;
        }).join('') : '<p class="text-center">Заданий пока нет</p>';

        // Мои задачи (для заказчиков)
        myTasksList.innerHTML = tasks.length ? tasks.filter(task => task.creatorId === userId).map((task, index) => {
            const statusClass = task.status === 'Открыто' ? 'status-open' : task.status === 'В работе' ? 'status-in-progress' : 'status-completed';
            const company = JSON.parse(localStorage.getItem('companies') || '[]').find(c => c.id === task.performerId);
            return `
                <div class="card p-4 flex justify-between items-center">
                    <div>
                        <p>${task.text}</p>
                        <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                        <p class="text-sm text-gray-400"><span class="status-dot ${statusClass}"></span> Статус: ${task.status}</p>
                        ${task.performerId ? `<p class="text-sm text-gray-400">Исполнитель: ${company ? company.name : 'Неизвестен'}</p>` : ''}
                        <div>${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
                    </div>
                    ${task.status === 'Открыто' ? `<button onclick="deleteTask(${index})" class="py-2 px-4 bg-red-500 text-white rounded-lg">Удалить</button>` : ''}
                    ${task.status === 'В работе' && task.performerId ? `<button onclick="chatWithPerformer('${task.performerId}')" class="py-2 px-4 bg-blue-500 text-white rounded-lg">Чат</button>` : ''}
                </div>
            `;
        }).join('') : '<p class="text-center">Ваши задачи отсутствуют</p>';

        // Доступные задачи (для исполнителей)
        performerTasks.innerHTML = tasks.length ? tasks.filter(task => task.status === 'Открыто').map((task, index) => {
            const statusClass = 'status-open';
            return `
                <div class="card p-4 flex justify-between items-center">
                    <div>
                        <p>${task.text}</p>
                        <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                        <p class="text-sm text-gray-400"><span class="status-dot ${statusClass}"></span> Статус: ${task.status}</p>
                        <div>${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
                    </div>
                    <button onclick="respondToTask(${index})" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Откликнуться</button>
                </div>
            `;
        }).join('') : '<p class="text-center">Доступных задач нет</p>';

        updateStats();
    }, 1000);
}

function respondToTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks[index];
    task.responses += 1;
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Вы откликнулись на задание: "${task.text}"`);
    updateTaskList();
    updateStats();
}

function deleteTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    document.getElementById('task-count').textContent = tasks.length;
    updateTaskList();
    updateStats();
}

function completeTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks[index].status = 'Завершено';
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Задание "${tasks[index].text}" завершено!`);
    updateTaskList();
    updateStats();
}

function openRatingModal(index) {
    window.currentTaskIndex = index;
    document.getElementById('rating-modal').classList.remove('hidden');
}

function ratePerformer(rating) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks[window.currentTaskIndex];
    task.rating = rating;
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    const company = companies.find(c => c.id === task.performerId);
    if (company) {
        company.rating = company.rating ? Math.round((company.rating + rating) / 2) : rating;
        localStorage.setItem('companies', JSON.stringify(companies));
    }
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Исполнитель оценён на ${rating} звёзд!`);
    closeRatingModal();
    updateTaskList();
}

function closeRatingModal() {
    document.getElementById('rating-modal').classList.add('hidden');
}

function chatWithPerformer(performerId) {
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    const company = companies.find(c => c.id === performerId);
    if (company) {
        const telegramLink = `https://t.me/${company.email.split('@')[1]}`;
        window.Telegram.WebApp.openTelegramLink(telegramLink);
    } else {
        showNotification('Контакт исполнителя не найден!');
    }
}

function updateStats() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    const role = localStorage.getItem('role');
    const userId = Telegram.WebApp.initDataUnsafe.user ? Telegram.WebApp.initDataUnsafe.user.id : null;
    const taskStats = document.getElementById('task-stats');
    const myTasksStats = document.getElementById('my-tasks-stats');

    const totalResponses = tasks.reduce((sum, task) => sum + task.responses, 0);
    const totalViews = tasks.reduce((sum, task) => sum + task.views, 0);
    document.getElementById('performer-count').textContent = companies.length;

    if (role === 'client') {
        taskStats.innerHTML = `Всего задач: ${tasks.length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
        myTasksStats.innerHTML = `Ваши задачи: ${tasks.filter(t => t.creatorId === userId).length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
    } else if (role === 'performer') {
        taskStats.innerHTML = `Доступно задач: ${tasks.length} | Всего просмотров: ${totalViews} | Всего откликов: ${totalResponses}`;
        myTasksStats.innerHTML = `Ваши отклики: ${totalResponses}`;
    }
}

function registerUser() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const role = document.getElementById('reg-role').value;
    const userId = Telegram.WebApp.initDataUnsafe.user ? Telegram.WebApp.initDataUnsafe.user.id : null;

    if (!userId) {
        showNotification('Ошибка: Telegram ID не найден!');
        return;
    }

    if (name && email && role) {
        const userData = { id: userId, name, email, role };
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('role', role);

        if (role === 'performer') {
            const category = document.getElementById('reg-category').value;
            const description = document.getElementById('reg-description').value;
            if (category && description) {
                const companies = JSON.parse(localStorage.getItem('companies') || '[]');
                companies.push({ id: userId, name, description, category, premium: false, rating: null });
                localStorage.setItem('companies', JSON.stringify(companies));
                showNotification(`Исполнитель "${name}" зарегистрирован в категории "${category}"!`);
            } else {
                showNotification('Заполните все поля для исполнителя!');
                return;
            }
        } else {
            showNotification(`Заказчик "${name}" зарегистрирован!`);
        }

        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-description').value = '';
        switchTab(getMainTab());
        updateUI();
    } else {
        showNotification('Заполните все поля!');
    }
}

function getMainTab() {
    return localStorage.getItem('role') === 'performer' ? 'performer-main' : 'client-main';
}

function updateUI() {
    const role = localStorage.getItem('role');
    const clientMain = document.getElementById('client-main');
    const performerMain = document.getElementById('performer-main');
    if (role === 'performer') {
        clientMain.classList.add('hidden');
        performerMain.classList.remove('hidden');
        document.getElementById('performer-fields').classList.remove('hidden');
    } else if (role === 'client') {
        clientMain.classList.remove('hidden');
        performerMain.classList.add('hidden');
        document.getElementById('performer-fields').classList.add('hidden');
    } else {
        clientMain.classList.add('hidden');
        performerMain.classList.add('hidden');
    }
    updateTaskList();
    updateStats();
}

document.getElementById('search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const buttons = document.querySelectorAll('#categories button');
    buttons.forEach(button => {
        const text = button.textContent.toLowerCase();
        button.classList.toggle('hidden', !text.includes(searchTerm));
    });
});

document.getElementById('reg-role').addEventListener('change', (e) => {
    const role = e.target.value;
    document.getElementById('performer-fields').classList.toggle('hidden', role !== 'performer');
});

document.getElementById('logo').addEventListener('click', () => switchTab(getMainTab()));
document.getElementById('subscription-btn').addEventListener('click', () => switchTab('subscription'));

window.addEventListener('load', () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    document.getElementById('task-count').textContent = tasks.length;
    updateUI();

    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user && !localStorage.getItem('user')) {
        switchTab('register');
    } else {
        switchTab(getMainTab());
    }

    if (!localStorage.getItem('onboarding')) {
        startOnboarding();
    }
});

const tabs = {
    'client-main': document.getElementById('tab-main'),
    'performer-main': document.getElementById('tab-main'),
    register: document.getElementById('tab-profile'),
    subscription: document.getElementById('tab-subscription'),
    tasks: document.getElementById('tab-tasks'),
    about: document.getElementById('tab-about'),
    category: document.getElementById('category-content')
};
const contents = {
    'client-main': document.getElementById('client-main'),
    'performer-main': document.getElementById('performer-main'),
    register: document.getElementById('register-content'),
    subscription: document.getElementById('subscription-content'),
    tasks: document.getElementById('tasks-content'),
    about: document.getElementById('about-content'),
    category: document.getElementById('category-content')
};

function switchTab(activeTab) {
    Object.values(tabs).forEach(tab => {
        if (tab) tab.classList.remove('active');
    });
    Object.values(contents).forEach(content => content.classList.add('hidden'));
    if (tabs[activeTab]) tabs[activeTab].classList.add('active');
    contents[activeTab].classList.remove('hidden');
    contents[activeTab].style.opacity = '0';
    setTimeout(() => contents[activeTab].style.opacity = '1', 50);
}

function showMyTasks() {
    document.getElementById('tasks-modal').classList.remove('hidden');
    updateTaskList();
}

function closeTasksModal() {
    document.getElementById('tasks-modal').classList.add('hidden');
}

function startOnboarding() {
    const onboarding = document.getElementById('onboarding-modal');
    onboarding.classList.remove('hidden');
    const steps = [
        { title: 'Добро пожаловать!', text: 'Это ваше первое знакомство с платформой.' },
        { title: 'Регистрация', text: 'Зарегистрируйтесь как заказчик или исполнитель.' },
        { title: 'Создание заданий', text: 'Заказчики могут создавать задачи для поиска исполнителей.' },
        { title: 'Отклики', text: 'Исполнители могут откликаться на задачи или быть выбранными из списка.' }
    ];
    let step = 0;

    function updateStep() {
        document.getElementById('onboarding-title').textContent = steps[step].title;
        document.getElementById('onboarding-text').textContent = steps[step].text;
    }

    window.nextOnboarding = function() {
        step++;
        if (step >= steps.length) {
            onboarding.classList.add('hidden');
            localStorage.setItem('onboarding', 'done');
        } else {
            updateStep();
        }
    };

    window.prevOnboarding = function() {
        step--;
        if (step < 0) step = 0;
        updateStep();
    };

    updateStep();
}
