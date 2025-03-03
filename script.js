window.Telegram.WebApp.ready();

// Инициализация при загрузке
function initializeApp() {
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  const companies = JSON.parse(localStorage.getItem('companies') || '[]');
  const user = Telegram.WebApp.initDataUnsafe.user;
  document.getElementById('task-count').textContent = tasks.length;
  document.getElementById('performer-count').textContent = companies.length;

  if (user && !localStorage.getItem('user')) {
    switchTab('register-content');
  } else {
    updateUI();
    switchTab('profile-content');
  }

  if (!localStorage.getItem('onboarding')) {
    startOnboarding();
  }
}

function switchToCategory(category) {
  switchTab('category-content');
  document.getElementById('category-title').textContent = category;
  const performersList = document.getElementById('performers-list');
  const companies = JSON.parse(localStorage.getItem('companies') || '[]');
  performersList.innerHTML =
    companies.filter((c) => c.category === category)
      .map(
        (company) => `
      <div class="card cursor-pointer p-4 flex justify-between items-center hover:bg-gray-700 transition ${company.premium ? 'subscribed' : ''}">
        <div>
          <p class="font-semibold">${company.name} ${
          company.premium ? '<i class="ti ti-crown text-yellow-500 text-sm ml-1"></i>' : ''
        }</p>
          <p class="text-sm text-gray-400">${company.description}</p>
          <p class="text-sm text-gray-400">Рейтинг: ${company.rating || 'Нет оценок'}</p>
        </div>
        <button onclick="selectPerformer('${company.id}')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Выбрать</button>
      </div>
    `
      )
      .join('') || '<p class="text-center">Исполнителей в этой категории пока нет</p>';
}

function filterPerformers(type) {
  const performers = document.querySelectorAll('#performer-list > div');
  performers.forEach((p) => {
    if (type === 'subscribed') {
      p.classList.toggle('hidden', !p.classList.contains('subscribed'));
    } else {
      p.classList.remove('hidden');
    }
  });
}

function selectPerformer(companyId) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const selectedTaskIndex = tasks.findIndex(
      (task) => task.status === 'Открыто' && task.creatorId === Telegram.WebApp.initDataUnsafe.user.id
    );
    if (selectedTaskIndex === -1) {
      showNotification('Нет открытых задач для назначения исполнителя!');
      return;
    }
    tasks[selectedTaskIndex].status = 'В работе';
    tasks[selectedTaskIndex].performerId = companyId;
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Исполнитель с ID ${companyId} назначен на задачу!`);
    const company = JSON.parse(localStorage.getItem('companies') || '[]').find((c) => c.id === companyId);
    if (company) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${company.email.split('@')[1]}?text=Вы выбраны для выполнения задачи: ${tasks[selectedTaskIndex].text}`);
    }
    updateTaskList();
    switchTab('tasks-content');
  } catch (e) {
    console.error('Ошибка при выборе исполнителя:', e);
    showNotification('Произошла ошибка при выборе исполнителя!');
  }
}

function createTask() {
  const role = localStorage.getItem('role');
  if (!role) {
    showNotification('Пожалуйста, зарегистрируйтесь!');
    switchTab('register-content');
    return;
  }
  if (role !== 'client') {
    showNotification('Только заказчики могут создавать задания!');
    return;
  }
  document.getElementById('task-modal-title').textContent = 'Создать задание';
  document.getElementById('task-submit-btn').onclick = submitTask;
  document.getElementById('task-modal').classList.remove('hidden');
}

