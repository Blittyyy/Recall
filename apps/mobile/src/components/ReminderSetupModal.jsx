import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Clock, RefreshCw, Trash2 } from "lucide-react-native";
import {
  BLACK,
  GREY_LIGHT,
  GREY_MID,
  GREY_TEXT,
  RED,
  REMINDER_DAY_OPTIONS,
  WHITE,
} from "../constants/addScreen";
import { VideoThumbnail } from "./VideoThumbnail";
import { getCategoryMeta } from "../utils/resurfacing";

const TIME_PRESETS = [
  { id: "morning", label: "Morning", time: "07:00 AM" },
  { id: "afternoon", label: "Afternoon", time: "12:00 PM" },
  { id: "evening", label: "Evening", time: "06:00 PM" },
  { id: "custom", label: "Custom", time: null },
];

const FREQUENCY_OPTIONS = [
  "Once",
  "Daily",
  "Weekdays",
  "Weekly",
  "3x/week",
  "Custom",
];
const FOLLOW_UP_OPTIONS = [
  { id: "off", label: "Off", value: null },
  { id: "10", label: "After 10 minutes", value: 10 },
  { id: "30", label: "After 30 minutes", value: 30 },
  { id: "60", label: "After 1 hour", value: 60 },
];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MERIDIEM_OPTIONS = ["AM", "PM"];
const WEEKDAY_IDS = [1, 2, 3, 4, 5];

