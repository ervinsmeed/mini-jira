import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Id } from "../../convex/_generated/dataModel";

type Theme = "light" | "dark";

type UiState = {
  theme: Theme;
  sidebarCollapsed: boolean;
  currentWorkspaceId: Id<"workspaces"> | null;

  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  selectWorkspace: (id: Id<"workspaces"> | null) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      sidebarCollapsed: false,
      currentWorkspaceId: null,

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      selectWorkspace: (id) => set({ currentWorkspaceId: id }),
    }),
    {
      name: "kanban-ui",
      partialize: (state) => ({
        theme: state.theme,
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    },
  ),
);
