import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_MAP_KEY = "recall-reminder-notification-map";
const FOLLOW_UP_NOTIFICATION_MAP_KEY =
  "recall-reminder-follow-up-notification-map";
const NOTIFICATION_PREFERENCES_KEY = "recall-notification-preferences";
const FOLLOW_UP_PREFERENCES_KEY = "recall-reminder-follow-up-preferences";
const REMINDER_CHANNEL_ID = "recall-reminders";
const FOLLOW_UP_FALLBACK_COPY = "You saved this for later.";
let hasInitializedNotificationHandler = false;

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  enableAllNotifications: true,
  reminderNotifications: true,
  resurfacingNotifications: false,
};

export function initializeRecallNotifications() {
  if (Platform.OS === "web" || hasInitializedNotificationHandler) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  hasInitializedNotificationHandler = true;
}

function notificationsSupported() {
  return Platform.OS !== "web";
}

function logNotificationDebug(label, payload) {
  if (!__DEV__) {
    return;
  }

  console.log(`[Recall notifications] ${label}`, payload);
}

function parseReminderTime(value) {
  if (!value) {
    return { hour: 7, minute: 0 };
  }

  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);

  if (!match) {
    const [hourString = "7", minuteString = "00"] = normalized.split(":");
    return {
      hour: Math.min(23, Math.max(0, Number(hourString) || 7)),
      minute: Math.min(59, Math.max(0, Number(minuteString) || 0)),
    };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];

  if (suffix === "AM" && hour === 12) hour = 0;
  if (suffix === "PM" && hour < 12) hour += 12;

  return { hour, minute };
}

function getReminderSchedulingTimezone(video) {
  return (
    video?.reminderTimezone ??
    video?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

function toExpoWeekday(jsDay) {
  const normalizedDay = Number(jsDay);
  return normalizedDay === 0 ? 1 : normalizedDay + 1;
}

function setTimeOnDate(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function getNextDailyOccurrence(hour, minute, now = new Date()) {
  const todayAtTime = setTimeOnDate(now, hour, minute);
  if (todayAtTime.getTime() > now.getTime()) {
    return todayAtTime;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return setTimeOnDate(tomorrow, hour, minute);
}

function getNextWeeklyOccurrence(day, hour, minute, now = new Date()) {
  const currentDay = now.getDay();
  const normalizedTargetDay = Number(day);
  const candidate = new Date(now);
  const daysUntilTarget =
    (normalizedTargetDay - currentDay + 7) % 7;

  candidate.setDate(candidate.getDate() + daysUntilTarget);
  candidate.setHours(hour, minute, 0, 0);

  if (candidate.getTime() > now.getTime()) {
    return candidate;
  }

  candidate.setDate(candidate.getDate() + 7);
  return candidate;
}

async function readJsonMap(storageKey) {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeJsonMap(storageKey, map) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(map));
}

function getWeeklyDaysForVideo(video) {
  const frequency = video.reminderFrequency ?? "Daily";
  const normalizedDays = Array.isArray(video.reminderDays)
    ? video.reminderDays
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];

  if (frequency === "Weekdays") {
    return [1, 2, 3, 4, 5];
  }

  if (frequency === "3x/week") {
    return normalizedDays.length === 3 ? normalizedDays : [1, 3, 5];
  }

  if (frequency === "Custom") {
    return normalizedDays.length > 0
      ? [...new Set(normalizedDays)]
      : [new Date().getDay()];
  }

  if (frequency === "Weekly") {
    return normalizedDays.length > 0
      ? [normalizedDays[0]]
      : [new Date().getDay()];
  }

  return [];
}

function buildReminderScheduleEntries(video, now = new Date()) {
  const { hour, minute } = parseReminderTime(video.reminderTime);
  const frequency = video.reminderFrequency ?? "Daily";
  const reminderTimezone = getReminderSchedulingTimezone(video);

  if (frequency === "Once") {
    const nextOccurrence = getNextDailyOccurrence(hour, minute, now);
    return [
      {
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextOccurrence,
        },
        nextOccurrence,
        scheduleKind: "once",
      },
    ];
  }

  if (frequency === "Daily") {
    return [
      {
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
        nextOccurrence: getNextDailyOccurrence(hour, minute, now),
        scheduleKind: "daily",
        timezone: reminderTimezone,
      },
    ];
  }

  return getWeeklyDaysForVideo(video).map((day) => {
    const expoWeekday = toExpoWeekday(day);
    return {
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday,
        hour,
        minute,
      },
      nextOccurrence: getNextWeeklyOccurrence(day, hour, minute, now),
      scheduleKind: "weekly",
      jsWeekday: day,
      expoWeekday,
      timezone: reminderTimezone,
    };
  });
}

