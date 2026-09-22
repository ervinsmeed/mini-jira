import { useMatch, useNavigate } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";

export type View = "board" | "analytics" | "profile";

export const paths = {
  home: "/",
  login: "/login",
  profile: "/profile",
  project: (projectId: string) => `/projects/${projectId}`,
  analytics: (projectId: string) => `/projects/${projectId}/analytics`,
};

export function useAppRoute() {
  const navigate = useNavigate();
  const projectMatch = useMatch("/projects/:projectId/*");
  const isAnalytics = useMatch("/projects/:projectId/analytics") !== null;
  const isProfile = useMatch(paths.profile) !== null;

  const projectId = (projectMatch?.params.projectId ?? null) as Id<"boards"> | null;
  const currentView: View = isProfile ? "profile" : isAnalytics ? "analytics" : "board";

  const openBoard = (boardId: Id<"boards"> | null) => {
    navigate(boardId ? paths.project(boardId) : paths.home);
  };

  const openView = (view: View, boardId: Id<"boards"> | null) => {
    if (view === "profile") navigate(paths.profile);
    else if (view === "analytics" && boardId) navigate(paths.analytics(boardId));
    else openBoard(boardId);
  };

  return { navigate, projectId, currentView, openBoard, openView };
}
