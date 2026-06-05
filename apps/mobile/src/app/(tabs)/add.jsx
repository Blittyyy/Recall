import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Sparkles, Tag, FolderPlus } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState } from "react";
import KeyboardAvoidingAnimatedView from "../../components/KeyboardAvoidingAnimatedView";
import { MetadataInputSection } from "../../components/AddScreen/MetadataInputSection";
import { UrlInputSection } from "../../components/AddScreen/UrlInputSection";
import { VideoPreviewCard } from "../../components/AddScreen/VideoPreviewCard";
import { SectionBlock } from "../../components/AddScreen/SectionBlock";
import { CategorySelector } from "../../components/AddScreen/CategorySelector";
import { CollectionPicker } from "../../components/AddScreen/CollectionPicker";
import { ReminderSection } from "../../components/AddScreen/ReminderSection";
import { SaveButton } from "../../components/AddScreen/SaveButton";
import { NewCollectionModal } from "../../components/AddScreen/NewCollectionModal";
import { SuccessOverlay } from "../../components/AddScreen/SuccessOverlay";
import { ReminderSetupModal } from "../../components/ReminderSetupModal";
import { useAddScreenState } from "../../hooks/useAddScreenState";
import { BG, BLACK, GREY_TEXT, GREY_MID } from "../../constants/addScreen";
import { useRecallStore } from "../../store/useRecallStore";

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const prefillUrl = Array.isArray(params.url) ? params.url[0] : params.url;
  const updateVideo = useRecallStore((s) => s.updateVideo);
  const [isEditingSavedReminder, setIsEditingSavedReminder] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const {
    url,
    urlError,
    detectedPlatform,
    customTitle,
    customCreator,
    customCategoryName,
    previewTitle,
    previewCreator,
    previewCategory,
    previewThumbnailUrl,
    selectedCategory,
    selectedCollections,
    reminderEnabled,
    selectedTime,
    selectedFrequency,
    selectedReminderFollowUpDelayMinutes,
    selectedReminderDays,
    showReminderSetup,
    showNewCollection,
    newCollectionName,
    newCollectionEmoji,
    newCollectionCoverType,
    saveState,
    collections,
    metadataStatus,
    shouldShowMetadataInputs,
    showSuccess,
    successMode,
    savedHasReminder,
    savedVideoId,
    previewAnim,
    saveAnim,
    errorShake,
    handleUrlChange,
    clearUrl,
    pasteFromClipboard,
    setCustomTitle,
    setCustomCreator,
    setSelectedCategory,
    setCustomCategoryName,
    toggleCollection,
    setReminderEnabled,
    setSelectedTime,
    setSelectedFrequency,
    setSelectedReminderFollowUpDelayMinutes,
    setSelectedReminderDays,
    setShowReminderSetup,
    setShowNewCollection,
    setNewCollectionName,
    setNewCollectionEmoji,
    setNewCollectionCoverType,
    handleCreateCollection,
    handleSave,
    handleSaveAnother,
    handleViewLibrary,
    dismissSuccess,
    reopenSuccess,
  } = useAddScreenState(prefillUrl ?? null);

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 18,
            backgroundColor: BG,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontFamily: "Inter_700Bold",
              color: BLACK,
              letterSpacing: -0.8,
              marginBottom: 6,
            }}
          >
            Save a Video
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 20,
            }}
          >
            From TikTok, Instagram Reels, or YouTube
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <UrlInputSection
            url={url}
            onUrlChange={handleUrlChange}
            onClearUrl={clearUrl}
            onPasteFromClipboard={pasteFromClipboard}
            urlError={urlError}
            errorShake={errorShake}
            detectedPlatform={detectedPlatform}
          />

          {!urlError && url.length === 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                gap: 6,
              }}
            >
              <Sparkles size={13} color={GREY_MID} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_MID,
                }}
              >
                Paste a TikTok, Reel, or YouTube link
              </Text>
            </View>
          )}

          {url.length > 0 && !urlError ? <View style={{ marginBottom: 8 }} /> : null}

          <VideoPreviewCard
            detectedPlatform={detectedPlatform}
            selectedCategory={previewCategory}
            previewTitle={previewTitle}
            previewCreator={previewCreator}
            customThumbnail={previewThumbnailUrl}
            metadataStatus={metadataStatus}
            previewAnim={previewAnim}
          />

          {shouldShowMetadataInputs ? (
            <MetadataInputSection
              title={customTitle}
              creator={customCreator}
              onChangeTitle={setCustomTitle}
              onChangeCreator={setCustomCreator}
            />
          ) : null}

          <SectionBlock
            icon={<Tag size={16} color="#FF9500" />}
            label="Category"
          >
            <CategorySelector
              selectedCategory={selectedCategory}
              customCategoryName={customCategoryName}
              onSelectCategory={setSelectedCategory}
              onChangeCustomCategory={setCustomCategoryName}
            />
          </SectionBlock>

          {collections.length > 0 ? (
            <SectionBlock
              icon={<FolderPlus size={16} color="#6741D9" />}
              label="Add to Collection"
            >
              <CollectionPicker
                collections={collections}
                selectedCollections={selectedCollections}
                onToggleCollection={toggleCollection}
                onShowNewCollection={() => setShowNewCollection(true)}
              />
            </SectionBlock>
          ) : null}

          <ReminderSection
            reminderEnabled={reminderEnabled}
            selectedDays={selectedReminderDays}
            onToggleReminder={(enabled) => {
              setReminderEnabled(enabled);
              if (enabled) setShowReminderSetup(true);
            }}
            selectedTime={selectedTime}
            selectedFrequency={selectedFrequency}
            onOpenReminderSetup={() => setShowReminderSetup(true)}
          />
        </ScrollView>

        <SaveButton
          url={url}
          detectedPlatform={detectedPlatform}
          onSave={handleSave}
          saveState={saveState}
          saveAnim={saveAnim}
          insets={insets}
        />

        <SuccessOverlay
          visible={showSuccess}
          mode={successMode}
          onViewLibrary={handleViewLibrary}
          onAddReminder={() => {
            dismissSuccess();
            setIsEditingSavedReminder(true);
            setShowReminderSetup(true);
          }}
          onSaveAnother={handleSaveAnother}
        />

      <NewCollectionModal
        visible={showNewCollection}
        onClose={() => setShowNewCollection(false)}
        newCollectionName={newCollectionName}
        onChangeCollectionName={setNewCollectionName}
        newCollectionEmoji={newCollectionEmoji}
        newCollectionCoverType={newCollectionCoverType}
        onSelectEmoji={setNewCollectionEmoji}
        onSelectCoverType={setNewCollectionCoverType}
        onCreateCollection={handleCreateCollection}
        insets={insets}
      />

        <ReminderSetupModal
          visible={showReminderSetup}
          insets={insets}
          videoContext={{
            thumbnailUrl: previewThumbnailUrl,
            title: previewTitle,
            platform: detectedPlatform,
            category: previewCategory,
          }}
          initialReminder={{
            hasReminder: isEditingSavedReminder ? savedHasReminder : reminderEnabled,
            reminderEnabled: isEditingSavedReminder
              ? savedHasReminder
              : reminderEnabled,
            reminderTime: selectedTime,
            reminderFrequency: selectedFrequency,
            reminderFollowUpDelayMinutes: selectedReminderFollowUpDelayMinutes,
            reminderDays: selectedReminderDays,
          }}
          onClose={() => {
            setShowReminderSetup(false);
            if (isEditingSavedReminder) {
              setIsEditingSavedReminder(false);
              reopenSuccess();
            }
          }}
          onSave={async (reminder) => {
            if (isEditingSavedReminder && savedVideoId) {
              const result = await updateVideo(savedVideoId, {
                hasReminder: reminder.hasReminder,
                reminderEnabled: reminder.reminderEnabled,
                reminderTime: reminder.reminderTime ?? "07:00 AM",
                reminderFrequency: reminder.reminderFrequency ?? "Daily",
                reminderFollowUpDelayMinutes:
                  reminder.reminderFollowUpDelayMinutes ?? null,
                reminderDays: reminder.reminderDays ?? [],
              });

              if (result?.blockedByPaywall) {
                return;
              }

              setReminderEnabled(reminder.reminderEnabled);
              setSelectedTime(reminder.reminderTime ?? "07:00 AM");
              setSelectedFrequency(reminder.reminderFrequency ?? "Daily");
              setSelectedReminderFollowUpDelayMinutes(
                reminder.reminderFollowUpDelayMinutes ?? null,
              );
              setSelectedReminderDays(reminder.reminderDays ?? []);
              setIsEditingSavedReminder(false);
              setShowReminderSetup(false);
              handleViewLibrary();
              return;
            }

            setReminderEnabled(reminder.reminderEnabled);
            setSelectedTime(reminder.reminderTime ?? "07:00 AM");
            setSelectedFrequency(reminder.reminderFrequency ?? "Daily");
            setSelectedReminderFollowUpDelayMinutes(
              reminder.reminderFollowUpDelayMinutes ?? null,
            );
            setSelectedReminderDays(reminder.reminderDays ?? []);
            setShowReminderSetup(false);
          }}
        />
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
