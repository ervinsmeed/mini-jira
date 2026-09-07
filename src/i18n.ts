import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",

    resources: {
      en: {
        translation: {
          kanban: "Kanban",
          allBoards: "PROJECTS",
          createBoard: "Create Project",
          hideSidebar: "Hide Sidebar",
          logout: "Log out",

          board: {
            welcome: "Welcome to your Kanban Board",
            getStarted: "Create or select a board to get started",
            addTask: "Add New Task",
            newColumn: "New Column",
            searchTasks: "Search tasks...",
            allPriorities: "All priorities",
            manualOrder: "Manual order",
            sortDeadline: "By deadline",
            sortStoryPoints: "By Story Points",
            sortPriority: "By priority",
            filters: "Filters",
          },
          createBoardModal: {
            title: "Create New Board",
            boardName: "Board Name",
            placeholder: "e.g Web Design",
            description: "Description",
            descriptionPlaceholder: "Enter project description",
            create: "Create Board",
            created: "Board {{name}} created",
          },
          template: "Task Template",
          noTemplate: "Without Template",
          templateNamePlaceholder: "Template name, e.g. Bug",
          saveTemplate: "Save Template",
          savingTemplate: "Saving...",
          deleteTemplate: "Delete",
          templateHint:
            "The template saves the current title, description, priority and Story Points.",
          templateNameRequired: "Enter a template name",
          templateCreated: "Template created",
          templateCreateError: "Failed to create template",
          deleteTemplateQuestion: "Delete selected template?",
          templateDeleted: "Template deleted",
          templateDeleteError: "Failed to delete template",

          column: {
            edit: "Edit",
            delete: "Delete",
            deleteTitle: "Delete Column?",
            deleteDescription:
              "This column will no longer appear in this board. Continue?",
            deleted: "Column deleted",
          },

          common: {
            yes: "Yes",
            no: "No",
          },
          navigation: {
            analytics: "Analytics",
            profile: "Profile",
            backToBoard: "Back to board",
            workspaces: "Workspaces",
          },

          recentTasks: {
            button: "Recent",
            title: "Recent tasks",
            loading: "Loading...",
            empty: "No recently viewed tasks",
            clear: "Clear recent tasks",
          },

          pagination: {
            loading: "Loading...",
            loadMore: "Load more tasks",
          },

          analytics: {
            title: "Project analytics",
            noPermission: "You do not have permission to view analytics.",
            totalTasks: "Total tasks",
            completed: "Completed",
            active: "Active",
            overdue: "Overdue",
            byStatus: "Tasks by status",
            byPriority: "Tasks by priority",
            byAssignee: "Tasks by assignee",
            statusDetails: "Status details",
            assigneeDetails: "Assignee details",
            tasks: "Tasks",
            unassigned: "Unassigned",

            priority: {
              high: "High",
              medium: "Medium",
              low: "Low",
            },

            status: {
              backlog: "Backlog",
              toDo: "To Do",
              inProgress: "In Progress",
              review: "Review",
              testing: "Testing",
              done: "Done",
            },
          },

          profile: {
            title: "Profile",
            subtitle: "Manage your personal information",
            firstName: "First name",
            lastName: "Last name",
            position: "Position",
            positionPlaceholder: "Frontend Developer",
            avatarUrl: "Avatar URL",
            avatarPlaceholder: "https://example.com/avatar.jpg",
            email: "Email",
            save: "Save profile",
            saving: "Saving...",
            updated: "Profile updated",
            updateError: "Failed to update profile",
          },

          taskCard: {
            subtasksProgress: "{{completed}} of {{total}} subtasks",
          },

          taskModal: {
            editTask: "Edit Task",
            deleteTask: "Delete Task",
            deleteQuestion: "Delete task?",
            deleted: "Task deleted!",
            subtasks: "Subtasks ({{completed}} of {{total}})",
            column: "Column",
            selectColumn: "Select column",
            storyPoints: "Story Points",
            deadline: "Deadline",
          },
          editTask: {
            updated: "Task updated",
            title: "Edit Task",
            taskTitle: "Title",
            description: "Description",
            descriptionPlaceholder: "Enter task description",
            subtasks: "Subtasks",
            addSubtask: "Add New Subtask",
            priority: "Priority",
            selectPriority: "Select priority",
            column: "Column",
            selectColumn: "Select column",
            cancel: "Cancel",
            updateTask: "Update Task",
            subtaskPlaceholder: "e.g Make coffee",
            storyPoints: "Story Points",
            selectStoryPoints: "Select Story Points",
            deadline: "Deadline",
          },

          createTask: {
            created: "New task added",
            title: "Add New Task",
            taskTitle: "Title",
            titlePlaceholder: "e.g Take coffee break",
            description: "Description",
            descriptionPlaceholder: "e.g It's always good to take a break.",
            subtasks: "Subtasks",
            addSubtask: "Add New Subtask",
            subtaskPlaceholder: "e.g Make coffee",
            priority: "Priority",
            selectPriority: "Select priority",
            column: "Column",
            selectColumn: "Select column",
            create: "Create Task",
            storyPoints: "Story Points",
            selectStoryPoints: "Select Story Points",
            deadline: "Deadline",
          },

          createWorkspaceModal: {
            title: "Create Workspace",
            workspaceName: "Workspace Name",
            namePlaceholder: "Enter workspace name",
            description: "Description",
            descriptionPlaceholder: "Enter workspace description",
            create: "Create Workspace",
            created: 'Workspace "{{name}}" created successfully',
          },
          editColumn: {
            updated: "Column Updated",
            title: "Edit Column",
            columnName: "Column Name",
            placeholder: "e.g. In Review",
            color: "Column Color",
            update: "Update Column",
          },
          createColumn: {
            created: "New column created",
            title: "Create New Column",
            columnName: "Column Name",
            placeholder: "e.g. In Review",
            color: "Column Color",
            create: "Create Column",
          },
          editWorkspaceModal: {
            title: "Edit Workspace",
            workspaceName: "Workspace Name",
            description: "Description",
            save: "Save Changes",
            updated: "Workspace updated successfully",
          },

          editProjectModal: {
            title: "Edit Project",
            projectName: "Project Name",
            description: "Description",
            descriptionPlaceholder: "Enter project description",
            status: "Status",
            active: "Active",
            completed: "Completed",
            archived: "Archived",
            save: "Save Changes",
            updated: "Project updated successfully",
          },

          unassigned: "Unassigned",
        },
      },

      ru: {
        translation: {
          kanban: "Канбан",
          allBoards: "ПРОЕКТЫ",
          createBoard: "Создать проект",
          hideSidebar: "Скрыть боковую панель",
          logout: "Выйти",

          board: {
            welcome: "Добро пожаловать на вашу Канбан-доску",
            getStarted: "Создайте или выберите доску, чтобы начать",
            addTask: "Добавить задачу",
            newColumn: "Новая колонка",
            searchTasks: "Поиск задач...",
            allPriorities: "Все приоритеты",
            manualOrder: "Ручной порядок",
            sortDeadline: "По сроку",
            filters: "Фильтры",
            sortStoryPoints: "По Story Points",
            sortPriority: "По приоритету",
          },
          editWorkspaceModal: {
            title: "Редактировать Workspace",
            workspaceName: "Название",
            description: "Описание",
            save: "Сохранить изменения",
            updated: "Workspace успешно обновлён",
          },

          createWorkspaceModal: {
            title: "Создать рабочее пространство",
            workspaceName: "Название",
            namePlaceholder: "Введите название рабочего пространства",
            description: "Описание",
            descriptionPlaceholder: "Введите описание рабочего пространства",
            create: "Создать Workspace",
            created: 'Workspace "{{name}}" успешно создан',
          },
          template: "Шаблон задачи",
          noTemplate: "Без шаблона",
          templateNamePlaceholder: "Название шаблона, например Bug",
          saveTemplate: "Сохранить шаблон",
          savingTemplate: "Сохранение...",
          deleteTemplate: "Удалить",
          templateHint:
            "Шаблон сохраняет текущее название, описание, приоритет и Story Points.",
          templateNameRequired: "Введите название шаблона",
          templateCreated: "Шаблон создан",
          templateCreateError: "Не удалось создать шаблон",
          deleteTemplateQuestion: "Удалить выбранный шаблон?",
          templateDeleted: "Шаблон удалён",
          templateDeleteError: "Не удалось удалить шаблон",

          column: {
            edit: "Редактировать",
            delete: "Удалить",
            deleteTitle: "Удалить колонку?",
            deleteDescription:
              "Эта колонка больше не будет отображаться на доске. Продолжить?",
            deleted: "Колонка удалена",
          },

          common: {
            yes: "Да",
            no: "Нет",
          },

          navigation: {
            analytics: "Аналитика",
            profile: "Профиль",
            backToBoard: "Назад к доске",
            workspaces: "Рабочие пространства",
          },

          recentTasks: {
            button: "Недавние",
            title: "Недавние задачи",
            loading: "Загрузка...",
            empty: "Недавно просмотренных задач нет",
            clear: "Очистить недавние задачи",
          },

          pagination: {
            loading: "Загрузка...",
            loadMore: "Загрузить ещё задачи",
          },

          analytics: {
            title: "Аналитика проекта",
            noPermission: "У вас нет разрешения на просмотр аналитики.",
            totalTasks: "Всего задач",
            completed: "Завершено",
            active: "Активные",
            overdue: "Просроченные",
            byStatus: "Задачи по статусам",
            byPriority: "Задачи по приоритетам",
            byAssignee: "Задачи по исполнителям",
            statusDetails: "Подробности по статусам",
            assigneeDetails: "Подробности по исполнителям",
            tasks: "Задачи",
            unassigned: "Без исполнителя",

            priority: {
              high: "Высокий",
              medium: "Средний",
              low: "Низкий",
            },

            status: {
              backlog: "Бэклог",
              toDo: "К выполнению",
              inProgress: "В процессе",
              review: "Проверка",
              testing: "Тестирование",
              done: "Готово",
            },
          },

          profile: {
            title: "Профиль",
            subtitle: "Управление личной информацией",
            firstName: "Имя",
            lastName: "Фамилия",
            position: "Должность",
            positionPlaceholder: "Frontend-разработчик",
            avatarUrl: "URL аватара",
            avatarPlaceholder: "https://example.com/avatar.jpg",
            email: "Электронная почта",
            save: "Сохранить профиль",
            saving: "Сохранение...",
            updated: "Профиль обновлён",
            updateError: "Не удалось обновить профиль",
          },

          taskCard: {
            subtasksProgress: "{{completed}} из {{total}} подзадач",
          },
          createBoardModal: {
            title: "Создать новую доску",
            boardName: "Название доски",
            placeholder: "Например, веб-дизайн",
            create: "Создать доску",
            created: "Доска {{name}} создана",
          },

          taskModal: {
            editTask: "Редактировать задачу",
            deleteTask: "Удалить задачу",
            deleteQuestion: "Удалить задачу?",
            deleted: "Задача удалена!",
            subtasks: "Подзадачи ({{completed}} из {{total}})",
            column: "Колонка",
            selectColumn: "Выберите колонку",
            storyPoints: "Story Points",
            deadline: "Срок выполнения",
          },

          createTask: {
            created: "Новая задача добавлена",
            title: "Добавить новую задачу",
            taskTitle: "Название",
            titlePlaceholder: "Например, сделать перерыв на кофе",
            description: "Описание",
            descriptionPlaceholder: "Например, иногда полезно сделать перерыв.",
            subtasks: "Подзадачи",
            addSubtask: "Добавить подзадачу",
            subtaskPlaceholder: "Например, приготовить кофе",
            priority: "Приоритет",
            selectPriority: "Выберите приоритет",
            column: "Колонка",
            selectColumn: "Выберите колонку",
            create: "Создать задачу",
            storyPoints: "Story Points",
            selectStoryPoints: "Выберите Story Points",
            deadline: "Срок выполнения",
          },

          unassigned: "Без исполнителя",

          priority: {
            high: "Высокий",
            medium: "Средний",
            low: "Низкий",
          },

          status: {
            backlog: "Бэклог",
            toDo: "К выполнению",
            inProgress: "В процессе",
            review: "Проверка",
            testing: "Тестирование",
            done: "Готово",
          },
          createColumn: {
            created: "Новая колонка создана",
            title: "Создать новую колонку",
            columnName: "Название колонки",
            placeholder: "Например, На проверке",
            color: "Цвет колонки",
            create: "Создать колонку",
          },
          editTask: {
            updated: "Задача обновлена",
            title: "Редактировать задачу",
            taskTitle: "Название",
            description: "Описание",
            descriptionPlaceholder: "Введите описание задачи",
            subtasks: "Подзадачи",
            addSubtask: "Добавить подзадачу",
            priority: "Приоритет",
            selectPriority: "Выберите приоритет",
            column: "Колонка",
            selectColumn: "Выберите колонку",
            cancel: "Отмена",
            updateTask: "Обновить задачу",
            subtaskPlaceholder: "Например, приготовить кофе",
            storyPoints: "Story Points",
            selectStoryPoints: "Выберите Story Points",
            deadline: "Срок выполнения",
          },

          editProjectModal: {
            title: "Редактировать проект",
            projectName: "Название проекта",
            description: "Описание",
            descriptionPlaceholder: "Введите описание проекта",
            status: "Статус",
            active: "Активный",
            completed: "Завершён",
            archived: "Архивный",
            save: "Сохранить изменения",
            updated: "Проект успешно обновлён",
          },

          editColumn: {
            updated: "Колонка обновлена",
            title: "Редактировать колонку",
            columnName: "Название колонки",
            placeholder: "Например, На проверке",
            color: "Цвет колонки",
            update: "Обновить колонку",
          },
        },
      },
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
