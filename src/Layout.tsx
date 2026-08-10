import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Боковая панель (Sidebar) — как в Джире */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 p-4">
        <div className="mb-8 text-xl font-bold text-blue-500">Mini-Jira</div>
        <nav className="space-y-2">
          <a href="#" className="block rounded p-2 bg-slate-900 text-blue-400">
            Доски
          </a>
          <a
            href="#"
            className="block rounded p-2 text-slate-400 hover:bg-slate-900"
          >
            Задачи
          </a>
          <a
            href="#"
            className="block rounded p-2 text-slate-400 hover:bg-slate-900"
          >
            Настройки
          </a>
        </nav>
      </aside>

      {/* Основной контент */}
      <div className="flex flex-1 flex-col">
        {/* Верхняя шапка (Header) */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
          <div className="text-sm text-slate-400">
            Рабочее пространство / Проект 1
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            U
          </div>
        </header>

        {/* Сюда будет подставляться сама доска */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
