import { SignIn } from "@clerk/clerk-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="flex items-center justify-center size-12 bg-purple-500 rounded text-white font-bold text-lg">
            !!!
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Kanban</h1>
        </div>
        <h2 className="text-3xl font-semibold text-slate-100 mb-2">
          Welcome to your task management workspace
        </h2>
        <p className="text-slate-400">
          Organize your projects with powerful Kanban boards
        </p>
      </div>
      <div className="p-4 border border-slate-800 rounded-xl">
        <SignIn />
      </div>
    </div>
  );
}
