import { useCallback, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SuccessToast } from "./SuccessToast";
import { useSuccessToastStore } from "../store/useSuccessToastStore";

const TAB_BAR_CLEARANCE = 70;

export function SuccessToastHost() {
  const insets = useSafeAreaInsets();
  const visible = useSuccessToastStore((state) => state.visible);
  const title = useSuccessToastStore((state) => state.title);
  const subtitle = useSuccessToastStore((state) => state.subtitle);
  const hideSuccessToast = useSuccessToastStore((state) => state.hideSuccessToast);

  useEffect(() => {
    if (!visible) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => null,
    );
  }, [visible, title, subtitle]);

  const handleDismissed = useCallback(() => {
    hideSuccessToast();
  }, [hideSuccessToast]);

  return (
    <SuccessToast
      visible={visible}
      title={title}
      subtitle={subtitle}
      bottomOffset={Math.max(insets.bottom, 10) + TAB_BAR_CLEARANCE}
      onDismissed={handleDismissed}
    />
  );
}
