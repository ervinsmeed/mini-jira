import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { actionError } from "../../lib/actionError";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { lazy, Suspense, useEffect, useState } from "react";
import RolesModal from "../modals/RolesModal";
import Sidebar from "../workspace/Sidebar";
import Board from "../board/Board";
import { useUiStore } from "../../store/uiStore";
import CreateBoardModal from "../modals/CreateBoardModal";
import CreateWorkspaceModal from "../modals/CreateWorkspaceModal";
import EditProjectModal from "../modals/EditProjectModal";
import EditWorkspaceModal from "../modals/EditWorkspaceModal";
import ProjectMembersModal from "../modals/ProjectMembersModal";
import WorkspaceMembersModal from "../modals/WorkspaceMembersModal";
import { api } from "../../../convex/_generated/api";

const ProjectAnalytics = lazy(() => import("../analytics/ProjectAnalytics"));
const Profile = lazy(() => import("../profile/Profile"));
const AUTO_LOAD_LIMIT = 100;

export default function AuthenticatedApp() {
  const { t } = useTranslation();
  const currentBoardId = useUiStore((state) => state.currentBoardId);
  const currentWorkspaceId = useUiStore((state) => state.currentWorkspaceId);
  const selectBoard = useUiStore((state) => state.selectBoard);
  const selectWorkspace = useUiStore((state) => state.selectWorkspace);
  const currentView = useUiStore((state) => state.currentView);
  const setView = useUiStore((state) => state.setView);
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

  const theme = useUiStore((state) => state.theme);

  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
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
    api.lib.directoryQueries.workspacesPage,
    {},
    { initialNumItems: 30 },
  );

  const displayWorkspace =
    workspaces.find((workspace) => workspace._id === currentWorkspaceId) ??
    workspaces[0] ??
    null;

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
    api.lib.directoryQueries.projectsPage,
    { workspaceId: displayWorkspace?._id },
    { initialNumItems: 30 },
  );
  useEffect(() => {
    if (
      workspaces.length < AUTO_LOAD_LIMIT &&
      workspaceListStatus === "CanLoadMore"
    )
      loadWorkspaces(30);
  }, [workspaces.length, workspaceListStatus, loadWorkspaces]);
  useEffect(() => {
    if (boards.length < AUTO_LOAD_LIMIT && boardListStatus === "CanLoadMore")
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

  const deleteWorkspace = useMutation(api.workspaces.remove);

  useEffect(() => {
    if (user) {
      createUser({}).catch((error) => {
        toast.error(actionError(error, t));
      });
    }
  }, [user, createUser, t]);

  const displayBoard =
    boards.find((board) => board._id === currentBoardId) ?? boards[0] ?? null;

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

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
  }, [setSidebarCollapsed]);

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
    selectBoard(board._id);
  };

  const handleWorkspaceCreated = (workspace: Doc<"workspaces">) => {
    selectWorkspace(workspace._id);
  };

  const handleBoardSelect = (board: Doc<"boards"> | null) => {
    selectBoard(board?._id ?? null);
  };
  const handleWorkspaceSelect = (workspace: Doc<"workspaces">) => {
    selectWorkspace(workspace._id);
  };
  const handleEditWorkspace = (workspace: Doc<"workspaces">) => {
    setEditingWorkspace(workspace);
  };

  const handleEditProject = (project: Doc<"boards">) => {
    setEditingProject(project);
  };

  const handleProjectUpdated = (updatedProject: Doc<"boards">) => {
    selectBoard(updatedProject._id);
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
    const remainingWorkspaces = workspaces.filter(
      (workspace: Doc<"workspaces">) => workspace._id !== workspaceId,
    );

    await deleteWorkspace({
      id: workspaceId,
    });

    selectWorkspace(remainingWorkspaces[0]?._id ?? null);
    setEditingWorkspace(null);
  };

  if (
    workspaceListStatus === "LoadingFirstPage" ||
    boardListStatus === "LoadingFirstPage"
  ) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="size-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
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
      />

      <div
        className={`app-backdrop min-h-screen min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "flex-1" : "ml-72 w-[calc(100vw-18rem)]"
        }`}
      >
        <Suspense
          fallback={
            <div className="flex h-screen flex-1 items-center justify-center bg-background">
              <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
            </div>
          }
        >
          {currentView === "profile" ? (
            <Profile onBack={() => setView("board")} />
          ) : currentView === "analytics" && displayBoard ? (
            <ProjectAnalytics
              board={displayBoard}
              can={canProject}
              onBack={() => setView("board")}
            />
          ) : (
            <Board
              key={displayBoard?._id ?? "no-board"}
              board={displayBoard}
              can={canProject}
            />
          )}
        </Suspense>
      </div>

      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onBoardCreated={handleBoardCreated}
        workspaceId={displayWorkspace?._id}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      {editingWorkspace && (
        <EditWorkspaceModal
          key={editingWorkspace._id}
          workspace={editingWorkspace}
          onClose={() => setEditingWorkspace(null)}
        />
      )}

      {editingProject && (
        <EditProjectModal
          key={editingProject._id}
          project={editingProject}
          onProjectUpdated={handleProjectUpdated}
          onClose={() => setEditingProject(null)}
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
