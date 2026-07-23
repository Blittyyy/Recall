import React from "react";
import PostHog, { PostHogProvider } from "posthog-react-native";

export const ANALYTICS_EVENTS = {
  signup_completed: "signup_completed",
  save_created: "save_created",
  reminder_created: "reminder_created",
  notification_opened: "notification_opened",
  collection_created: "collection_created",
  search_used: "search_used",
  worth_revisiting_opened: "worth_revisiting_opened",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "amazon"
  | "web"
  | "unknown";

export type SaveSource = "manual" | "share_extension" | "unknown";
export type ReminderType = "one_time" | "recurring" | "unknown";
export type NotificationDestination =
  | "video_detail"
  | "routine_detail"
  | "unknown";
export type CollectionCreatedSource =
  | "add_flow"
  | "collections_screen"
  | "unknown";
export type SearchResultCountBucket = "zero" | "one_to_five" | "six_plus";
export type SearchScope = "library" | "collections" | "unknown";

type AnalyticsPropertyValue = string | number | boolean;

type EventPropertiesMap = {
  signup_completed: Record<string, never>;
  save_created: {
    platform?: AnalyticsPlatform;
    save_source?: SaveSource;
    is_first_save?: boolean;
    has_reminder?: boolean;
  };
  reminder_created: {
    reminder_type?: ReminderType;
    notifications_enabled?: boolean;
    save_platform?: AnalyticsPlatform;
  };
  notification_opened: {
    destination?: NotificationDestination;
    save_platform?: AnalyticsPlatform;
  };
  collection_created: {
    source?: CollectionCreatedSource;
  };
  search_used: {
    result_count_bucket?: SearchResultCountBucket;
    search_scope?: SearchScope;
  };
  worth_revisiting_opened: {
    item_platform?: AnalyticsPlatform;
  };
};

let client: PostHog | null = null;
let identifiedUserId: string | null = null;

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim();
  return key ? key : null;
}

function getHost(): string {
  return (
    process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com"
  );
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(getApiKey());
}

export function getAnalyticsClient(): PostHog | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  if (!client) {
    try {
      client = new PostHog(apiKey, {
        host: getHost(),
        enableSessionReplay: false,
        captureAppLifecycleEvents: false,
        // Production defaults from PostHog core (flushAt: 20, flushInterval: 10s)
        flushAt: 20,
        flushInterval: 10000,
      });
    } catch {
      client = null;
    }
  }

  return client;
}

function sanitizeProperties(
  properties?: Record<string, AnalyticsPropertyValue | undefined | null>,
): Record<string, AnalyticsPropertyValue> | undefined {
  if (!properties) {
    return undefined;
  }

  const sanitized: Record<string, AnalyticsPropertyValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null) {
      continue;
    }
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  properties?: EventPropertiesMap[E],
): void {
  try {
    const posthog = getAnalyticsClient();
    if (!posthog) {
      return;
    }

    const safeProps = sanitizeProperties(
      properties as Record<string, AnalyticsPropertyValue | undefined | null>,
    );
    if (safeProps) {
      posthog.capture(eventName, safeProps);
    } else {
      posthog.capture(eventName);
    }
  } catch {
    // Never crash the app for analytics failures.
  }
}

export function identifyAnalyticsUser(userId: string): void {
  try {
    const posthog = getAnalyticsClient();
    const distinctId = typeof userId === "string" ? userId.trim() : "";
    if (!posthog || !distinctId) {
      return;
    }
    // Once per authenticated session — skip repeat identifies for the same user.
    if (identifiedUserId === distinctId) {
      return;
    }
    posthog.identify(distinctId);
    identifiedUserId = distinctId;
  } catch {
    // Never crash the app for analytics failures.
  }
}

export function resetAnalyticsUser(): void {
  try {
    const posthog = getAnalyticsClient();
    identifiedUserId = null;
    if (!posthog) {
      return;
    }
    posthog.reset();
  } catch {
    // Never crash the app for analytics failures.
  }
}

export function toAnalyticsPlatform(platform: unknown): AnalyticsPlatform {
  const normalized =
    typeof platform === "string" ? platform.trim().toLowerCase() : "";
  if (
    normalized === "youtube" ||
    normalized === "tiktok" ||
    normalized === "instagram" ||
    normalized === "amazon" ||
    normalized === "web"
  ) {
    return normalized;
  }
  return "unknown";
}

export function toReminderType(frequency: unknown): ReminderType {
  const normalized =
    typeof frequency === "string" ? frequency.trim().toLowerCase() : "";
  if (normalized === "once") {
    return "one_time";
  }
  if (
    normalized === "daily" ||
    normalized === "weekly" ||
    normalized === "weekdays" ||
    normalized === "custom" ||
    normalized.length > 0
  ) {
    return "recurring";
  }
  return "unknown";
}

export function toSearchResultCountBucket(
  count: number,
): SearchResultCountBucket {
  if (!Number.isFinite(count) || count <= 0) {
    return "zero";
  }
  if (count <= 5) {
    return "one_to_five";
  }
  return "six_plus";
}

export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const posthog = getAnalyticsClient();

  if (!posthog) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(
    PostHogProvider,
    {
      client: posthog,
      autocapture: false,
    },
    children,
  );
}
