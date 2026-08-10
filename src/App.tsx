import { Authenticated, Unauthenticated } from "convex/react";
import AuthenticatedApp from "./components/AuthenticatedApp";
import { Toaster } from "sonner";
import AuthPage from "./components/AuthPage"; // проверь точный путь к файлу!
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
