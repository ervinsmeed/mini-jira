import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "../../ui/kit";

type TimerCommand = "start" | "pause" | "stop";

type TaskTimerProps = {
  task: Doc<"tasks">;
  canUpdate: boolean;
};

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function TaskTimer({ task, canUpdate }: TaskTimerProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const [pendingCommand, setPendingCommand] = useState<TimerCommand | null>(null);

  const startTimer = useMutation(api.tasks.startTimer);
  const pauseTimer = useMutation(api.tasks.pauseTimer);
  const stopTimer = useMutation(api.tasks.stopTimer);

  const isRunning = task.timerStatus === "running";

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const runningMs =
    isRunning && task.timerStartedAt !== undefined
      ? Math.max(0, now - task.timerStartedAt)
      : 0;
  const totalMs = (task.timerElapsedMs ?? 0) + runningMs;

  const runCommand = async (command: TimerCommand) => {
    if (!canUpdate || pendingCommand) return;
    const mutations = { start: startTimer, pause: pauseTimer, stop: stopTimer };

    setPendingCommand(command);
    try {
      await mutations[command]({ id: task._id });
    } catch {
      toast.error(t(`taskModal.timerErrors.${command}`));
    } finally {
      setPendingCommand(null);
    }
  };

  const disabled = !canUpdate || pendingCommand !== null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-medium text-foreground">
        {t("taskModal.timer")}
      </h4>
      <div className="rounded-lg border border-border bg-muted p-4">
        <div className="mb-4 font-mono text-2xl font-semibold sm:text-3xl">
          <p>
            {t("taskModal.totalTime")}: {formatDuration(totalMs)}
          </p>
          <p>
            {t("taskModal.sessionTime")}:{" "}
            {task.timerSessionElapsedMs === undefined
              ? t("taskModal.legacySession")
              : formatDuration(task.timerSessionElapsedMs + runningMs)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" aria-busy={pendingCommand !== null}>
          {isRunning ? (
            <Button variant="warning" disabled={disabled} onClick={() => runCommand("pause")}>
              {t("taskModal.pause")}
            </Button>
          ) : (
            <Button variant="success" disabled={disabled} onClick={() => runCommand("start")}>
              {t("taskModal.start")}
            </Button>
          )}
          <Button variant="danger" disabled={disabled} onClick={() => runCommand("stop")}>
            {t("taskModal.stop")}
          </Button>
        </div>

        {pendingCommand && (
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {t("taskModal.timerPending")}
          </p>
        )}
      </div>
    </section>
  );
}
