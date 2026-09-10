import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { actionError } from "../lib/actionError";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { lazy, Suspense, useEffect, useState } from "react";
import RolesModal from "./RolesModal";
import Sidebar from "./Sidebar";
import Board from "./Board";

import CreateBoardModal from "./CreateBoardModal";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import EditProjectModal from "./EditProjectModal";
import EditWorkspaceModal from "./EditWorkspaceModal";
import ProjectMembersModal from "./ProjectMembersModal";
import WorkspaceMembersModal from "./WorkspaceMembersModal";
import { api } from "../../convex/_generated/api";

const ProjectAnalytics = lazy(() => import("./ProjectAnalytics"));
const Profile = lazy(() => import("./Profile"));
export default function AuthenticatedApp() {
  const { t } = useTranslation();
  const [currentBoard, setCurrentBoard] = useState<Doc<"boards"> | null>(null);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<Doc<"workspaces"> | null>(null);
  const [currentView, setCurrentView] = useState<
    "board" | "analytics" | "profile"
  >("board");
  const [editingWorkspace, setEditingWorkspace] =
    useState<Doc<"workspaces"> | null>(null);
  const [editingProject, setEditingProject] = useState<Doc<"boards"> | null>(
    null,
  );
  const [membersProject, setMembersProject] = useState<Doc<"boards"> | null>(
    null,
  );
  const [membersWorkspace, setMembersWorkspace] =
    useState<Doc<"workspaces"> | null>(null);
  const [rolesWorkspace, setRolesWorkspace] =
    useState<Doc<"workspaces"> | null>(null);

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

  const {
    results: workspaces,
    status: workspaceListStatus,
    loadMore: loadWorkspaces,
  } = usePaginatedQuery(
    api.workspaces.workspacesPage,
    {},
    { initialNumItems: 30 },
  );

  const displayWorkspace =
    currentWorkspace ??
    (workspaces && workspaces.length > 0 ? workspaces[0] : null);

  const currentAccess = useQuery(
    api.workspaceMembers.getCurrentAccess,
    displayWorkspace?._id
      ? {
          workspaceId: displayWorkspace._id,
        }
      : "skip",
  );

  const {
    results: boards,
    status: boardListStatus,
    loadMore: loadBoards,
  } = usePaginatedQuery(
    api.boards.projectsPage,
    { workspaceId: displayWorkspace?._id },
    { initialNumItems: 30 },
  );
  useEffect(() => {
    if (workspaces.length === 0 && workspaceListStatus === "CanLoadMore")
      loadWorkspaces(30);
  }, [workspaces.length, workspaceListStatus, loadWorkspaces]);
  useEffect(() => {
    if (boards.length === 0 && boardListStatus === "CanLoadMore")
      loadBoards(30);
  }, [boards.length, boardListStatus, loadBoards]);

  const can = (permission: string) => {
    if (!displayWorkspace) {
      return true;
    }

    if (currentAccess?.isOwner) {
      return true;
    }

    return currentAccess?.permissions?.includes(permission) ?? false;
  };

  const initializeColumns = useMutation(api.columns.initializeDefaultColumns);

  const deleteWorkspace = useMutation(api.workspaces.remove);

  // Create user in Convex
  useEffect(() => {
    if (user) {
      createUser({}).catch((error) => {
        toast.error(actionError(error, t));
      });
    }
  }, [user, createUser, t]);

  const displayBoard =
    currentBoard ?? (boards && boards.length > 0 ? boards[0] : null);

  const projectAccess = useQuery(
    api.boards.getCurrentAccess,
    displayBoard?._id
      ? {
          boardId: displayBoard._id,
        }
      : "skip",
  );

  const canProject = (permission: string) => {
    if (!displayBoard) {
      return false;
    }

    if (projectAccess?.isOwner) {
      return true;
    }

    return projectAccess?.permissions?.includes(permission) ?? false;
  };

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
    if (!can("project.create")) {
      return;
    }

    setIsCreateBoardModalOpen(true);
  };
  const handleOpenCreateWorkspaceModal = () => {
    setIsCreateWorkspaceModalOpen(true);
  };

  const handleBoardCreated = (board: Doc<"boards">) => {
    setCurrentBoard(board);

    if (board && board._id) {
      initializeColumns({
        boardId: board._id,
      }).catch((error) => toast.error(actionError(error, t)));
    }
  };

  const handleWorkspaceCreated = (workspace: Doc<"workspaces">) => {
    setCurrentWorkspace(workspace);
    setCurrentBoard(null);
    setCurrentView("board");
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleBoardSelect = (board: Doc<"boards"> | null) => {
    setCurrentBoard(board);
    setCurrentView("board");
  };

  const handleWorkspaceSelect = (workspace: Doc<"workspaces">) => {
    setCurrentWorkspace(workspace);
    setCurrentBoard(null);
    setCurrentView("board");
  };

  const handleEditWorkspace = (workspace: Doc<"workspaces">) => {
    setEditingWorkspace(workspace);
  };

  const handleEditProject = (project: Doc<"boards">) => {
    setEditingProject(project);
  };

  const handleProjectUpdated = (updatedProject: Doc<"boards">) => {
    if (!updatedProject) return;

    setCurrentBoard(updatedProject);
  };

  const handleProjectMembers = (project: Doc<"boards">) => {
    setMembersProject(project);
  };

  const handleWorkspaceMembers = (workspace: Doc<"workspaces">) => {
    setMembersWorkspace(workspace);
  };

  const handleWorkspaceRoles = (workspace: Doc<"workspaces">) =>
    setRolesWorkspace(workspace);
  const handleDeleteWorkspace = async (workspaceId: Id<"workspaces">) => {
    const remainingWorkspaces = (workspaces ?? []).filter(
      (workspace: Doc<"workspaces">) => workspace._id !== workspaceId,
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
        boards={boards}
        boardListStatus={boardListStatus}
        onLoadBoards={() => loadBoards(30)}
        onBoardSelect={handleBoardSelect}
        onCreateBoard={handleOpenCreateModal}
        currentWorkspace={displayWorkspace}
        can={can}
        canViewAnalytics={canProject("analytics.view")}
        workspaces={workspaces}
        workspaceListStatus={workspaceListStatus}
        onLoadWorkspaces={() => loadWorkspaces(30)}
        onWorkspaceSelect={handleWorkspaceSelect}
        onCreateWorkspace={handleOpenCreateWorkspaceModal}
        onEditWorkspace={handleEditWorkspace}
        onWorkspaceMembers={handleWorkspaceMembers}
        onDeleteWorkspace={handleDeleteWorkspace}
        onWorkspaceRoles={handleWorkspaceRoles}
        onEditProject={handleEditProject}
        onProjectMembers={handleProjectMembers}
        currentView={currentView}
        onViewChange={setCurrentView}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleCollapse}
      />

      <div
        className={`min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "flex-1" : "ml-72 w-[calc(100vw-18rem)]"
        }`}
      >
        <Suspense
          fallback={
            <div
              className={`flex h-screen flex-1 items-center justify-center ${
                theme === "dark" ? "bg-slate-950" : "bg-slate-50"
              }`}
            >
              <div className="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-purple-500" />
            </div>
          }
        >
          {currentView === "profile" ? (
            <Profile theme={theme} onBack={() => setCurrentView("board")} />
          ) : currentView === "analytics" && displayBoard ? (
            <ProjectAnalytics
              board={displayBoard}
              theme={theme}
              can={canProject}
              onBack={() => setCurrentView("board")}
            />
          ) : (
            <Board board={displayBoard} theme={theme} can={canProject} />
          )}
        </Suspense>
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
          onProjectUpdated={handleProjectUpdated}
          onClose={() => setEditingProject(null)}
          theme={theme}
        />
      )}

      {membersProject && (
        <ProjectMembersModal
          project={membersProject}
          onClose={() => setMembersProject(null)}
        />
      )}

      {membersWorkspace && (
        <WorkspaceMembersModal
          workspace={membersWorkspace}
          onClose={() => setMembersWorkspace(null)}
        />
      )}

      {rolesWorkspace && (
        <RolesModal
          workspace={rolesWorkspace}
          onClose={() => setRolesWorkspace(null)}
        />
      )}
    </div>
  );
}