function getReminderBody(video) {
  const title = (video.title ?? "").trim();
  if (!title) {
    return FOLLOW_UP_FALLBACK_COPY;
  }

  return title;
}

function getReminderTitle(video) {
  return "Time to revisit";
}

function getReminderNotificationContent(video, extraData = {}) {
  return {
    title: getReminderTitle(video),
    body: getReminderBody(video),
    sound: false,
    ...(Platform.OS === "android"
      ? { channelId: REMINDER_CHANNEL_ID }
      : {}),
    data: {
      videoId: video.id,
      ...extraData,
    },
  };
}

async function ensureReminderChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Recall Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0, 150, 50, 150],
    lightColor: "#111111",
  });
}

async function readScheduledNotificationMap() {
  return readJsonMap(NOTIFICATION_MAP_KEY);
}

async function writeScheduledNotificationMap(map) {
  await writeJsonMap(NOTIFICATION_MAP_KEY, map);
}

async function readFollowUpNotificationMap() {
  return readJsonMap(FOLLOW_UP_NOTIFICATION_MAP_KEY);
}

async function writeFollowUpNotificationMap(map) {
  await writeJsonMap(FOLLOW_UP_NOTIFICATION_MAP_KEY, map);
}

async function readFollowUpPreferenceMap() {
  return readJsonMap(FOLLOW_UP_PREFERENCES_KEY);
}

async function writeFollowUpPreferenceMap(map) {
  await writeJsonMap(FOLLOW_UP_PREFERENCES_KEY, map);
}

export async function getNotificationPreferences() {
  const raw = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function updateNotificationPreferences(patch) {
  const next = {
    ...(await getNotificationPreferences()),
    ...patch,
  };

  await AsyncStorage.setItem(
    NOTIFICATION_PREFERENCES_KEY,
    JSON.stringify(next),
  );

  return next;
}

export async function getNotificationPermissionStatus() {
  if (!notificationsSupported()) {
    return "unavailable";
  }

  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) {
    return "unavailable";
  }

  const settings = await Notifications.requestPermissionsAsync();
  return settings.status;
}

export async function getReminderFollowUpPreferences(videoIds = []) {
  const map = await readFollowUpPreferenceMap();
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return map;
  }

  return videoIds.reduce((acc, videoId) => {
    acc[videoId] = map[videoId] ?? null;
    return acc;
  }, {});
}

export async function setReminderFollowUpDelayForVideo(videoId, delayMinutes) {
  if (!videoId) {
    return null;
  }

  const map = await readFollowUpPreferenceMap();
  const normalizedDelay =
    delayMinutes == null || Number(delayMinutes) <= 0
      ? null
      : Number(delayMinutes);

  if (normalizedDelay == null) {
    delete map[videoId];
  } else {
    map[videoId] = normalizedDelay;
  }

  await writeFollowUpPreferenceMap(map);
  return normalizedDelay;
}

export async function clearReminderFollowUpDelayForVideo(videoId) {
  if (!videoId) {
    return;
  }

  const map = await readFollowUpPreferenceMap();
  delete map[videoId];
  await writeFollowUpPreferenceMap(map);
}