function editTask(index) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks[index];
    if (!task) {
      showNotification('Задание не найдено!');
      return;
    }
    if (task.creatorId !== Telegram.WebApp.initDataUnsafe.user.id) {
      showNotification('Вы можете редактировать только свои задачи!');
      return;
    }
    if (task.status !== 'Открыто') {
      showNotification('Можно редактировать только открытые задачи!');
      return;
    }
    document.getElementById('task-modal-title').textContent = 'Редактировать задание';
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-input').value = task.text;
    document.querySelectorAll('input[name="tags"]').forEach((tag) => {
      tag.checked = task.tags.includes(tag.value);
    });
    document.getElementById('task-submit-btn').onclick = () => saveEditedTask(index);
    document.getElementById('task-modal').classList.remove('hidden');
  } catch (e) {
    console.error('Ошибка при редактировании задачи:', e);
    showNotification('Произошла ошибка при редактировании задачи!');
  }
}

function saveEditedTask(index) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskText = document.getElementById('task-input').value;
    const category = document.getElementById('task-category').value;
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map((tag) => tag.value);
    if (taskText && category) {
      tasks[index].text = taskText;
      tasks[index].category = category;
      tasks[index].tags = tags;
      localStorage.setItem('tasks', JSON.stringify(tasks));
      showNotification(`Задание "${taskText}" обновлено!`);
      updateTaskList();
      closeModal();
    } else {
      showNotification('Заполните все поля!');
    }
  } catch (e) {
    console.error('Ошибка при сохранении редактирования:', e);
    showNotification('Произошла ошибка при сохранении изменений!');
  }
}

function closeModal() {
  document.getElementById('task-modal').classList.add('hidden');
  document.getElementById('task-input').value = '';
  document.querySelectorAll('input[name="tags"]').forEach((tag) => (tag.checked = false));
}

