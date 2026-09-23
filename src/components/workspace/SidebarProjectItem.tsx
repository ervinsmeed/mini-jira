import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Star, Trash2, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type SidebarProjectItemProps = {
  board: Doc<"boards"> & { taskCount?: number };
  isFavorite: boolean;
  isCollapsed: boolean;
  currentBoard: Doc<"boards"> | null;
  onBoardSelect: (board: Doc<"boards"> | null) => void;
  onEditProject: (board: Doc<"boards">) => void;
  onProjectMembers: (board: Doc<"boards">) => void;
  showDeleteConfirm: Id<"boards"> | null;
  setShowDeleteConfirm: Dispatch<SetStateAction<Id<"boards"> | null>>;
  handleDeleteBoard: (id: Id<"boards">) => Promise<void>;
  handleToggleFavorite: (board: Doc<"boards">) => Promise<void>;
};
export default function SidebarProjectItem({
  board,
  isFavorite,
  currentBoard,
  onBoardSelect,
  onProjectMembers,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDeleteBoard,
  isCollapsed,
  onEditProject,
  handleToggleFavorite,
}: SidebarProjectItemProps) {
  const { t } = useTranslation();
  const projectAccess = useQuery(api.boards.getCurrentAccess, {
    boardId: board._id,
  });
  const canEditProject = Boolean(
    projectAccess?.isOwner ||
    projectAccess?.permissions.includes("project.update"),
  );
  const canDeleteProject = Boolean(
    projectAccess?.isOwner ||
    projectAccess?.permissions.includes("project.delete"),
  );
  const canReorder: boolean = Boolean(
    projectAccess?.isOwner ||
    projectAccess?.permissions.includes("project.update"),
  );
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: board._id,
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(" ");
    return words.length > 1
      ? words
          .map((w: string) => w[0])
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
          className={`size-10 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${currentBoard?._id === board._id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"}`}
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
      className={`group w-full flex items-center justify-between px-2 py-2 rounded-lg transition-colors ${
        currentBoard?._id === board._id
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
      }`}
    >
      <button
        onClick={() => onBoardSelect(board)}
        title={board.name}
        className="flex min-w-0 items-center gap-2 flex-1"
      >
        {canReorder && (
          <div
            {...attributes}
            {...listeners}
            aria-label={t("sidebar.moveProject")}
            className="cursor-grab active:cursor-grabbing inline-flex"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 text-left">
          <div className="text-sm font-medium truncate">{board.name}</div>

          <div className="text-[10px] opacity-70">
            {t(`editProjectModal.${board.status ?? "active"}`)}
            {board.taskCount !== undefined &&
              ` · ${t("sidebar.taskCount", { count: board.taskCount })}`}
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
        title={t(isFavorite ? "favorites.remove" : "favorites.add")}
        aria-label={t(isFavorite ? "favorites.remove" : "favorites.add")}
      >
        <Star
          className={`size-3.5 transition-colors ${
            isFavorite
              ? "fill-warning text-warning"
              : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onProjectMembers(board);
        }}
        className="relative z-10 shrink-0 rounded p-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        title={t("members.projectTitle")}
      >
        <Users className="size-3.5" />
      </button>

      {canEditProject && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEditProject(board);
          }}
          className="relative z-10 shrink-0 rounded p-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          title={t("sidebar.editProject")}
        >
          <Pencil className="size-3.5" />
        </button>
      )}
      {canDeleteProject &&
        (showDeleteConfirm === board._id ? (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                const confirmation = window.prompt(
                  t("sidebar.deleteProjectPrompt", { name: board.name }),
                );

                if (confirmation === null) {
                  return;
                }

                if (confirmation.trim() !== board.name.trim()) {
                  window.alert(t("sidebar.projectMismatch"));
                  return;
                }

                void handleDeleteBoard(board._id);
              }}
              className="p-1 text-xs text-destructive hover:text-destructive"
            >
              {t("common.yes")}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowDeleteConfirm(null);
              }}
              className="p-1"
            >
              {t("common.no")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(board._id)}
            aria-label={t("sidebar.deleteProject")}
            title={t("sidebar.deleteProject")}
            className="opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 p-1 hover:text-destructive transition-all"
          >
            <Trash2 className="size-3" />
          </button>
        ))}
    </div>
  );
}