export async function scheduleDebugNotificationInTenSeconds() {
  if (!notificationsSupported()) {
    const result = { scheduled: false, reason: "unsupported-platform" };
    logNotificationDebug("10-second test unavailable", result);
    return result;
  }

  await ensureReminderChannel();

  let permissionStatus = await getNotificationPermissionStatus();
  if (permissionStatus !== "granted") {
    permissionStatus = await requestNotificationPermission();
  }

  const now = new Date();
  const triggerDate = new Date(now.getTime() + 10_000);

  logNotificationDebug("10-second test starting", {
    permissionStatus,
    nowIso: now.toISOString(),
    nowLocal: now.toString(),
    triggerDateIso: triggerDate.toISOString(),
    triggerDateLocal: triggerDate.toString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  if (permissionStatus !== "granted") {
    return { scheduled: false, reason: "permission-denied", permissionStatus };
  }

  const trigger = triggerDate;
  logNotificationDebug("10-second test scheduling attempt", {
    reminderId: null,
    weekday: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  let identifier;
  try {
    identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Recall test notification",
        body: "This should fire about 10 seconds after you tap the button.",
        sound: false,
        ...(Platform.OS === "android"
          ? { channelId: REMINDER_CHANNEL_ID }
          : {}),
        data: {
          type: "debug-test",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch (error) {
    logNotificationDebug("10-second test scheduling failed", {
      reminderId: null,
      weekday: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      errorMessage: error?.message ?? String(error),
      errorCode: error?.code ?? null,
      errorStack: error?.stack ?? null,
    });
    throw error;
  }

  logNotificationDebug("10-second test scheduled", {
    permissionStatus,
    identifier,
    trigger,
    nowIso: now.toISOString(),
    nowLocal: now.toString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return {
    scheduled: true,
    permissionStatus,
    identifier,
    triggerDateIso: triggerDate.toISOString(),
  };
}

export function getNotificationPermissionLabel(status) {
  if (status === "granted") return "Allowed";
  if (status === "denied") return "Not allowed";
  if (status === "undetermined") return "Not asked yet";
  return "Unavailable on web";
}

export async function cancelReminderNotificationsForVideo(videoId) {
  if (!notificationsSupported() || !videoId) {
    return;
  }

  const map = await readScheduledNotificationMap();
  const identifiers = map[videoId] ?? [];

  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(
        () => null,
      ),
    ),
  );

  delete map[videoId];
  await writeScheduledNotificationMap(map);
}

export async function cancelFollowUpReminderNotificationsForVideo(videoId) {
  if (!notificationsSupported() || !videoId) {
    return;
  }

  const map = await readFollowUpNotificationMap();
  const identifiers = map[videoId] ?? [];

  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(
        () => null,
      ),
    ),
  );

  delete map[videoId];
  await writeFollowUpNotificationMap(map);
}

export async function cancelAllReminderNotifications() {
  if (!notificationsSupported()) {
    return;
  }

  const [map, followUpMap] = await Promise.all([
    readScheduledNotificationMap(),
    readFollowUpNotificationMap(),
  ]);
  const identifiers = [
    ...Object.values(map).flat(),
    ...Object.values(followUpMap).flat(),
  ];

  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(
        () => null,
      ),
    ),
  );

  await Promise.all([
    writeScheduledNotificationMap({}),
    writeFollowUpNotificationMap({}),
  ]);
}

async function scheduleFollowUpReminderNotificationForVideo(video, nextOccurrence) {
  const delayMinutes =
    video?.reminderFollowUpDelayMinutes == null
      ? null
      : Number(video.reminderFollowUpDelayMinutes);

  if (!video?.id || !delayMinutes || delayMinutes <= 0 || !nextOccurrence) {
    await cancelFollowUpReminderNotificationsForVideo(video?.id);
    return { scheduled: false, reason: "follow-up-off" };
  }

  const followUpDate = new Date(
    nextOccurrence.getTime() + delayMinutes * 60_000,
  );

  if (followUpDate.getTime() <= Date.now()) {
    await cancelFollowUpReminderNotificationsForVideo(video.id);
    return { scheduled: false, reason: "follow-up-in-past" };
  }

  await cancelFollowUpReminderNotificationsForVideo(video.id);

  const trigger = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: followUpDate,
  };
  logNotificationDebug("follow-up scheduling attempt", {
    reminderId: video?.reminderId ?? null,
    videoId: video.id,
    weekday: null,
    timezone: getReminderSchedulingTimezone(video),
    trigger,
  });

  let identifier;
  try {
    identifier = await Notifications.scheduleNotificationAsync({
      content: getReminderNotificationContent(video, {
        type: "reminder-follow-up",
        followUp: true,
      }),
      trigger,
    });
  } catch (error) {
    logNotificationDebug("follow-up scheduling failed", {
      reminderId: video?.reminderId ?? null,
      videoId: video.id,
      weekday: null,
      timezone: getReminderSchedulingTimezone(video),
      trigger,
      errorMessage: error?.message ?? String(error),
      errorCode: error?.code ?? null,
      errorStack: error?.stack ?? null,
    });
    throw error;
  }

  const map = await readFollowUpNotificationMap();
  map[video.id] = [identifier];
  await writeFollowUpNotificationMap(map);

  logNotificationDebug("follow-up reminder scheduled", {
    videoId: video.id,
    videoTitle: video.title ?? "Saved Video",
    delayMinutes,
    followUpDateIso: followUpDate.toISOString(),
    followUpDateLocal: followUpDate.toString(),
    notificationId: identifier,
  });

  return {
    scheduled: true,
    identifier,
    followUpDate,
  };
}

export async function syncReminderNotificationForVideo(
  video,
  { requestPermission = false } = {},
) {
  if (!video?.id) {
    return { scheduled: false, reason: "missing-video" };
  }

  if (!notificationsSupported()) {
    return { scheduled: false, reason: "unsupported-platform" };
  }

  await Promise.all([
    cancelReminderNotificationsForVideo(video.id),
    cancelFollowUpReminderNotificationsForVideo(video.id),
  ]);

  if (!video.hasReminder || !video.reminderEnabled || video.archived) {
    return { scheduled: false, reason: "reminder-off" };
  }

  const preferences = await getNotificationPreferences();
  if (
    !preferences.enableAllNotifications ||
    !preferences.reminderNotifications
  ) {
    return { scheduled: false, reason: "notifications-disabled" };
  }

  let permissionStatus = await getNotificationPermissionStatus();
  if (permissionStatus !== "granted" && requestPermission) {
    permissionStatus = await requestNotificationPermission();
  }

  if (permissionStatus !== "granted") {
    return { scheduled: false, reason: "permission-denied", permissionStatus };
  }

  await ensureReminderChannel();
  await setReminderFollowUpDelayForVideo(
    video.id,
    video.reminderFollowUpDelayMinutes,
  );

  const now = new Date();
  const scheduleEntries = buildReminderScheduleEntries(video, now);
  logNotificationDebug("syncReminderNotificationForVideo start", {
    reminderId: video.reminderId ?? null,
    videoId: video.id,
    videoTitle: video.title ?? "Saved Video",
    reminderTime: video.reminderTime,
    reminderFrequency: video.reminderFrequency ?? "Daily",
    reminderDays: video.reminderDays ?? [],
    reminderTimezone: getReminderSchedulingTimezone(video),
    currentDeviceDateTimeIso: now.toISOString(),
    currentDeviceDateTimeLocal: now.toString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calculatedNextTriggers: scheduleEntries.map((entry) => ({
      scheduleKind: entry.scheduleKind ?? "unknown",
      jsWeekday: entry.jsWeekday ?? null,
      expoWeekday: entry.expoWeekday ?? null,
      timezone: entry.timezone ?? null,
      trigger: entry.trigger,
      nextOccurrenceIso: entry.nextOccurrence?.toISOString?.() ?? null,
      nextOccurrenceLocal: entry.nextOccurrence?.toString?.() ?? null,
    })),
  });

  const identifiers = [];
  for (const entry of scheduleEntries) {
    logNotificationDebug("reminder scheduling attempt", {
      reminderId: video.reminderId ?? null,
      videoId: video.id,
      videoTitle: video.title ?? "Saved Video",
      weekday: entry.expoWeekday ?? null,
      jsWeekday: entry.jsWeekday ?? null,
      timezone: entry.timezone ?? getReminderSchedulingTimezone(video),
      trigger: entry.trigger,
    });

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: getReminderNotificationContent(video, {
          type: "reminder",
        }),
        trigger: entry.trigger,
      });
      identifiers.push(identifier);
      logNotificationDebug("reminder scheduled", {
        reminderId: video.reminderId ?? null,
        videoId: video.id,
        videoTitle: video.title ?? "Saved Video",
        selectedReminderTime: video.reminderTime,
        frequency: video.reminderFrequency ?? "Daily",
        weekday: entry.expoWeekday ?? null,
        jsWeekday: entry.jsWeekday ?? null,
        timezone: entry.timezone ?? getReminderSchedulingTimezone(video),
        calculatedNextTriggerIso: entry.nextOccurrence?.toISOString?.() ?? null,
        calculatedNextTriggerLocal:
          entry.nextOccurrence?.toString?.() ?? null,
        trigger: entry.trigger,
        notificationId: identifier,
      });
    } catch (error) {
      logNotificationDebug("reminder scheduling failed", {
        reminderId: video.reminderId ?? null,
        videoId: video.id,
        videoTitle: video.title ?? "Saved Video",
        selectedReminderTime: video.reminderTime,
        frequency: video.reminderFrequency ?? "Daily",
        weekday: entry.expoWeekday ?? null,
        jsWeekday: entry.jsWeekday ?? null,
        timezone: entry.timezone ?? getReminderSchedulingTimezone(video),
        trigger: entry.trigger,
        errorMessage: error?.message ?? String(error),
        errorCode: error?.code ?? null,
        errorStack: error?.stack ?? null,
      });

      await Promise.all(
        identifiers.map((identifier) =>
          Notifications.cancelScheduledNotificationAsync(identifier).catch(
            () => null,
          ),
        ),
      );
      throw error;
    }
  }

  const map = await readScheduledNotificationMap();
  map[video.id] = identifiers;
  await writeScheduledNotificationMap(map);
  logNotificationDebug("reminder identifiers stored", {
    reminderId: video.reminderId ?? null,
    videoId: video.id,
    identifiers,
    scheduleCount: scheduleEntries.length,
    storedCount: identifiers.length,
  });

  const nextOccurrence = scheduleEntries
    .map((entry) => entry.nextOccurrence)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const followUpResult = await scheduleFollowUpReminderNotificationForVideo(
    video,
    nextOccurrence,
  );

  return {
    scheduled: true,
    identifiers,
    permissionStatus,
    followUpScheduled: followUpResult.scheduled,
  };
}

