import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Id } from "../../convex/_generated/dataModel";

type Theme = "light" | "dark";
type View = "board" | "analytics" | "profile";

type UiState = {
  theme: Theme;
  sidebarCollapsed: boolean;
  currentView: View;
  currentWorkspaceId: Id<"workspaces"> | null;
  currentBoardId: Id<"boards"> | null;

  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setView: (view: View) => void;
  selectWorkspace: (id: Id<"workspaces"> | null) => void;
  selectBoard: (id: Id<"boards"> | null) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      sidebarCollapsed: false,
      currentView: "board",
      currentWorkspaceId: null,
      currentBoardId: null,

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setView: (view) => set({ currentView: view }),
      selectWorkspace: (id) =>
        set({
          currentWorkspaceId: id,
          currentBoardId: null,
          currentView: "board",
        }),
      selectBoard: (id) => set({ currentBoardId: id, currentView: "board" }),
    }),
    {
      name: "kanban-ui",
      partialize: (state) => ({
        theme: state.theme,
        currentWorkspaceId: state.currentWorkspaceId,
        currentBoardId: state.currentBoardId,
      }),
    },
  ),
);
