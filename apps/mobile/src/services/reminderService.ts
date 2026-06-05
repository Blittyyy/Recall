import { getSupabaseClient } from "./supabaseClient";

function isMissingReminderColumnError(error: any) {
  const message = (error?.message ?? "").toLowerCase();
  return (
    message.includes("days_of_week") ||
    message.includes("timezone") ||
    message.includes("column reminders.days_of_week does not exist") ||
    message.includes("column reminders.timezone does not exist")
  );
}

function toDbTime(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);

  if (!match) {
    return value.includes(":") && value.split(":").length === 3
      ? value
      : `${value}:00`;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const suffix = match[3];

  if (suffix === "AM" && hours === 12) hours = 0;
  if (suffix === "PM" && hours < 12) hours += 12;

  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

function toDisplayTime(value?: string | null) {
  if (!value) return null;
  const [hourString = "0", minutes = "00"] = value.split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${suffix}`;
}

function normalizeReminderDays(days?: any[] | null) {
  if (!Array.isArray(days)) return [];

  return days
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

export async function fetchReminders({
  accessToken,
  userId,
}: {
  accessToken?: string | null;
  userId: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    if (isMissingReminderColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("reminders")
        .select("id,user_id,video_id,enabled,reminder_time,frequency,created_at,updated_at")
        .eq("user_id", userId);

      if (fallbackError) {
        throw fallbackError;
      }

      return (fallbackData ?? []).map((reminder: any) => ({
        ...reminder,
        days_of_week: normalizeReminderDays(reminder.days_of_week),
        timezone: null,
        display_time: toDisplayTime(reminder.reminder_time),
      }));
    }

    throw error;
  }

  return (data ?? []).map((reminder: any) => ({
    ...reminder,
    days_of_week: normalizeReminderDays(reminder.days_of_week),
    display_time: toDisplayTime(reminder.reminder_time),
  }));
}

export async function upsertReminder({
  accessToken,
  userId,
  videoId,
  reminder,
}: {
  accessToken?: string | null;
  userId: string;
  videoId: string;
  reminder: any;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from("reminders")
    .upsert(
      {
        user_id: userId,
        video_id: videoId,
        enabled: reminder.reminderEnabled ?? false,
        reminder_time: toDbTime(reminder.reminderTime),
        frequency: reminder.reminderFrequency ?? null,
        days_of_week: reminder.reminderDays ?? [],
        timezone:
          reminder.reminderTimezone ??
          reminder.timezone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onConflict: "video_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingReminderColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("reminders")
        .upsert(
          {
            user_id: userId,
            video_id: videoId,
            enabled: reminder.reminderEnabled ?? false,
            reminder_time: toDbTime(reminder.reminderTime),
            frequency: reminder.reminderFrequency ?? null,
          },
          {
            onConflict: "video_id",
          },
        )
        .select("*")
        .single();

      if (fallbackError) {
        throw fallbackError;
      }

      return {
        ...fallbackData,
        days_of_week: normalizeReminderDays(fallbackData.days_of_week),
        timezone: null,
        display_time: toDisplayTime(fallbackData.reminder_time),
      };
    }

    throw error;
  }

  return {
    ...data,
    display_time: toDisplayTime(data.reminder_time),
  };
}

export async function deleteReminder({
  accessToken,
  userId,
  videoId,
}: {
  accessToken?: string | null;
  userId: string;
  videoId: string;
}) {
  const supabase = getSupabaseClient(accessToken);
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("user_id", userId)
    .eq("video_id", videoId);

  if (error) {
    throw error;
  }
}
