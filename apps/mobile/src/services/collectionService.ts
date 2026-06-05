import { getSupabaseClient } from "./supabaseClient";

function isMissingCollectionCoverColumnError(error: any) {
  const message = (error?.message ?? "").toLowerCase();
  return (
    message.includes("cover_image_url") ||
    message.includes("cover_type") ||
    message.includes("column collections.cover_image_url does not exist") ||
    message.includes("column collections.cover_type does not exist")
  );
}

function normalizeCollectionRows(data: any[] | null | undefined) {
  return (data ?? []).map((collection: any) => ({
    ...collection,
    cover_image_url: collection.cover_image_url ?? null,
    cover_type: collection.cover_type ?? "icon",
    video_ids: (collection.video_collections ?? []).map(
      (entry: any) => entry.video_id,
    ),
  }));
}

export async function fetchCollections({
  accessToken,
  userId,
}: {
  accessToken?: string | null;
  userId: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id,user_id,name,icon,cover_image_url,cover_type,created_at,updated_at,video_collections(video_id)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingCollectionCoverColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("collections")
        .select(
          "id,user_id,name,icon,created_at,updated_at,video_collections(video_id)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (fallbackError) {
        throw fallbackError;
      }

      return normalizeCollectionRows(fallbackData);
    }

    throw error;
  }

  return normalizeCollectionRows(data);
}

export async function createCollection({
  accessToken,
  userId,
  name,
  emoji,
  coverType,
  coverImageUrl,
}: {
  accessToken?: string | null;
  userId: string;
  name: string;
  emoji?: string | null;
  coverType?: string | null;
  coverImageUrl?: string | null;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: name.trim(),
      icon: emoji ?? "📌",
      cover_type: coverType ?? "icon",
      cover_image_url: coverImageUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingCollectionCoverColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("collections")
        .insert({
          user_id: userId,
          name: name.trim(),
          icon: emoji ?? "📌",
        })
        .select("*")
        .single();

      if (fallbackError) {
        throw fallbackError;
      }

      return fallbackData;
    }

    throw error;
  }

  return data;
}

export async function updateCollection({
  accessToken,
  id,
  updates,
}: {
  accessToken?: string | null;
  id: string;
  updates: any;
}) {
  const payload: Record<string, any> = {};
  if (Object.hasOwn(updates, "name")) payload.name = updates.name?.trim();
  if (Object.hasOwn(updates, "emoji")) payload.icon = updates.emoji;
  if (Object.hasOwn(updates, "coverType")) payload.cover_type = updates.coverType;
  if (Object.hasOwn(updates, "coverImageUrl")) {
    payload.cover_image_url = updates.coverImageUrl;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("collections")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (
      isMissingCollectionCoverColumnError(error) &&
      !Object.hasOwn(payload, "cover_type") &&
      !Object.hasOwn(payload, "cover_image_url")
    ) {
      const fallbackPayload: Record<string, any> = {};
      if (Object.hasOwn(updates, "name")) fallbackPayload.name = updates.name?.trim();
      if (Object.hasOwn(updates, "emoji")) fallbackPayload.icon = updates.emoji;

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("collections")
        .update(fallbackPayload)
        .eq("id", id)
        .select("*")
        .single();

      if (fallbackError) {
        throw fallbackError;
      }

      return fallbackData;
    }

    throw error;
  }

  return data;
}

export async function deleteCollection({
  accessToken,
  id,
}: {
  accessToken?: string | null;
  id: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function replaceVideoCollections({
  accessToken,
  videoId,
  collectionIds,
}: {
  accessToken?: string | null;
  videoId: string;
  collectionIds: string[];
}) {
  const supabase = getSupabaseClient(accessToken);

  const { error: deleteError } = await supabase
    .from("video_collections")
    .delete()
    .eq("video_id", videoId);

  if (deleteError) {
    throw deleteError;
  }

  if (!collectionIds.length) {
    return [];
  }

  const rows = collectionIds.map((collectionId) => ({
    video_id: videoId,
    collection_id: collectionId,
  }));

  const { data, error } = await supabase
    .from("video_collections")
    .insert(rows)
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function removeVideoFromCollection({
  accessToken,
  videoId,
  collectionId,
}: {
  accessToken?: string | null;
  videoId: string;
  collectionId: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { error } = await supabase
    .from("video_collections")
    .delete()
    .eq("video_id", videoId)
    .eq("collection_id", collectionId);

  if (error) {
    throw error;
  }
}
