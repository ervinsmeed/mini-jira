/* eslint-disable @typescript-eslint/no-explicit-any */
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Board from "./Board";
import CreateBoardModal from "./CreateBoardModal";
import { api } from "../../convex/_generated/api";

export default function AuthenticatedApp() {
  const [currentBoard, setCurrentBoard] = useState(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("kanban-theme");
    return saved === "light" ? "light" : "dark";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);

  const { user } = useUser();
  const createUser = useMutation(api.users.create);
  const boards = useQuery(api.boards.list);
  const initializeColumns = useMutation(api.columns.initializeDefaultColumns);

  // Create user in convex
  useEffect(() => {
    if (user) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.fullName || user.firstName || "User",
      }).catch(() => {});
    }
  }, [user, createUser]);

  // Compute display board: prefer explicitly selected board, otherwise first board
  const displayBoard = currentBoard ?? (boards && boards.length > 0 ? boards[0] : null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kanban-theme", theme);
  }, [theme]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateBoardModalOpen(true);
  };

  // ИСПРАВЛЕНО: Заменили .id на ._id, так как в Convex используется нижнее подчеркивание
  const handleBoardCreated = (board: any) => {
    setCurrentBoard(board);
    if (board && board._id) {
      initializeColumns({ boardId: board._id }).catch(() => {});
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleBoardSelect = (board: any) => {
    setCurrentBoard(board);
  };

  // ДОБАВЛЕНО: Защита от бесконечной загрузки. Пока данные с Convex летят, показываем аккуратный спиннер
  if (boards === undefined) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-auto flex">
      <Sidebar
        currentBoard={displayBoard}
        onBoardSelect={handleBoardSelect}
        onCreateBoard={handleOpenCreateModal}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleCollapse}
      />
      <div
        className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-0" : "ml-72"}`}
      >
        <Board board={displayBoard} theme={theme} />
      </div>

      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onBoardCreated={handleBoardCreated}
        theme={theme}
      />
    </div>
  );
}
