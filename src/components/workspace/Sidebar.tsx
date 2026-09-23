import { useAction } from "../../hooks/useAction";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import SidebarProjectItem from "./SidebarProjectItem";
import { useState } from "react";
import {
  Sun,
  Moon,
  EyeOff,
  Trash2,
  LogOut,
  SidebarIcon,
  Pencil,
  Users,
  Shield,
  BarChart3,
  UserRound,
} from "lucide-react";
import { useMutation } from "convex/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { api } from "../../../convex/_generated/api";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SignOutButton } from "@clerk/clerk-react";
import { useUiStore } from "../../store/uiStore";
import { useAppRoute, type View } from "../../hooks/useAppRoute";

type SidebarProps = {
  currentBoard: Doc<"boards"> | null;
  boards: (Doc<"boards"> & { isFavorite: boolean })[];
  boardListStatus: string;
  onLoadBoards: () => void;
  onBoardSelect: (board: Doc<"boards"> | null) => void;
  onCreateBoard: () => void;
  currentWorkspace: Doc<"workspaces"> | null;
  workspaces?: Doc<"workspaces">[];
  workspaceListStatus: string;
  onLoadWorkspaces: () => void;
  onWorkspaceSelect: (workspace: Doc<"workspaces">) => void;
  onCreateWorkspace: () => void;
  onEditWorkspace: (workspace: Doc<"workspaces">) => void;
  onWorkspaceMembers: (workspace: Doc<"workspaces">) => void;
  onDeleteWorkspace: (id: Id<"workspaces">) => Promise<void>;
  onWorkspaceRoles: (workspace: Doc<"workspaces">) => void;
  onEditProject: (board: Doc<"boards">) => void;
  onProjectMembers: (board: Doc<"boards">) => void;
  canViewAnalytics: boolean;
  can: (permission: string) => boolean;
};

