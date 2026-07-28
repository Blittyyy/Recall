import { create } from "zustand";

export const useSuccessToastStore = create((set) => ({
  visible: false,
  title: "",
  subtitle: "",
  showSuccessToast: ({ title, subtitle = "" } = {}) => {
    const nextTitle = typeof title === "string" ? title.trim() : "";
    if (!nextTitle) {
      return;
    }

    set({
      visible: true,
      title: nextTitle,
      subtitle: typeof subtitle === "string" ? subtitle.trim() : "",
    });
  },
  hideSuccessToast: () =>
    set({
      visible: false,
      title: "",
      subtitle: "",
    }),
}));

export function showSuccessToast(options) {
  useSuccessToastStore.getState().showSuccessToast(options);
}
