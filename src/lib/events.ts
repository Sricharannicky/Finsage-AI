// Global Event Bus for real-time data sync across all views and widgets
export const DATA_CHANGED_EVENT = "finsage:data-changed";

export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}
