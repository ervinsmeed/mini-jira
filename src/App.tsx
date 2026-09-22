import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import AuthPage from "./components/auth/AuthPage";
import { GuestOnly, RequireAuth } from "./components/auth/RouteGuards";
import AuthenticatedApp from "./components/layout/AuthenticatedApp";
import { paths } from "./hooks/useAppRoute";

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path={paths.login}
          element={
            <GuestOnly>
              <AuthPage />
            </GuestOnly>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedApp />
            </RequireAuth>
          }
        />
      </Routes>
      <Toaster richColors />
    </>
  );
}