export default function Sidebar({
  currentBoard,
  boards,
  boardListStatus,
  onLoadBoards,
  onBoardSelect,
  onCreateBoard,
  currentWorkspace,
  workspaces = [],
  workspaceListStatus,
  onLoadWorkspaces,
  onWorkspaceSelect,
  onCreateWorkspace,
  onEditWorkspace,
  onWorkspaceMembers,
  onDeleteWorkspace,
  onWorkspaceRoles,
  onEditProject,
  onProjectMembers,
  canViewAnalytics,
  can,
}: SidebarProps) {
  const { currentView, openView } = useAppRoute();
  const onViewChange = (view: View) =>
    openView(view, currentBoard?._id ?? null);
  const theme = useUiStore((state) => state.theme);
  const onThemeToggle = useUiStore((state) => state.toggleTheme);
  const isCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const onToggleCollapsed = useUiStore((state) => state.toggleSidebar);
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState<Id<"boards"> | null>(null);
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] =
    useState<Id<"workspaces"> | null>(null);
  const deleteBoard = useMutation(api.boards.remove);
  const updateBoardOrder = useMutation(api.boards.updateOrder);

  const toggleProjectFavorite = useMutation(api.favorites.toggleProject);

  const favoriteProjectIdSet = new Set(
    boards.filter((board) => board.isFavorite).map((board) => board._id),
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDeleteBoard = async (boardId: Id<"boards">) => {
    await run(async () => {
      await deleteBoard({ id: boardId });
      setShowDeleteConfirm(null);

      if (currentBoard?._id === boardId) {
        const remainingBoards = boards.filter((b) => b._id !== boardId);

        if (remainingBoards.length > 0) {
          onBoardSelect(remainingBoards[0]);
        } else {
          onBoardSelect(null);
        }
      }
    });
  };

  const handleToggleFavorite = async (board: Doc<"boards">) => {
    await run(async () => {
      await toggleProjectFavorite({
        boardId: board._id,
      });
    });
  };
  const { t, i18n } = useTranslation();
  const { pending, run } = useAction();

  const handleDragEnd = async (event: DragEndEvent) => {
    await run(async () => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = boards.findIndex((board) => board._id === active.id);
      const newIndex = boards.findIndex((board) => board._id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      await updateBoardOrder({
        boardId: boards[oldIndex]._id,
        newOrder: boards[newIndex].order,
        anchorId: boards[newIndex]._id,
        after: oldIndex < newIndex,
      });
    });
  };
  if (isCollapsed) {
    return (
      <div
        data-theme={theme}
        className="app-sidebar w-16 flex flex-col items-center py-4 border-r transition-colors bg-sidebar text-sidebar-foreground border-sidebar-border"
      >
        <div className="flex flex-col items-center space-y-4 flex-1">
          <div className="flex items-center justify-center size-10 bg-sidebar-primary rounded-lg text-sidebar-primary-foreground font-bold text-sm">
            |||
          </div>
          <div className="flex flex-col items-center space-y-2 flex-1 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={pending ? undefined : handleDragEnd}
            >
              <SortableContext
                items={boards.map((b: Doc<"boards">) => b._id)}
                strategy={verticalListSortingStrategy}
              >
                {boards.map((board) => (
                  <SidebarProjectItem
                    key={board._id}
                    board={board}
                    isFavorite={favoriteProjectIdSet.has(board._id)}
                    currentBoard={currentBoard}
                    onBoardSelect={onBoardSelect}
                    onEditProject={onEditProject}
                    onProjectMembers={onProjectMembers}
                    handleToggleFavorite={handleToggleFavorite}
                    showDeleteConfirm={showDeleteConfirm}
                    setShowDeleteConfirm={setShowDeleteConfirm}

                    handleDeleteBoard={handleDeleteBoard}
                    isCollapsed={true}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {boardListStatus === "CanLoadMore" && (
              <button
                type="button"
                className="max-w-full whitespace-normal p-2"
                onClick={onLoadBoards}
              >
                {t("pagination.loadMore")}
              </button>
            )}
          </div>

          {currentBoard && canViewAnalytics && (
            <button
              type="button"
              onClick={() => onViewChange("analytics")}
              className={`flex size-10 items-center justify-center rounded transition-colors ${
                currentView === "analytics"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
              }`}
              title={t("navigation.analytics")}
            >
              <BarChart3 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onViewChange("profile")}
            className={`flex size-10 items-center justify-center rounded transition-colors ${
              currentView === "profile"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
            }`}
            title={t("navigation.profile")}
          >
            <UserRound className="size-4" />
          </button>
        </div>

        <button
          onClick={onToggleCollapsed}
          aria-label={t(isCollapsed ? "sidebar.expand" : "hideSidebar")}
          className="p-2 transition-colors text-sidebar-foreground hover:text-sidebar-accent-foreground"
        >
          <SidebarIcon className={"size-4"} />
        </button>
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      className="app-sidebar w-72 flex flex-col h-screen fixed left-0 top-0 z-40 border-r transition-colors bg-sidebar text-sidebar-foreground border-sidebar-border"
    >
      <div className="px-4 py-4 border-b transition-colors border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center size-8 bg-sidebar-primary rounded-lg text-sidebar-primary-foreground font-bold text-sm">
            |||
          </div>

          <h1 className="text-xl font-bold transition-colors text-sidebar-foreground">
            {t("kanban")}
          </h1>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3 py-4 overflow-y-auto">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-sidebar-foreground">
            {t("navigation.workspaces")} ({workspaces.length})
          </div>

          <button
            type="button"
            onClick={onCreateWorkspace}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg border border-sidebar-border transition-colors mb-3 bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover"
          >
            <span className="text-sm font-medium">
              {t("createWorkspaceModal.title")}
            </span>
          </button>

          <div className="space-y-1">
            {workspaceListStatus === "CanLoadMore" && (
              <button type="button" className="p-2" onClick={onLoadWorkspaces}>
                {t("pagination.loadMore")}
              </button>
            )}
            {workspaces.map((workspace: Doc<"workspaces">) => (
              <div
                key={workspace._id}
                className={`group flex w-full items-center rounded-lg transition-colors ${
                  currentWorkspace?._id === workspace._id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onWorkspaceSelect(workspace)}
                  title={workspace.name}
                  className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm font-medium"
                >
                  {workspace.name}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onWorkspaceMembers(workspace);
                  }}
                  className="relative z-10 shrink-0 rounded p-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  title={t("members.workspaceTitle")}
                >
                  <Users className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onWorkspaceRoles(workspace);
                  }}
                  className="relative z-10 shrink-0 rounded p-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  title={t("roles.title")}
                >
                  <Shield className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    onEditWorkspace(workspace);
                  }}
                  className="relative z-10 mr-1 shrink-0 rounded p-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  title={t("sidebar.editWorkspace")}
                >
                  <Pencil className="size-3.5" />
                </button>

                {showDeleteWorkspaceConfirm === workspace._id ? (
                  <div className="mr-2 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        const confirmation = window.prompt(
                          t("sidebar.deleteWorkspacePrompt", {
                            name: workspace.name,
                          }),
                        );

                        if (confirmation === null) {
                          return;
                        }

                        if (confirmation.trim() !== workspace.name.trim()) {
                          window.alert(t("sidebar.workspaceMismatch"));
                          return;
                        }

                        void run(async () => {
                          await onDeleteWorkspace(workspace._id);
                          setShowDeleteWorkspaceConfirm(null);
                        });
                      }}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      {t("common.yes")}
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowDeleteWorkspaceConfirm(null);
                      }}
                      className="text-xs"
                    >
                      {t("common.no")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowDeleteWorkspaceConfirm(workspace._id);
                    }}
                    className="relative z-10 mr-1 shrink-0 rounded p-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-destructive"
                    title={t("sidebar.deleteWorkspace")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-4 transition-colors text-sidebar-foreground">
          {t("allBoards")} ({boards.length})
        </div>
        {can("project.create") && (
          <button
            onClick={onCreateBoard}
            className="w-full flex items-center justify-center space-x-3 px-3 py-2 rounded-lg border border-sidebar-border transition-colors mb-3 bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover"
          >
            <span className="text-sm font-medium">{t("createBoard")}</span>
          </button>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={pending ? undefined : handleDragEnd}
        >
          <div className="space-y-2">
            <SortableContext
              items={boards.map((b) => b._id)}
              strategy={verticalListSortingStrategy}
            >
              {boards.map((board) => (
                <SidebarProjectItem
                  key={board._id}
                  board={board}
                  isFavorite={favoriteProjectIdSet.has(board._id)}
                  currentBoard={currentBoard}
                  onBoardSelect={onBoardSelect}
                  onProjectMembers={onProjectMembers}
                  showDeleteConfirm={showDeleteConfirm}
                  handleToggleFavorite={handleToggleFavorite}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  handleDeleteBoard={handleDeleteBoard}

                  isCollapsed={false}
                  onEditProject={onEditProject}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
        {boardListStatus === "CanLoadMore" && (
          <button
            type="button"
            className="max-w-full whitespace-normal p-2"
            onClick={onLoadBoards}
          >
            {t("pagination.loadMore")}
          </button>
        )}

        {currentBoard && canViewAnalytics && (
          <button
            type="button"
            onClick={() => onViewChange("analytics")}
            className={`mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              currentView === "analytics"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
            }`}
          >
            <BarChart3 className="size-4" />
            <span>{t("navigation.analytics")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onViewChange("profile")}
          className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            currentView === "profile"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
          }`}
        >
          <UserRound className="size-4" />
          <span>{t("navigation.profile")}</span>
        </button>
      </div>

      <div className="flex items-center justify-center space-x-2 rounded-lg p-2 transition-colors bg-sidebar-hover">
        <Sun className="size-4 text-sidebar-foreground" />

        <button
          onClick={onThemeToggle}
          role="switch"
          aria-checked={theme === "dark"}
          aria-label={t(theme === "dark" ? "sidebar.light" : "sidebar.dark")}
          title={t(theme === "dark" ? "sidebar.light" : "sidebar.dark")}
          className="relative w-12 h-6 bg-sidebar-primary rounded-full transition-colors"
        >
          <div
            className={`absolute size-5 bg-sidebar-primary-foreground rounded-full top-0.5 transition-transform ${
              theme === "dark"
                ? "transform translate-x-6"
                : "transform translate-x-0.5"
            }`}
          />
        </button>

        <Moon className="size-4 text-sidebar-foreground" />
      </div>

      <div className="flex items-center justify-center gap-2 px-2 py-2 text-sidebar-foreground">
        <button
          onClick={() => i18n.changeLanguage("en")}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            i18n.resolvedLanguage?.startsWith("en")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "bg-sidebar hover:bg-sidebar-hover"
          }`}
        >
          English
        </button>
        <button
          onClick={() => i18n.changeLanguage("ru")}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            i18n.resolvedLanguage?.startsWith("ru")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "bg-sidebar hover:bg-sidebar-hover"
          }`}
        >
          Русский
        </button>
      </div>

      <button
        onClick={onToggleCollapsed}
        className="flex items-center space-x-3 px-2 py-1 transition-colors text-sidebar-foreground hover:text-sidebar-accent-foreground"
      >
        <EyeOff className="size-4" />
        <span className="text-sm font-medium">{t("hideSidebar")}</span>
      </button>

      <SignOutButton>
        <button
          type="button"
          className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          <span className="text-sm font-medium">{t("logout")}</span>
        </button>
      </SignOutButton>
    </div>
  );
}
