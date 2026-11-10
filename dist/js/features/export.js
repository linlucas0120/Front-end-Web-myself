import { getState } from "../core/store.js?v=branch-2";
import { toast } from "../components/notifications.js?v=branch-2";
export function exportProgress() {
  const blob = new Blob(
    [
      JSON.stringify(
        { exportedAt: new Date().toISOString(), attempts: getState().attempts },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "金庫防爆特攻隊-練習紀錄.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  toast("練習紀錄已匯出");
}
