import { useRouter } from "expo-router";
import { RecallWhatsNextScreen } from "../components/RecallWhatsNextScreen";

export default function WhatsNextPreviewScreen() {
  const router = useRouter();

  return (
    <RecallWhatsNextScreen
      onContinue={async () => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace("/(tabs)");
      }}
    />
  );
}
