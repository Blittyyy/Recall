import { Image } from "expo-image";
import { useThumbnailImageSource } from "../hooks/useThumbnailImageSource";

export function RemoteThumbnailImage({
  thumbnailUrl,
  videoUrl,
  videoId,
  platform,
  style,
  contentFit = "cover",
}) {
  const { source, onError } = useThumbnailImageSource({
    thumbnailUrl,
    videoUrl,
    videoId,
    platform,
  });

  if (!source) {
    return null;
  }

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="none"
      onError={onError}
    />
  );
}
