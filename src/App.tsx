import { Authenticated, Unauthenticated } from "convex/react";
import AuthenticatedApp from "./components/layout/AuthenticatedApp";
import { Toaster } from "sonner";
import AuthPage from "./components/auth/AuthPage";
export default function App() {
  return (
    <>
      <Authenticated>
        <AuthenticatedApp />
        <Toaster richColors />
      </Authenticated>

      <Unauthenticated>
        <AuthPage />
      </Unauthenticated>
    </>
  );
}