function showNotification(message) {
  const notif = document.createElement('div');
  notif.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-teal-500 text-white p-3 rounded-lg shadow-lg notification';
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function submitTask() {
  try {
    const taskText = document.getElementById('task-input').value;
    const category = document.getElementById('task-category').value;
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map((tag) => tag.value);
    if (taskText && category) {
      showNotification(`Задание "${taskText}" создано в категории "${category}"!`);
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const newTask = {
        text: taskText,
        category: category,
        responses: 0,
        views: 0,
        tags: tags,
        creatorId: Telegram.WebApp.initDataUnsafe.user.id,
        status: 'Открыто',
        performerId: null,
        createdAt: new Date().toISOString(),
        responders: []
      };
      tasks.push(newTask);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      document.getElementById('task-count').textContent = tasks.length;
      updateTaskList();
      updateStats();
      closeModal();
    } else {
      showNotification('Заполните все поля!');
    }
  } catch (e) {
    console.error('Ошибка при создании задачи:', e);
    showNotification('Произошла ошибка при создании задачи!');
  }
}

function updateTaskList() {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskList = document.getElementById('task-list');
    const myTasksList = document.getElementById('my-tasks-list');
    const performerTasks = document.getElementById('performer-tasks');
    const profileTasks = document.getElementById('profile-tasks');
    const role = localStorage.getItem('role') || '';
    const userId = Telegram.WebApp.initDataUnsafe.user ? Telegram.WebApp.initDataUnsafe.user.id : null;

    const filterCategory = document.getElementById('filter-category').value;
    const filterTag = document.getElementById('filter-tag').value;
    const sortOption = document.getElementById('sort-tasks').value;

    let filteredTasks = tasks.slice();
    if (filterCategory) {
      filteredTasks = filteredTasks.filter((task) => task.category === filterCategory);
    }
    if (filterTag) {
      filteredTasks = filteredTasks.filter((task) => task.tags.includes(filterTag));
    }

    if (sortOption) {
      filteredTasks.sort((a, b) => {
        if (sortOption === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortOption === 'views') return b.views - a.views;
        if (sortOption === 'responses') return b.responses - a.responses;
        return 0;
      });
    }

    // Обновление списка всех задач
    taskList.innerHTML = filteredTasks.length
      ? filteredTasks
          .map((task) => {
            const index = tasks.findIndex(
              (t) => t.text === task.text && t.createdAt === task.createdAt && t.creatorId === task.creatorId
            );
            task.views = task.views ? task.views + 1 : 1;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            const statusClass =
              task.status === 'Открыто'
                ? 'status-open'
                : task.status === 'В работе'
                ? 'status-in-progress'
                : 'status-completed';
            return `
            <div class="card p-4 flex justify-between items-center">
              <div>
                <p>${task.text}</p>
                <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                <p class="text-sm text-gray-400"><span class="status-dot ${statusClass}"></span> Статус: ${task.status}</p>
                <div>${task.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
              </div>
              ${
                role === 'client' && task.status === 'Открыто'
                  ? `<button onclick="switchToCategory('${task.category}')" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Выбрать исполнителя</button>`
                  : ''
              }
              ${
                role === 'client' && task.status === 'В работе'
                  ? `<button onclick="completeTask(${index})" class="py-2 px-4 bg-green-500 text-white rounded-lg">Завершить</button>`
                  : ''
              }
              ${
                role === 'client' && task.status === 'Завершено' && !task.rating
                  ? `<button onclick="openRatingModal(${index})" class="py-2 px-4 bg-yellow-500 text-white rounded-lg">Оценить</button>`
                  : ''
              }
              ${
                role === 'performer' && task.status === 'Открыто'
                  ? `<button onclick="respondToTask(${index})" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Откликнуться</button>`
                  : ''
              }
            </div>
          `;
          })
          .join('')
      : '<p class="text-center">Заданий нет</p>';

    // Обновление "Мои задачи" для заказчиков
    myTasksList.innerHTML =
      tasks.length && role === 'client'
        ? tasks
            .filter((task) => task.creatorId === userId)
            .map((task) => {
              const index = tasks.findIndex(
                (t) => t.text === task.text && t.createdAt === task.createdAt && t.creatorId === task.creatorId
              );
              const statusClass =
                task.status === 'Открыто'
                  ? 'status-open'
                  : task.status === 'В работе'
                  ? 'status-in-progress'
                  : 'status-completed';
              const company = JSON.parse(localStorage.getItem('companies') || '[]').find((c) => c.id === task.performerId);
              return `
            <div class="card p-4 flex justify-between items-center">
              <div>
                <p>${task.text}</p>
                <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                <p class="text-sm text-gray-400"><span class="status-dot ${statusClass}"></span> Статус: ${task.status}</p>
                ${task.performerId ? `<p class="text-sm text-gray-400">Исполнитель: ${company ? company.name : 'Неизвестен'}</p>` : ''}
                ${task.responders.length ? `<p class="text-sm text-gray-400">Откликнулись: ${task.responders.join(', ')}</p>` : ''}
                <div>${task.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
              </div>
              <div class="flex space-x-2">
                ${
                  task.status === 'Открыто'
                    ? `<button onclick="editTask(${index})" class="py-2 px-4 bg-blue-500 text-white rounded-lg">Редактировать</button>`
                    : ''
                }
                ${
                  task.status === 'Открыто'
                    ? `<button onclick="deleteTask(${index})" class="py-2 px-4 bg-red-500 text-white rounded-lg">Удалить</button>`
                    : ''
                }
                ${
                  task.status === 'Открыто' && task.responders.length
                    ? `<button onclick="acceptResponse(${index}, '${task.responders[0]}')" class="py-2 px-4 bg-green-500 text-white rounded-lg">Принять отклик</button>`
                    : ''
                }
                ${
                  task.status === 'В работе' && task.performerId
                    ? `<button onclick="chatWithPerformer('${task.performerId}')" class="py-2 px-4 bg-blue-500 text-white rounded-lg">Чат</button>`
                    : ''
                }
              </div>
            </div>
          `;
            })
            .join('')
        : '<p class="text-center">Ваши задачи отсутствуют</p>';

    // Обновление доступных задач для исполнителей
    performerTasks.innerHTML =
      tasks.length && role === 'performer'
        ? tasks
            .filter((task) => task.status === 'Открыто')
            .map((task) => {
              const index = tasks.findIndex(
                (t) => t.text === task.text && t.createdAt === task.createdAt && t.creatorId === task.creatorId
              );
              const statusClass = 'status-open';
              return `
            <div class="card p-4 flex justify-between items-center">
              <div>
                <p>${task.text}</p>
                <p class="text-sm text-gray-400">Категория: ${task.category} | Откликов: ${task.responses} | Просмотров: ${task.views}</p>
                <p class="text-sm text-gray-400"><span class="status-dot ${statusClass}"></span> Статус: ${task.status}</p>
                <div>${task.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
              </div>
              <button onclick="respondToTask(${index})" class="py-2 px-4 bg-teal-500 text-white rounded-lg">Откликнуться</button>
            </div>
          `;
            })
            .join('')
        : '<p class="text-center">Доступных задач нет</p>';

    // Обновление профиля
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('profile-role').textContent = `Роль: ${
      role === 'client' ? 'Заказчик' : role === 'performer' ? 'Исполнитель' : 'Не зарегистрирован'
    }`;
    document.getElementById('profile-name').textContent = `Имя: ${user.name || 'Не указано'}`;
    document.getElementById('profile-email').textContent = `Email: ${user.email || 'Не указано'}`;
    profileTasks.innerHTML =
      role === 'client'
        ? tasks
            .filter((task) => task.creatorId === userId)
            .map(
              (task) => `
            <div class="card p-4">
              <p>${task.text}</p>
              <p class="text-sm text-gray-400">Статус: ${task.status}</p>
            </div>
          `
            )
            .join('') || '<p class="text-center">Задач нет</p>'
        : role === 'performer'
        ? tasks
            .filter((task) => task.responders.includes(userId))
            .map(
              (task) => `
            <div class="card p-4">
              <p>${task.text}</p>
              <p class="text-sm text-gray-400">Статус: ${task.status}</p>
            </div>
          `
            )
            .join('') || '<p class="text-center">Откликов нет</p>'
        : '<p class="text-center">Зарегистрируйтесь, чтобы видеть задачи или отклики</p>';

    updateStats();
  } catch (e) {
    console.error('Ошибка при обновлении списка задач:', e);
    showNotification('Произошла ошибка при загрузке данных!');
    taskList.innerHTML = '<p class="text-center">Ошибка загрузки</p>';
    myTasksList.innerHTML = '<p class="text-center">Ошибка загрузки</p>';
    performerTasks.innerHTML = '<p class="text-center">Ошибка загрузки</p>';
    profileTasks.innerHTML = '<p class="text-center">Ошибка загрузки</p>';
  }
}

