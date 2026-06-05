import { getSupabaseClient } from "./supabaseClient";
import { normalizeVideoUrlForSave } from "../utils/urlHelpers";

function isDuplicateSavedVideoError(error: any) {
  const message = error?.message ?? "";

  return (
    error?.code === "23505" ||
    message.includes("saved_videos_user_video_url_unique_idx") ||
    message.includes("duplicate key value violates unique constraint")
  );
}

function toSavedVideoInsert(userId: string, video: any) {
  return {
    user_id: userId,
    title: video.title ?? "Saved Video",
    creator: video.creator ?? "Unknown creator",
    platform: video.platform ?? null,
    video_url: normalizeSavedVideoUrl(video.videoUrl),
    thumbnail_url: video.thumbnailUrl ?? null,
    category: video.category ?? null,
    saved_at: video.savedAt ?? new Date().toISOString(),
    last_opened_at: video.lastOpenedAt ?? null,
    revisit_count: video.revisitCount ?? 0,
    archived: video.archived ?? false,
    dismissed_from_resurfacing_until:
      video.dismissedFromResurfacingUntil ?? null,
  };
}

function toSavedVideoUpdate(updates: any) {
  const payload: Record<string, any> = {};

  if (Object.hasOwn(updates, "title")) payload.title = updates.title;
  if (Object.hasOwn(updates, "creator")) payload.creator = updates.creator;
  if (Object.hasOwn(updates, "platform")) payload.platform = updates.platform;
  if (Object.hasOwn(updates, "videoUrl")) {
    payload.video_url = normalizeSavedVideoUrl(updates.videoUrl);
  }
  if (Object.hasOwn(updates, "thumbnailUrl")) {
    payload.thumbnail_url = updates.thumbnailUrl;
  }
  if (Object.hasOwn(updates, "category")) payload.category = updates.category;
  if (Object.hasOwn(updates, "savedAt")) payload.saved_at = updates.savedAt;
  if (Object.hasOwn(updates, "lastOpenedAt")) {
    payload.last_opened_at = updates.lastOpenedAt;
  }
  if (Object.hasOwn(updates, "revisitCount")) {
    payload.revisit_count = updates.revisitCount;
  }
  if (Object.hasOwn(updates, "archived")) payload.archived = updates.archived;
  if (Object.hasOwn(updates, "dismissedFromResurfacingUntil")) {
    payload.dismissed_from_resurfacing_until =
      updates.dismissedFromResurfacingUntil;
  }

  return payload;
}

function normalizeSavedVideoUrl(videoUrl: string) {
  return normalizeVideoUrlForSave(videoUrl) ?? videoUrl?.trim?.() ?? videoUrl;
}

export async function fetchSavedVideos({
  accessToken,
  userId,
}: {
  accessToken?: string | null;
  userId: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("saved_videos")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function findSavedVideoByUrl({
  accessToken,
  userId,
  videoUrl,
}: {
  accessToken?: string | null;
  userId: string;
  videoUrl: string;
}) {
  const normalizedVideoUrl = normalizeSavedVideoUrl(videoUrl);
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("saved_videos")
    .select("*")
    .eq("user_id", userId)
    .eq("video_url", normalizedVideoUrl)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: savedVideos, error: lookupError } = await supabase
    .from("saved_videos")
    .select("*")
    .eq("user_id", userId);

  if (lookupError) {
    throw lookupError;
  }

  return (
    savedVideos?.find(
      (savedVideo) =>
        normalizeSavedVideoUrl(savedVideo.video_url) === normalizedVideoUrl,
    ) ?? null
  );
}

export async function createSavedVideo({
  accessToken,
  userId,
  video,
}: {
  accessToken?: string | null;
  userId: string;
  video: any;
}) {
  const existingSavedVideo = await findSavedVideoByUrl({
    accessToken,
    userId,
    videoUrl: video.videoUrl,
  });

  if (existingSavedVideo) {
    return {
      row: existingSavedVideo,
      alreadySaved: true,
    };
  }

  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("saved_videos")
    .insert(toSavedVideoInsert(userId, video))
    .select("*")
    .single();

  if (error) {
    if (isDuplicateSavedVideoError(error)) {
      const duplicateSavedVideo = await findSavedVideoByUrl({
        accessToken,
        userId,
        videoUrl: video.videoUrl,
      });

      if (duplicateSavedVideo) {
        return {
          row: duplicateSavedVideo,
          alreadySaved: true,
        };
      }
    }

    throw error;
  }

  return {
    row: data,
    alreadySaved: false,
  };
}

export async function updateSavedVideo({
  accessToken,
  id,
  updates,
}: {
  accessToken?: string | null;
  id: string;
  updates: any;
}) {
  const payload = toSavedVideoUpdate(updates);
  if (Object.keys(payload).length === 0) {
    return null;
  }

  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("saved_videos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveSavedVideo({
  accessToken,
  id,
}: {
  accessToken?: string | null;
  id: string;
}) {
  return updateSavedVideo({
    accessToken,
    id,
    updates: { archived: true },
  });
}

export async function deleteSavedVideo({
  accessToken,
  id,
}: {
  accessToken?: string | null;
  id: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { error } = await supabase.from("saved_videos").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
