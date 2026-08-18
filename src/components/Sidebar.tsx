import { useState } from "react";

import {
  Sun,
  Moon,
  EyeOff,
  Trash2,
  GripVertical,
  LogOut,
  SidebarIcon,
  Pencil,
  Star,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SignOutButton } from "@clerk/clerk-react";
export default function Sidebar({
  currentBoard,
  onBoardSelect,
  onCreateBoard,
  currentWorkspace,
  workspaces = [],
  onWorkspaceSelect,
  onCreateWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
  onEditProject,
  theme,
  onThemeToggle,
  isCollapsed,
  onToggleCollapsed,
}: any) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] =
    useState(null);
  const allBoardsResult = useQuery(api.boards.list);

  const workspaceBoardsResult = useQuery(
    api.boards.listByWorkspace,
    currentWorkspace?._id
      ? {
          workspaceId: currentWorkspace._id,
        }
      : "skip",
  );

  const boards: any[] = ((currentWorkspace?._id
    ? workspaceBoardsResult
    : allBoardsResult) ?? []) as any[];
  const deleteBoard = useMutation(api.boards.remove);
  const updateBoardOrder = useMutation(api.boards.updateOrder);
  const updateProject = useMutation(api.boards.update);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDeleteBoard = async (boardId: any) => {
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
  };

  const handleToggleFavorite = async (board: any) => {
    await updateProject({
      id: board._id,
      favorite: !board.favorite,
    });
  };
  const { t, i18n } = useTranslation();

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = boards.findIndex((board) => board._id === active.id);
      const newIndex = boards.findIndex((board) => board._id === over.id);

      const reorderBoards = arrayMove(boards, oldIndex, newIndex);

      for (let i = 0; i < reorderBoards.length; i++) {
        await updateBoardOrder({
          boardId: reorderBoards[i]._id,
          newOrder: i,
        });
      }
    }
  };
  if (isCollapsed) {
    return (
      <div
        className={`w-16 flex flex-col items-center py-4 border-r transition-colors ${
          theme === "dark"
            ? "bg-slate-950 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col items-center space-y-4 flex-1">
          <div className="flex items-center justify-center size-10 bg-purple-500 rounded text-white font-bold text-sm">
            |||
          </div>
          <div className="flex flex-col items-center space-y-2 flex-1 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={boards.map((b: any) => b._id)}
                strategy={verticalListSortingStrategy}
              >
                {boards.map((board: any) => (
                  <SortableBoardItem
                    key={board._id}
                    board={board}
                    currentBoard={currentBoard}
                    onBoardSelect={onBoardSelect}
                    onEditProject={onEditProject}
                    handleToggleFavorite={handleToggleFavorite}
                    showDeleteConfirm={showDeleteConfirm}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    handleDeleteBoard={handleDeleteBoard}
                    isCollapsed={true}
                    theme={theme}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
        <button
          onClick={onToggleCollapsed}
          className={`p-2 transition-colors ${
            theme === "dark"
              ? "text-slate-400 hover:text-slate-100"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <SidebarIcon className={"size-4"} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-72 flex flex-col h-screen fixed left-0 top-0 z-40 border-r transition-colors ${
        theme === "dark"
          ? "bg-slate-950 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`p-6 border-b transition-colors ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center size-8 bg-purple-500 rounded text-white font-bold text-sm">
            |||
          </div>

          <h1
            className={`text-xl font-bold transition-colors ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}
          >
            {t("kanban")}
          </h1>
        </div>
      </div>
      {/* Boards */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Workspaces */}
        <div className="mb-6">
          <div
            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Workspaces ({workspaces.length})
          </div>

          <button
            type="button"
            onClick={onCreateWorkspace}
            className={`w-full flex items-center justify-center p-3 rounded-r-full transition-all mb-2 shadow-sm ${
              theme === "dark"
                ? "bg-slate-900 text-slate-100 hover:bg-slate-800"
                : "bg-slate-100 text-slate-900 hover:bg-slate-200"
            }`}
          >
            <span className="font-semibold">
              {t("createWorkspaceModal.title")}
            </span>
          </button>

          <div className="space-y-1">
            {workspaces.map((workspace: any) => (
              <div
                key={workspace._id}
                className={`group flex w-full items-center rounded-r-full transition-colors ${
                  currentWorkspace?._id === workspace._id
                    ? "bg-purple-500 text-white"
                    : theme === "dark"
                      ? "text-slate-400 hover:bg-purple-600/20 hover:text-slate-100"
                      : "text-slate-600 hover:bg-purple-100 hover:text-slate-900"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onWorkspaceSelect(workspace)}
                  className="min-w-0 flex-1 truncate px-4 py-2 text-left text-sm font-medium"
                >
                  {workspace.name}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    console.log("EDIT WORKSPACE:", workspace);
                    onEditWorkspace(workspace);
                  }}
                  className="relative z-10 mr-3 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Edit Workspace"
                >
                  <Pencil className="size-3.5" />
                </button>

                {showDeleteWorkspaceConfirm === workspace._id ? (
                  <div className="mr-2 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteWorkspace(workspace._id);
                        setShowDeleteWorkspaceConfirm(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-500"
                    >
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowDeleteWorkspaceConfirm(null);
                      }}
                      className="text-xs"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowDeleteWorkspaceConfirm(workspace._id);
                    }}
                    className="relative z-10 mr-3 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                    title="Delete Workspace"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          className={`text-xs font-semibold uppercase tracking-wider mb-4 transition-colors ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
        >
          {t("allBoards")} ({boards.length})
        </div>

        <button
          onClick={onCreateBoard}
          className={`w-full flex items-center justify-center space-x-3 p-3 rounded-r-full transition-all mb-2 shadow-sm ${theme === "dark" ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-purple-500 text-white hover:bg-purple-600"}`}
        >
          <span className="font-semibold">{t("createBoard")}</span>
        </button>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            <SortableContext
              items={boards.map((b: any) => b._id)}
              strategy={verticalListSortingStrategy}
            >
              {boards.map((board: any) => (
                <SortableBoardItem
                  key={board._id}
                  board={board}
                  currentBoard={currentBoard}
                  onBoardSelect={onBoardSelect}
                  showDeleteConfirm={showDeleteConfirm}
                  handleToggleFavorite={handleToggleFavorite}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  handleDeleteBoard={handleDeleteBoard}
                  isCollapsed={false}
                  onEditProject={onEditProject}

                  theme={theme}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>
      <div
        className={`flex items-center justify-center space-x-2 rounded-lg p-2 transition-colors ${
          theme === "dark" ? "bg-slate-900" : "bg-slate-100"
        }`}
      >
        <Sun
          className={`size-4 ${
            theme === "light" ? "text-purple-500" : "text-slate-400"
          }`}
        />

        <button
          onClick={onThemeToggle}
          className="relative w-12 h-6 bg-purple-500 rounded-full transition-colors"
        >
          <div
            className={`absolute size-5 bg-white rounded-full top-0.5 transition-transform ${
              theme === "dark"
                ? "transform translate-x-6"
                : "transform translate-x-0.5"
            }`}
          />
        </button>

        <Moon
          className={`size-4 ${
            theme === "dark" ? "text-purple-500" : "text-slate-400"
          }`}
        />
      </div>

      <div
        className={`flex items-center justify-center gap-2 px-2 py-2 ${
          theme === "dark" ? "text-slate-300" : "text-slate-700"
        }`}
      >
        <button
          onClick={() => i18n.changeLanguage("en")}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            i18n.resolvedLanguage?.startsWith("en")
              ? "bg-purple-500 text-white"
              : theme === "dark"
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-100 hover:bg-slate-200"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => i18n.changeLanguage("ru")}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            i18n.resolvedLanguage?.startsWith("ru")
              ? "bg-purple-500 text-white"
              : theme === "dark"
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-100 hover:bg-slate-200"
          }`}
        >
          RU
        </button>
      </div>

      <button
        onClick={onToggleCollapsed}
        className={`flex items-center space-x-3 px-2 py-1 transition-colors ${theme === "dark" ? "text-slate-400 hover:text-slate-100" : "text-slate-500 hover:text-slate-900"}`}
      >
        <EyeOff className="size-4" />
        <span className="text-sm font-medium">{t("hideSidebar")}</span>
      </button>

      <SignOutButton>
        <div
          className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
            theme === "dark"
              ? "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <LogOut className="size-4" />
          <span className="text-sm font-medium">{t("logout")}</span>
        </div>
      </SignOutButton>
    </div>
  );
}

function SortableBoardItem({
  board,
  currentBoard,
  onBoardSelect,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDeleteBoard,
  isCollapsed,
  onEditProject,
  handleToggleFavorite,
  theme,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: board._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getInitials = (name: any) => {
    const words = name.trim().split(" ");
    return words.length > 1
      ? words
          .map((w: any) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  if (isCollapsed) {
    return (
      <div ref={setNodeRef} style={style} className="mb-2 px-4">
        <button
          onClick={() => onBoardSelect(board)}
          className={`size-10 flex items-center justify-center text-xs font-bold transition-colors ${currentBoard?._id === board._id ? "bg-purple-500 text-white" : theme === "dark" ? "bg-slate-900 text-slate-300 hover:bg-purple-600 hover:text-white" : "bg-slate-100 text-slate-700 hover:bg-purple-600 hover:text-white"}`}
          title={board.name}
        >
          {getInitials(board.name)}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group w-full flex items-center justify-between px-4 py-3 rounded-r-full transition-colors ${
        currentBoard?._id === board._id
          ? "bg-purple-500 text-white"
          : theme === "dark"
            ? "text-slate-400 hover:text-slate-100 hover:bg-purple-600/20"
            : "text-slate-500 hover:text-slate-900 hover:bg-purple-100"
      }`}
    >
      <button
        onClick={() => onBoardSelect(board)}
        className="flex items-center space-x-3 flex-1"
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="font-medium truncate">{board.name}</div>

          <div className="text-[10px] opacity-70">
            {t(`editProjectModal.${board.status ?? "active"}`)}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleToggleFavorite(board);
        }}
        className="relative z-10 shrink-0 rounded p-1"
        title="Favorite Project"
      >
        <Star
          className={`size-3.5 ${
            board.favorite ? "fill-yellow-400 text-yellow-400" : ""
          }`}
        />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEditProject(board);
        }}
        className="relative z-10 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
        title="Edit Project"
      >
        <Pencil className="size-3.5" />
      </button>
      {showDeleteConfirm === board._id ? (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleDeleteBoard(board._id)}
            className="p-1 text-red-400 hover:text-red-500 text-xs"
          >
            Yes
          </button>
          <button onClick={() => setShowDeleteConfirm(null)} className="p-1">
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(board._id)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}