export function ReminderSetupModal({
  visible,
  insets,
  title = "Remind me",
  subtitle = "Set a gentle nudge for this save.",
  initialReminder,
  videoContext = null,
  allowDelete = false,
  onClose,
  onSave,
  onDelete,
}) {
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState("morning");
  const [reminderTime, setReminderTime] = useState("07:00 AM");
  const [pickerHour, setPickerHour] = useState("7");
  const [pickerMinute, setPickerMinute] = useState("00");
  const [pickerMeridiem, setPickerMeridiem] = useState("AM");
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState("Daily");
  const [reminderDays, setReminderDays] = useState([]);
  const [reminderFollowUpDelayMinutes, setReminderFollowUpDelayMinutes] =
    useState(null);

  const hasExistingReminder = initialReminder?.hasReminder ?? false;
  const isFirstTimeSetup = !hasExistingReminder && !allowDelete;
  const showReminderToggle = !isFirstTimeSetup;
  const showDaySelector = ["Weekly", "3x/week", "Custom"].includes(
    reminderFrequency,
  );
  const categoryMeta = videoContext?.category
    ? getCategoryMeta(videoContext.category)
    : null;
  const platformLabel = formatPlatformLabel(videoContext?.platform);
  const summary = buildReminderSummary(
    reminderFrequency,
    reminderTime,
    reminderDays,
  );
  const canSave =
    showReminderToggle && !reminderEnabled
      ? true
      : getCanSaveReminder(reminderFrequency, reminderDays);
  const helperText = getDayHelperText(reminderFrequency, reminderDays);

  useEffect(() => {
    if (!visible) return;

    const nextTime = initialReminder?.reminderTime ?? "07:00 AM";
    const parsedTime = parseReminderTime(nextTime) ?? parseReminderTime("07:00 AM");
    const nextFrequency = FREQUENCY_OPTIONS.includes(
      initialReminder?.reminderFrequency,
    )
      ? initialReminder.reminderFrequency
      : "Daily";
    const nextDays = normalizeReminderDays(
      initialReminder?.reminderDays ?? [],
      nextFrequency,
    );

    setReminderEnabled(
      hasExistingReminder ? (initialReminder?.reminderEnabled ?? true) : true,
    );
    setReminderTime(nextTime);
    setSelectedPresetId(getPresetIdForTime(nextTime));
    setPickerHour(parsedTime.hour);
    setPickerMinute(parsedTime.minute);
    setPickerMeridiem(parsedTime.meridiem);
    setReminderFrequency(nextFrequency);
    setReminderDays(nextDays);
    setReminderFollowUpDelayMinutes(
      initialReminder?.reminderFollowUpDelayMinutes ?? null,
    );
    setShowCustomTimeModal(false);
  }, [hasExistingReminder, initialReminder, visible]);

  const handleSelectPreset = (preset) => {
    if (preset.id === "custom") {
      setSelectedPresetId("custom");
      setShowCustomTimeModal(true);
      return;
    }

    setSelectedPresetId(preset.id);
    setReminderTime(preset.time);
    const parsedTime = parseReminderTime(preset.time);
    if (parsedTime) {
      setPickerHour(parsedTime.hour);
      setPickerMinute(parsedTime.minute);
      setPickerMeridiem(parsedTime.meridiem);
    }
  };

  const applyCustomTime = () => {
    const nextTime = formatReminderTime(
      pickerHour,
      pickerMinute,
      pickerMeridiem,
    );
    setReminderTime(nextTime);
    setSelectedPresetId("custom");
    setShowCustomTimeModal(false);
  };

  const handleSelectFrequency = (frequency) => {
    setReminderFrequency(frequency);

    if (frequency === "Weekdays") {
      setReminderDays(WEEKDAY_IDS);
      return;
    }

    if (frequency === "Once" || frequency === "Daily") {
      setReminderDays([]);
      return;
    }

    if (frequency === "Weekly") {
      setReminderDays((current) => current.slice(0, 1));
      return;
    }

    if (frequency === "3x/week") {
      setReminderDays((current) => current.slice(0, 3));
    }
  };

  const toggleDay = (dayId) => {
    setReminderDays((current) => {
      if (reminderFrequency === "Weekly") {
        return current.includes(dayId) ? [] : [dayId];
      }

      if (reminderFrequency === "3x/week") {
        if (current.includes(dayId)) {
          return current.filter((id) => id !== dayId).sort((a, b) => a - b);
        }
        if (current.length >= 3) {
          return current;
        }
        return [...current, dayId].sort((a, b) => a - b);
      }

      return current.includes(dayId)
        ? current.filter((id) => id !== dayId).sort((a, b) => a - b)
        : [...current, dayId].sort((a, b) => a - b);
    });
  };

  const handleSave = () => {
    const hadReminder = initialReminder?.hasReminder ?? false;
    const nextEnabled = showReminderToggle ? reminderEnabled : true;
    const nextDays =
      reminderFrequency === "Weekdays"
        ? WEEKDAY_IDS
        : showDaySelector
          ? reminderDays
          : [];

    onSave({
      hasReminder: nextEnabled ? true : hadReminder,
      reminderEnabled: nextEnabled,
      reminderTime: nextEnabled || hadReminder ? reminderTime : null,
      reminderFrequency: nextEnabled || hadReminder ? reminderFrequency : null,
      reminderDays: nextEnabled || hadReminder ? nextDays : [],
      reminderFollowUpDelayMinutes:
        nextEnabled || hadReminder ? reminderFollowUpDelayMinutes : null,
    });
  };

  const customChipLabel =
    selectedPresetId === "custom" ? reminderTime : "Custom";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.34)",
          }}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
          }}
          pointerEvents="box-none"
        >
          {showCustomTimeModal ? (
            <View style={styles.timeOverlayShell}>
              <Pressable
                onPress={() => setShowCustomTimeModal(false)}
                style={styles.timeOverlayBackdrop}
              />
              <View style={styles.timeModalCard}>
                <Text style={styles.timeModalTitle}>Choose a custom time</Text>
                <Text style={styles.timeModalSubtitle}>
                  Pick an exact hour and minute for this reminder.
                </Text>

                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.pickerLabel}>Hour</Text>
                    <View style={styles.pickerShell}>
                      <Picker
                        style={styles.picker}
                        selectedValue={pickerHour}
                        onValueChange={(value) => setPickerHour(String(value))}
                        itemStyle={styles.pickerItem}
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <Picker.Item
                            key={`hour-${option}`}
                            label={option}
                            value={option}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.timePickerColumn}>
                    <Text style={styles.pickerLabel}>Minute</Text>
                    <View style={styles.pickerShell}>
                      <Picker
                        style={styles.picker}
                        selectedValue={pickerMinute}
                        onValueChange={(value) => setPickerMinute(String(value))}
                        itemStyle={styles.pickerItem}
                      >
                        {MINUTE_OPTIONS.map((option) => (
                          <Picker.Item
                            key={`minute-${option}`}
                            label={option}
                            value={option}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.timePickerColumn}>
                    <Text style={styles.pickerLabel}>AM / PM</Text>
                    <View style={styles.pickerShell}>
                      <Picker
                        style={styles.picker}
                        selectedValue={pickerMeridiem}
                        onValueChange={(value) => setPickerMeridiem(String(value))}
                        itemStyle={styles.pickerItem}
                      >
                        {MERIDIEM_OPTIONS.map((option) => (
                          <Picker.Item
                            key={`meridiem-${option}`}
                            label={option}
                            value={option}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.timeModalActions}>
                  <Pressable
                    onPress={() => setShowCustomTimeModal(false)}
                    style={styles.timeModalSecondary}
                  >
                    <Text style={styles.timeModalSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={applyCustomTime}
                    style={styles.timeModalPrimary}
                  >
                    <Text style={styles.timeModalPrimaryText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          <View
            style={{
              backgroundColor: WHITE,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "88%",
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 22,
                paddingTop: 14,
                paddingBottom: (insets?.bottom ?? 0) + 28,
              }}
            >
                <View
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: GREY_MID,
                    alignSelf: "center",
                    marginBottom: 20,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                  </View>
                  {showReminderToggle ? (
                    <View style={styles.toggleShell}>
                      <Switch
                        value={reminderEnabled}
                        onValueChange={setReminderEnabled}
                        trackColor={{ false: "#DBDBE1", true: BLACK }}
                        thumbColor={WHITE}
                      />
                    </View>
                  ) : null}
                </View>

                {videoContext ? (
                  <View style={styles.contextCard}>
                    <VideoThumbnail
                      thumbnailUrl={videoContext.thumbnailUrl}
                      platform={videoContext.platform}
                      variant="libraryList"
                    />
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text style={styles.contextTitle} numberOfLines={2}>
                        {videoContext.title || "Saved video"}
                      </Text>
                      <Text style={styles.contextPlatform}>{platformLabel}</Text>
                      {categoryMeta ? (
                        <Text style={styles.contextCategory}>
                          {categoryMeta.emoji} {categoryMeta.label}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {(!showReminderToggle || reminderEnabled) && (
                  <>
                    <View style={styles.sectionCard}>
                      <SectionLabel
                        icon={<Clock size={13} color={GREY_TEXT} />}
                        label="Reminder time"
                      />
                      <ChoiceGrid
                        columns={2}
                        options={TIME_PRESETS.map((preset) => ({
                          id: preset.id,
                          label:
                            preset.id === "custom"
                              ? customChipLabel
                              : preset.label,
                        }))}
                        selected={selectedPresetId}
                        onSelect={(presetId) => {
                          const preset = TIME_PRESETS.find(
                            (option) => option.id === presetId,
                          );
                          if (preset) {
                            handleSelectPreset(preset);
                          }
                        }}
                      />
                    </View>

                    <View style={styles.sectionCard}>
                      <SectionLabel
                        icon={<RefreshCw size={13} color={GREY_TEXT} />}
                        label="Frequency"
                      />
                      <ChoiceGrid
                        columns={2}
                        options={FREQUENCY_OPTIONS.map((option) => ({
                          id: option,
                          label: option,
                        }))}
                        selected={reminderFrequency}
                        onSelect={handleSelectFrequency}
                      />

                      {showDaySelector ? (
                        <>
                          <Text style={styles.subSectionLabel}>
                            Days of the week
                          </Text>
                          <View style={styles.dayWrap}>
                            {REMINDER_DAY_OPTIONS.map((day) => {
                              const selected = reminderDays.includes(day.id);
                              return (
                                <Pressable
                                  key={`${day.id}-${day.label}`}
                                  onPress={() => toggleDay(day.id)}
                                  style={[
                                    styles.dayChip,
                                    selected ? styles.dayChipActive : null,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.dayChipText,
                                      selected ? styles.dayChipTextActive : null,
                                    ]}
                                  >
                                    {day.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          {helperText ? (
                            <Text style={styles.helperText}>{helperText}</Text>
                          ) : null}
                        </>
                      ) : null}
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Reminder summary</Text>
                      <Text style={styles.summaryValue}>{summary}</Text>
                    </View>

                    <View style={styles.sectionCard}>
                      <SectionLabel
                        icon={<Clock size={13} color={GREY_TEXT} />}
                        label="Remind me again if I don't open it"
                      />
                      <ChoiceGrid
                        columns={2}
                        options={FOLLOW_UP_OPTIONS.map((option) => ({
                          id: option.id,
                          label: option.label,
                        }))}
                        selected={
                          FOLLOW_UP_OPTIONS.find(
                            (option) =>
                              option.value === reminderFollowUpDelayMinutes,
                          )?.id ?? "off"
                        }
                        onSelect={(optionId) => {
                          const selectedOption = FOLLOW_UP_OPTIONS.find(
                            (option) => option.id === optionId,
                          );
                          setReminderFollowUpDelayMinutes(
                            selectedOption?.value ?? null,
                          );
                        }}
                      />
                      <Text style={styles.helperText}>
                        Recall will only send one extra local nudge if this save
                        still hasn't been opened.
                      </Text>
                    </View>
                  </>
                )}

                <View style={{ marginTop: 20 }}>
                  <Pressable
                    onPress={handleSave}
                    disabled={!canSave}
                    style={[
                      styles.primaryButton,
                      !canSave ? styles.primaryButtonDisabled : null,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Save Reminder</Text>
                  </Pressable>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: allowDelete ? "space-between" : "center",
                      marginTop: 14,
                    }}
                  >
                    {allowDelete ? (
                      <Pressable
                        onPress={onDelete}
                        style={styles.deleteAction}
                      >
                        <Trash2 size={15} color={RED} />
                        <Text style={styles.deleteActionText}>
                          Delete reminder
                        </Text>
                      </Pressable>
                    ) : (
                      <View />
                    )}

                    <Pressable onPress={onClose} hitSlop={8}>
                      <Text style={styles.notNowText}>Not now</Text>
                    </Pressable>
                  </View>
                </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SectionLabel({ icon, label }) {
  return (
    <View style={styles.sectionLabelRow}>
      {icon}
      <Text style={styles.sectionLabelText}>{label}</Text>
    </View>
  );
}

function ChoiceGrid({ options, selected, onSelect, columns = 2 }) {
  return (
    <View style={styles.choiceGrid}>
      {options.map((option) => {
        const active = selected === option.id;
        return (
          <View
            key={option.id}
            style={{
              width: `${100 / columns}%`,
              paddingHorizontal: 4,
              marginBottom: 8,
            }}
          >
            <Pressable
              onPress={() => onSelect(option.id)}
              style={[
                styles.choiceChip,
                active ? styles.choiceChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  active ? styles.choiceChipTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function parseReminderTime(timeString) {
  const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(
    timeString?.trim?.() ?? "",
  );
  if (!match) return null;

  return {
    hour: String(Number(match[1])),
    minute: match[2],
    meridiem: match[3].toUpperCase(),
  };
}

function formatReminderTime(hour, minute, meridiem) {
  return `${hour}:${minute} ${meridiem}`;
}

function getPresetIdForTime(time) {
  const preset = TIME_PRESETS.find((option) => option.time === time);
  return preset?.id ?? "custom";
}

function normalizeReminderDays(days, frequency) {
  if (frequency === "Weekdays") {
    return WEEKDAY_IDS;
  }
  return [...days].sort((a, b) => a - b);
}

function getCanSaveReminder(frequency, days) {
  if (frequency === "Weekly") {
    return days.length === 1;
  }
  if (frequency === "3x/week") {
    return days.length === 3;
  }
  if (frequency === "Custom") {
    return days.length > 0;
  }
  return true;
}

function getDayHelperText(frequency, days) {
  if (frequency === "Weekly" && days.length !== 1) {
    return "Choose one day for this weekly reminder.";
  }
  if (frequency === "3x/week" && days.length !== 3) {
    return "Choose exactly 3 days.";
  }
  if (frequency === "Custom" && days.length === 0) {
    return "Pick the days that fit your routine.";
  }
  return null;
}

function buildReminderSummary(frequency, time, days) {
  if (frequency === "Once") {
    return `Once at ${time}`;
  }
  if (frequency === "Daily") {
    return `Daily at ${time}`;
  }
  if (frequency === "Weekdays") {
    return `Weekdays at ${time}`;
  }
  if (frequency === "Weekly") {
    return days.length === 1
      ? `${getDayName(days[0])} at ${time}`
      : `Weekly at ${time}`;
  }
  if (frequency === "3x/week") {
    return days.length === 3
      ? `3x/week on ${days.map(getDayAbbreviation).join(", ")} at ${time}`
      : `3x/week at ${time}`;
  }
  if (days.length > 0) {
    return `Custom on ${days.map(getDayAbbreviation).join(", ")} at ${time}`;
  }
  return `Custom at ${time}`;
}

function getDayName(dayId) {
  const dayNames = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return dayNames[dayId] ?? "Day";
}

function getDayAbbreviation(dayId) {
  const labels = {
    0: "Sun",
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
  };
  return labels[dayId] ?? "Day";
}

function formatPlatformLabel(platform) {
  const normalized = (platform ?? "").toLowerCase();
  if (normalized === "youtube") return "YouTube";
  if (normalized === "instagram") return "Instagram";
  if (normalized === "tiktok") return "TikTok";
  return platform || "Video";
}

const styles = {
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 18,
  },
  toggleShell: {
    backgroundColor: GREY_LIGHT,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  contextCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F7F7F5",
    borderRadius: 22,
    padding: 12,
    marginBottom: 20,
  },
  contextTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    lineHeight: 20,
    marginBottom: 5,
  },
  contextPlatform: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
    opacity: 0.72,
    marginBottom: 5,
  },
  contextCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
  },
  sectionCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 16,
    marginTop: 14,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  sectionLabelText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  choiceChip: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: GREY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  choiceChipActive: {
    backgroundColor: BLACK,
  },
  choiceChipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: BLACK,
    textAlign: "center",
  },
  choiceChipTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
  subSectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
    marginBottom: 8,
  },
  timePickerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  timePickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
    marginBottom: 8,
  },
  pickerShell: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F7F7F5",
    height: Platform.OS === "ios" ? 184 : 56,
    justifyContent: "center",
  },
  picker: {
    height: Platform.OS === "ios" ? 184 : 56,
    width: "100%",
  },
  pickerItem: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
  },
  dayWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREY_LIGHT,
  },
  dayChipActive: {
    backgroundColor: BLACK,
  },
  dayChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
  },
  dayChipTextActive: {
    color: WHITE,
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 17,
  },
  summaryCard: {
    backgroundColor: "#F7F7F5",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 18,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    letterSpacing: -0.2,
  },
  primaryButton: {
    backgroundColor: BLACK,
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#D4D4D8",
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: WHITE,
  },
  deleteAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: RED,
  },
  notNowText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: GREY_TEXT,
  },
  timeOverlayShell: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
    zIndex: 20,
  },
  timeOverlayBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  timeModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 20,
  },
  timeModalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    marginBottom: 6,
  },
  timeModalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 18,
  },
  timeModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  timeModalSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GREY_LIGHT,
  },
  timeModalSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
  },
  timeModalPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BLACK,
  },
  timeModalPrimaryText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: WHITE,
  },
};