function respondToTask(index) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks[index];
    const userId = Telegram.WebApp.initDataUnsafe.user.id;
    if (!task.responders.includes(userId)) {
      task.responses += 1;
      task.responders.push(userId);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      showNotification(`Вы откликнулись на задание: "${task.text}"`);
    } else {
      showNotification('Вы уже откликнулись на это задание!');
    }
    updateTaskList();
    updateStats();
  } catch (e) {
    console.error('Ошибка при отклике на задание:', e);
    showNotification('Произошла ошибка при отклике!');
  }
}

function acceptResponse(index, performerId) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks[index].status = 'В работе';
    tasks[index].performerId = performerId;
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Отклик исполнителя ${performerId} принят!`);
    const company = JSON.parse(localStorage.getItem('companies') || '[]').find((c) => c.id === performerId);
    if (company) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${company.email.split('@')[1]}?text=Ваш отклик на задачу "${tasks[index].text}" принят!`);
    }
    updateTaskList();
    updateStats();
  } catch (e) {
    console.error('Ошибка при принятии отклика:', e);
    showNotification('Произошла ошибка при принятии отклика!');
  }
}

function deleteTask(index) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks[index];
    if (task.creatorId !== Telegram.WebApp.initDataUnsafe.user.id) {
      showNotification('Вы можете удалять только свои задачи!');
      return;
    }
    tasks.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    document.getElementById('task-count').textContent = tasks.length;
    updateTaskList();
    updateStats();
  } catch (e) {
    console.error('Ошибка при удалении задачи:', e);
    showNotification('Произошла ошибка при удалении задачи!');
  }
}

