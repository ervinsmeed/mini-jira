import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import Sidebar from "./Sidebar";
import Board from "./Board";
import CreateBoardModal from "./CreateBoardModal";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import EditProjectModal from "./EditProjectModal";
import EditWorkspaceModal from "./EditWorkspaceModal";

import { api } from "../../convex/_generated/api";

export default function AuthenticatedApp() {
  const [currentBoard, setCurrentBoard] = useState(null);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("kanban-theme");
    return saved === "light" ? "light" : "dark";
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);

  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] =
    useState(false);

  const { user } = useUser();

  const createUser = useMutation(api.users.create);

  const workspaces = useQuery(api.workspaces.list);

  const displayWorkspace =
    currentWorkspace ??
    (workspaces && workspaces.length > 0 ? workspaces[0] : null);

  const allBoards = useQuery(api.boards.list);

  const workspaceBoards = useQuery(
    api.boards.listByWorkspace,
    displayWorkspace?._id
      ? {
          workspaceId: displayWorkspace._id,
        }
      : "skip",
  );

  const boards = displayWorkspace ? workspaceBoards : allBoards;

  const initializeColumns = useMutation(api.columns.initializeDefaultColumns);

  const deleteWorkspace = useMutation(api.workspaces.remove);

  // Create user in Convex
  useEffect(() => {
    if (user) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.fullName || user.firstName || "User",
      }).catch(() => {});
    }
  }, [user, createUser]);

  const displayBoard =
    currentBoard ?? (boards && boards.length > 0 ? boards[0] : null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("kanban-theme", theme);
  }, [theme]);

  // Responsive sidebar
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

  const handleOpenCreateWorkspaceModal = () => {
    setIsCreateWorkspaceModalOpen(true);
  };

  const handleBoardCreated = (board: any) => {
    setCurrentBoard(board);

    if (board && board._id) {
      initializeColumns({
        boardId: board._id,
      }).catch(() => {});
    }
  };

  const handleWorkspaceCreated = (workspace: any) => {
    setCurrentWorkspace(workspace);
    setCurrentBoard(null);
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

  const handleWorkspaceSelect = (workspace: any) => {
    setCurrentWorkspace(workspace);
    setCurrentBoard(null);
  };

  const handleEditWorkspace = (workspace: any) => {
    setEditingWorkspace(workspace);
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
  };

  const handleDeleteWorkspace = async (workspaceId: any) => {
    const remainingWorkspaces = (workspaces ?? []).filter(
      (workspace: any) => workspace._id !== workspaceId,
    );

    await deleteWorkspace({
      id: workspaceId,
    });

    setCurrentWorkspace(remainingWorkspaces[0] ?? null);
    setCurrentBoard(null);
    setEditingWorkspace(null);
  };

  if (workspaces === undefined || boards === undefined) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0f172a]">
        <div className="size-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-auto">
      <Sidebar
        currentBoard={displayBoard}
        onBoardSelect={handleBoardSelect}
        onCreateBoard={handleOpenCreateModal}
        currentWorkspace={displayWorkspace}
        workspaces={workspaces}
        onWorkspaceSelect={handleWorkspaceSelect}
        onCreateWorkspace={handleOpenCreateWorkspaceModal}
        onEditWorkspace={handleEditWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onEditProject={handleEditProject}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleCollapse}
      />

      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "ml-0" : "ml-72"
        }`}
      >
        <Board board={displayBoard} theme={theme} />
      </div>

      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onBoardCreated={handleBoardCreated}
        workspaceId={displayWorkspace?._id}
        theme={theme}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
        theme={theme}
      />

      {editingWorkspace && (
        <EditWorkspaceModal
          workspace={editingWorkspace}
          onClose={() => setEditingWorkspace(null)}
          theme={theme}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
