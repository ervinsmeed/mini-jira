import type { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { Navigate, useLocation } from "react-router-dom";
import { paths } from "../../hooks/useAppRoute";

type GuardProps = {
  children: ReactNode;
};

type LocationState = {
  from?: string;
} | null;

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="size-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
    </div>
  );
}

export function RequireAuth({ children }: GuardProps) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function GuestOnly({ children }: GuardProps) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated) {
    const from = (location.state as LocationState)?.from ?? paths.home;
    return <Navigate to={from} replace />;
  }
  return children;
}