export async function resyncReminderNotifications(
  videos,
  { requestPermission = false } = {},
) {
  if (!notificationsSupported()) {
    return;
  }

  const list = Array.isArray(videos) ? videos : [];
  const preferences = await getNotificationPreferences();

  if (
    !preferences.enableAllNotifications ||
    !preferences.reminderNotifications
  ) {
    await cancelAllReminderNotifications();
    return;
  }

  let permissionStatus = await getNotificationPermissionStatus();
  if (permissionStatus !== "granted" && requestPermission) {
    permissionStatus = await requestNotificationPermission();
  }

  if (permissionStatus !== "granted") {
    await cancelAllReminderNotifications();
    return;
  }

  const activeVideoIds = new Set(list.map((video) => video.id));
  const map = await readScheduledNotificationMap();

  await Promise.all(
    Object.keys(map)
      .filter((videoId) => !activeVideoIds.has(videoId))
      .map((videoId) => cancelReminderNotificationsForVideo(videoId)),
  );

  for (const video of list) {
    try {
      await syncReminderNotificationForVideo(video, {
        requestPermission: false,
      });
    } catch (error) {
      logNotificationDebug("reminder resync skipped after error", {
        videoId: video?.id ?? null,
        title: video?.title ?? null,
        frequency: video?.reminderFrequency ?? null,
        reminderDays: video?.reminderDays ?? null,
        errorMessage: error?.message ?? String(error),
      });
    }
  }
}

export function getNotificationVideoIdFromResponse(response) {
  return (
    response?.notification?.request?.content?.data?.videoId ??
    null
  );
}

export function getNotificationTypeFromResponse(response) {
  return response?.notification?.request?.content?.data?.type ?? null;
}
