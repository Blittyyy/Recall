import { Redirect, useLocalSearchParams } from "expo-router";

export default function SaveImportRoute() {
  const params = useLocalSearchParams();
  const url = Array.isArray(params.url) ? params.url[0] : params.url;

  return (
    <Redirect
      href={{
        pathname: "/(tabs)/add",
        params: url ? { url } : undefined,
      }}
    />
  );
}