function completeTask(index) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks[index].status = 'Завершено';
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Задание "${tasks[index].text}" завершено!`);
    updateTaskList();
    updateStats();
  } catch (e) {
    console.error('Ошибка при завершении задачи:', e);
    showNotification('Произошла ошибка при завершении задачи!');
  }
}

function openRatingModal(index) {
  window.currentTaskIndex = index;
  document.getElementById('rating-modal').classList.remove('hidden');
}

function ratePerformer(rating) {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks[window.currentTaskIndex];
    task.rating = rating;
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    const company = companies.find((c) => c.id === task.performerId);
    if (company) {
      company.rating = company.rating ? Math.round((company.rating + rating) / 2) : rating;
      localStorage.setItem('companies', JSON.stringify(companies));
    }
    localStorage.setItem('tasks', JSON.stringify(tasks));
    showNotification(`Исполнитель оценён на ${rating} звёзд!`);
    closeRatingModal();
    updateTaskList();
  } catch (e) {
    console.error('Ошибка при оценке исполнителя:', e);
    showNotification('Произошла ошибка при оценке исполнителя!');
  }
}

function closeRatingModal() {
  document.getElementById('rating-modal').classList.add('hidden');
}

function chatWithPerformer(performerId) {
  try {
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    const company = companies.find((c) => c.id === performerId);
    if (company) {
      const telegramLink = `https://t.me/${company.email.split('@')[1]}`;
      window.Telegram.WebApp.openTelegramLink(telegramLink);
    } else {
      showNotification('Контакт исполнителя не найден!');
    }
  } catch (e) {
    console.error('Ошибка при открытии чата:', e);
    showNotification('Произошла ошибка при открытии чата!');
  }
}

