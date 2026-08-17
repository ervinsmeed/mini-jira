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
          allBoards: "All Boards",
          createBoard: "Create New Board",
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
          },
          createBoardModal: {
            title: "Create New Board",
            boardName: "Board Name",
            placeholder: "e.g Web Design",
            create: "Create Board",
            created: "Board {{name}} created",
          },

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

          priority: {
            high: "High",
            medium: "Medium",
            low: "Low",
          },
        },
      },

      ru: {
        translation: {
          kanban: "Канбан",
          allBoards: "Все доски",
          createBoard: "Создать доску",
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

          priority: {
            high: "Высокий",
            medium: "Средний",
            low: "Низкий",
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
