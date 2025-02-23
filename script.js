window.Telegram.WebApp.ready();

function switchToCategory(category) {
    switchTab('category');
    document.getElementById('category-title').textContent = category;
    const performersList = document.getElementById('performers-list');
    performersList.innerHTML = '<div class="animate-spin w-8 h-8 border-4 border-t-teal-500 border-gray-300 rounded-full mx-auto"></div>';

    setTimeout(() => {
        performersList.innerHTML = `
            <div class="flex space-x-2 mb-4">
                <button onclick="filterPerformers('subscribed')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Только Premium</button>
                <button onclick="filterPerformers('all')" class="py-2 px-4 bg-gray-600 text-gray-200 rounded-lg">Все</button>
            </div>
            <div id="performer-list" class="space-y-4">
                <div onclick="showPerformerDetails('Иван', 'Дизайнер, опыт 5 лет', 'ivan@example.com', 4)" class="card cursor-pointer p-4 flex items-center hover:bg-gray-700 transition subscribed">
                    <img src="https://via.placeholder.com/40" class="w-10 h-10 rounded-full mr-3" alt="Avatar">
                    <div class="flex-1">
                        <p class="font-semibold">Иван <i class="ti ti-crown text-yellow-500 text-sm ml-1"></i></p>
                        <p class="text-sm text-gray-400">Дизайнер, опыт 5 лет</p>
                    </div>
                    <div class="text-yellow-500 text-sm">★★★★☆</div>
                </div>
                <div onclick="showPerformerDetails('Петр', 'Начинающий дизайнер', 'petr@example.com', 3)" class="card cursor-pointer p-4 flex items-center hover:bg-gray-700 transition">
                    <img src="https://via.placeholder.com/40" class="w-10 h-10 rounded-full mr-3" alt="Avatar">
                    <div class="flex-1">
                        <p class="font-semibold">Петр</p>
                        <p class="text-sm text-gray-400">Начинающий дизайнер</p>
                    </div>
                    <div class="text-yellow-500 text-sm">★★★☆☆</div>
                </div>
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

function showPerformerDetails(name, description, contact, rating) {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="modal bg-gray-800 p-6 rounded-2xl shadow-lg w-11/12 max-w-md text-gray-200">
            <h3 class="text-xl font-semibold mb-4">${name}</h3>
            <p class="mb-2">${description}</p>
            <p class="text-sm text-yellow-500 mb-2">${stars}</p>
            <p class="text-sm text-gray-400">Контакт: ${contact}</p>
            <div class="flex space-x-2 mt-4">
                <button onclick="window.Telegram.WebApp.openTelegramLink('https://t.me/${contact.split('@')[1]}')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Написать в Telegram</button>
                <button onclick="navigator.clipboard.writeText('${contact}'); showNotification('Скопировано!')" class="py-2 px-4 bg-gray-600 text-gray-200 rounded-lg">Скопировать</button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="mt-4 py-2 px-4 bg-gray-600 text-gray-200 rounded-lg">Закрыть</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function createTask() {
    const role = localStorage.getItem('role') || 'client';
    if (role === 'performer') {
        showNotification('Исполнители не могут создавать задания!');
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
        const newTask = { text: task, category: category, responses: 0, views: 0, tags: tags };
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
    const role = localStorage.getItem('role') || 'client';

    taskList.innerHTML = tasks.length ? tasks.map((task, index) => {
        task.views = task.views ? task.views + 1 : 1;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        return `
            <div class="card p-4 flex justify-between items-center">
                <div>
                    <p>${task.text}</p>
                    <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                    <div>${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
                </div>
                ${role === 'performer' ? `<button onclick="respondToTask(${index})" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Откликнуться</button>` : ''}
            </div>
        `;
    }).join('') : '<p class="text-center">Заданий пока нет</p>';

    myTasksList.innerHTML = tasks.length ? tasks.map((task, index) => `
        <div class="card p-4 flex justify-between items-center">
            <div>
                <p>${task.text}</p>
                <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                <div>${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>
            ${role === 'client' ? `<button onclick="deleteTask(${index})" class="py-2 px-4 bg-red-500 text-white rounded-lg">Удалить</button>` : ''}
        </div>
    `).join('') : '<p class="text-center">Заданий пока нет</p>';

    updateStats();
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

function updateStats() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const role = localStorage.getItem('role') || 'client';
    const taskStats = document.getElementById('task-stats');
    const myTasksStats = document.getElementById('my-tasks-stats');
    const profileStats = document.getElementById('profile-stats');

    const totalResponses = tasks.reduce((sum, task) => sum + task.responses, 0);
    const totalViews = tasks.reduce((sum, task) => sum + task.views, 0);

    if (role === 'client') {
        taskStats.innerHTML = `Всего задач: ${tasks.length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
        myTasksStats.innerHTML = `Ваши задачи: ${tasks.length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
        profileStats.innerHTML = `Создано задач: ${tasks.length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
    } else {
        taskStats.innerHTML = `Доступно задач: ${tasks.length} | Всего просмотров: ${totalViews} | Всего откликов: ${totalResponses}`;
        myTasksStats.innerHTML = `Ваши отклики: ${totalResponses}`;
        profileStats.innerHTML = `Ваши отклики: ${totalResponses}`;
    }
}

function showProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-role').value = localStorage.getItem('role') || 'client';
    switchTab('profile');
    updateStats();
}

function saveProfile() {
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const role = document.getElementById('profile-role').value;
    if (name && email && role) {
        localStorage.setItem('user', JSON.stringify({ name, email }));
        localStorage.setItem('role', role);
        showNotification('Профиль сохранён!');
        switchTab('main');
        updateTaskList();
    } else {
        showNotification('Заполните все поля!');
    }
}

document.getElementById('search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const buttons = document.querySelectorAll('#categories button');
    buttons.forEach(button => {
        const text = button.textContent.toLowerCase();
        button.classList.toggle('hidden', !text.includes(searchTerm));
    });
});

document.getElementById('logo').addEventListener('click', () => switchTab('main'));
document.getElementById('subscription-btn').addEventListener('click', () => switchTab('subscription'));

window.addEventListener('load', () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    document.getElementById('task-count').textContent = tasks.length;
    updateTaskList();

    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user && !localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify({ name: user.first_name, email: `${user.id}@telegram.com` }));
        localStorage.setItem('role', 'client');
    }

    if (!localStorage.getItem('onboarding')) {
        startOnboarding();
    }
});

const tabs = {
    main: document.getElementById('tab-main'),
    profile: document.getElementById('tab-profile'),
    subscription: document.getElementById('tab-subscription'),
    tasks: document.getElementById('tab-tasks'),
    about: document.getElementById('tab-about'),
    category: document.getElementById('category-content'),
    profileTab: document.getElementById('profile-content')
};
const contents = {
    main: document.getElementById('main-content'),
    profile: document.getElementById('profile-content'),
    subscription: document.getElementById('subscription-content'),
    tasks: document.getElementById('tasks-content'),
    about: document.getElementById('about-content'),
    category: document.getElementById('category-content'),
    profileTab: document.getElementById('profile-content')
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
        { title: 'Создание заданий', text: 'Нажмите "Создать задание", чтобы найти исполнителей.' },
        { title: 'Профиль', text: 'Настройте свой профиль через кнопку внизу.' },
        { title: 'Premium', text: 'Оформите Premium для дополнительных возможностей.' }
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