function updateStats() {
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    const role = localStorage.getItem('role') || '';
    const userId = Telegram.WebApp.initDataUnsafe.user ? Telegram.WebApp.initDataUnsafe.user.id : null;
    const taskStats = document.getElementById('task-stats');
    const myTasksStats = document.getElementById('my-tasks-stats');

    const totalResponses = tasks.reduce((sum, task) => sum + task.responses, 0);
    const totalViews = tasks.reduce((sum, task) => sum + task.views, 0);
    document.getElementById('performer-count').textContent = companies.length;

    if (role === 'client') {
      taskStats.innerHTML = `Всего задач: ${tasks.length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
      myTasksStats.innerHTML = `Ваши задачи: ${tasks.filter((t) => t.creatorId === userId).length} | Просмотров: ${totalViews} | Откликов: ${totalResponses}`;
    } else if (role === 'performer') {
      taskStats.innerHTML = `Доступно задач: ${tasks.length} | Всего просмотров: ${totalViews} | Всего откликов: ${totalResponses}`;
      myTasksStats.innerHTML = `Ваши отклики: ${tasks.filter((t) => t.responders.includes(userId)).length}`;
    } else {
      taskStats.innerHTML = 'Зарегистрируйтесь для просмотра статистики';
      myTasksStats.innerHTML = 'Зарегистрируйтесь для просмотра статистики';
    }
  } catch (e) {
    console.error('Ошибка при обновлении статистики:', e);
    showNotification('Произошла ошибка при загрузке статистики!');
  }
}

function registerUser() {
  try {
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
      switchTab('profile-content');
      updateUI();
    } else {
      showNotification('Заполните все поля!');
    }
  } catch (e) {
    console.error('Ошибка при регистрации:', e);
    showNotification('Произошла ошибка при регистрации!');
  }
}

function getMainTab() {
  const role = localStorage.getItem('role');
  return role === 'performer' ? 'performer-main' : 'client-main';
}

function updateUI() {
  try {
    const role = localStorage.getItem('role');
    const clientMain = document.getElementById('client-main');
    const performerMain = document.getElementById('performer-main');
    const registerContent = document.getElementById('register-content');
    if (role === 'performer') {
      clientMain.classList.add('hidden');
      performerMain.classList.remove('hidden');
      registerContent.classList.add('hidden');
      document.getElementById('performer-fields').classList.remove('hidden');
    } else if (role === 'client') {
      clientMain.classList.remove('hidden');
      performerMain.classList.add('hidden');
      registerContent.classList.add('hidden');
      document.getElementById('performer-fields').classList.add('hidden');
    } else {
      clientMain.classList.add('hidden');
      performerMain.classList.add('hidden');
      registerContent.classList.remove('hidden');
    }
    updateTaskList();
    updateStats();
  } catch (e) {
    console.error('Ошибка при обновлении UI:', e);
    showNotification('Произошла ошибка при обновлении интерфейса!');
  }
}

document.getElementById('search').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const buttons = document.querySelectorAll('#categories button');
  buttons.forEach((button) => {
    const text = button.textContent.toLowerCase();
    button.classList.toggle('hidden', !text.includes(searchTerm));
  });
});

document.getElementById('reg-role').addEventListener('change', (e) => {
  const role = e.target.value;
  document.getElementById('performer-fields').classList.toggle('hidden', role !== 'performer');
});

document.getElementById('logo').addEventListener('click', () => switchTab('profile-content'));
document.getElementById('subscription-btn').addEventListener('click', () => switchTab('subscription-content'));

// Новая функция переключения вкладок
function switchTab(activeTab) {
  try {
    document.querySelectorAll('.nav-button').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('#content > div').forEach((content) => content.classList.add('hidden'));
    document.getElementById(activeTab).classList.remove('hidden');
    if (activeTab === 'client-main' || activeTab === 'performer-main') {
      document.getElementById('tab-main').classList.add('active');
    } else {
      let prefix = activeTab.split('-')[0];
      document.getElementById('tab-' + prefix).classList.add('active');
    }
  } catch (e) {
    console.error('Ошибка при переключении вкладки:', e);
    showNotification('Произошла ошибка при переключении вкладки!');
  }
}

// Функция загрузки аватара пользователя
function uploadAvatar(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      localStorage.setItem('avatar', e.target.result);
      document.getElementById('profile-avatar').src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// Функция обновления данных профиля
function updateProfile() {
  const name = document.getElementById('profile-name-input').value;
  const email = document.getElementById('profile-email-input').value;
  let user = JSON.parse(localStorage.getItem('user')) || {};
  user.name = name;
  user.email = email;
  localStorage.setItem('user', JSON.stringify(user));
  document.getElementById('profile-name').textContent = 'Имя: ' + (name || 'Не указано');
  document.getElementById('profile-email').textContent = 'Email: ' + (email || 'Не указано');
  showNotification('Профиль обновлен!');
}

// Функция загрузки данных профиля при загрузке страницы
function loadProfile() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  document.getElementById('profile-name').textContent = 'Имя: ' + (user.name || 'Не указано');
  document.getElementById('profile-email').textContent = 'Email: ' + (user.email || 'Не указано');
  document.getElementById('profile-avatar').src = localStorage.getItem('avatar') || 'default-avatar.png';
}

document.getElementById('avatar-upload').addEventListener('change', uploadAvatar);
document.getElementById('save-profile').addEventListener('click', updateProfile);

window.addEventListener('load', () => {
  loadProfile();
  initializeApp();
});

function startOnboarding() {
  const onboarding = document.getElementById('onboarding-modal');
  onboarding.classList.remove('hidden');
  const steps = [
    { title: 'Добро пожаловать!', text: 'Это ваше первое знакомство с платформой.' },
    { title: 'Регистрация', text: 'Зарегистрируйтесь как заказчик или исполнитель.' },
    { title: 'Создание заданий', text: 'Заказчики могут создавать и редактировать задачи.' },
    { title: 'Отклики', text: 'Исполнители могут откликаться на задачи.' }
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
