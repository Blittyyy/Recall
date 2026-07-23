import { useState, useRef, useCallback, useEffect } from "react";
import { Animated } from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRecallStore } from "../store/useRecallStore";
import { useAppearanceStore } from "../store/useAppearanceStore";
import { fetchVideoMetadata } from "../services/videoMetadataService";
import { createMockVideo, getCategoryMeta } from "../utils/resurfacing";
import {
  toAnalyticsPlatform,
  trackEvent,
} from "../services/analytics";
import {
  detectPlatform,
  getGeneratedTitle,
  getSafeThumbnailUrl,
  isLikelyUrl,
  normalizeUrl,
  normalizeVideoUrlForSave,
} from "../utils/urlHelpers";

const DEFAULT_TIME = "07:00 AM";
const DEFAULT_FREQUENCY = "Daily";
const DEFAULT_FOLLOW_UP_DELAY = null;

export function useAddScreenState(prefillUrl = null) {
  const router = useRouter();
  const addVideo = useRecallStore((s) => s.addVideo);
  const collections = useRecallStore((s) => s.collections);
  const addCollection = useRecallStore((s) => s.addCollection);
  const reduceMotion = useAppearanceStore((s) => s.reduceMotion);

  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState(null);
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customCreator, setCustomCreator] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("fitness");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedTime, setSelectedTime] = useState(DEFAULT_TIME);
  const [selectedFrequency, setSelectedFrequency] = useState(DEFAULT_FREQUENCY);
  const [selectedReminderDays, setSelectedReminderDays] = useState([]);
  const [selectedReminderFollowUpDelayMinutes, setSelectedReminderFollowUpDelayMinutes] =
    useState(DEFAULT_FOLLOW_UP_DELAY);
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("📌");
  const [newCollectionCoverType, setNewCollectionCoverType] = useState("icon");

  const [saveState, setSaveState] = useState("idle");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState("saved");
  const [saveSuccessAnimation, setSaveSuccessAnimation] = useState(null);
  const [savedPlatform, setSavedPlatform] = useState(null);
  const [savedCategory, setSavedCategory] = useState("fitness");
  const [savedHasReminder, setSavedHasReminder] = useState(false);
  const [savedVideoId, setSavedVideoId] = useState(null);

  const [videoMetadata, setVideoMetadata] = useState(null);
  const [metadataStatus, setMetadataStatus] = useState("idle");
  const [metadataError, setMetadataError] = useState(null);

  const previewAnim = useRef(new Animated.Value(0)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const lastAppliedPrefillUrl = useRef(null);
  const metadataCacheRef = useRef(new Map());
  const saveSuccessFallbackRef = useRef(null);
  const metadataRequestRef = useRef({
    key: null,
    promise: null,
    controller: null,
  });
  const activeMetadataKeyRef = useRef(null);

  const resetMetadataState = useCallback(() => {
    metadataRequestRef.current.controller?.abort?.();
    metadataRequestRef.current = {
      key: null,
      promise: null,
      controller: null,
    };
    activeMetadataKeyRef.current = null;
    setVideoMetadata(null);
    setMetadataStatus("idle");
    setMetadataError(null);
    setCustomTitle("");
    setCustomCreator("");
  }, []);

  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(errorShake, {
        toValue: 7,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(errorShake, {
        toValue: -7,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(errorShake, {
        toValue: 4,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(errorShake, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [errorShake]);

  const loadMetadataForUrl = useCallback(
    async (nextUrl, nextPlatform, { force = false } = {}) => {
      const normalizedUrl = normalizeUrl(nextUrl) ?? nextUrl.trim();
      if (!normalizedUrl || !nextPlatform) {
        return null;
      }

      const metadataKey = `${nextPlatform}:${normalizedUrl}`;
      const cachedMetadata = metadataCacheRef.current.get(metadataKey);
      if (!force && cachedMetadata) {
        setVideoMetadata(cachedMetadata.data);
        setMetadataStatus(cachedMetadata.status);
        setMetadataError(cachedMetadata.error ?? null);
        return cachedMetadata.status === "success" ? cachedMetadata.data : null;
      }

      if (
        metadataRequestRef.current.key === metadataKey &&
        metadataRequestRef.current.promise
      ) {
        return metadataRequestRef.current.promise;
      }

      metadataRequestRef.current.controller?.abort?.();

      const controller = new AbortController();
      const requestPromise = fetchVideoMetadata({
        inputUrl: normalizedUrl,
        platform: nextPlatform,
        signal: controller.signal,
      })
        .then((metadata) => {
          metadataCacheRef.current.set(metadataKey, {
            status: "success",
            data: metadata,
            error: null,
          });
          setVideoMetadata(metadata);
          setMetadataStatus("success");
          setMetadataError(null);
          return metadata;
        })
        .catch((error) => {
          if (error?.name === "AbortError") {
            return null;
          }

          const fallbackError =
            nextPlatform === "web" || nextPlatform === "amazon"
              ? "We couldn't pull this page's details yet."
              : "We couldn't pull this video's details yet.";
          metadataCacheRef.current.set(metadataKey, {
            status: "error",
            data: null,
            error: fallbackError,
          });
          setVideoMetadata(null);
          setMetadataStatus("error");
          setMetadataError(fallbackError);
          return null;
        })
        .finally(() => {
          if (metadataRequestRef.current.key === metadataKey) {
            metadataRequestRef.current = {
              key: null,
              promise: null,
              controller: null,
            };
          }
        });

      metadataRequestRef.current = {
        key: metadataKey,
        promise: requestPromise,
        controller,
      };
      setMetadataStatus("loading");
      setMetadataError(null);
      return requestPromise;
    },
    [],
  );

  const handleUrlChange = useCallback(
    (text) => {
      const normalized = normalizeUrl(text) ?? text;
      setUrl(normalized);
      const trimmed = text.trim();
      const platform = detectPlatform(text);

      if (!trimmed) {
        setUrlError(null);
      } else if (!isLikelyUrl(text) || !platform) {
        setUrlError("Paste a TikTok, Reel, YouTube, or webpage link");
      } else {
        setUrlError(null);
      }

      if (platform && platform !== detectedPlatform) {
        setDetectedPlatform(platform);
        Animated.spring(previewAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }).start();
        return;
      }

      if (!platform && detectedPlatform) {
        Animated.timing(previewAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setDetectedPlatform(null));
      }
    },
    [detectedPlatform, previewAnim],
  );

  const clearUrl = useCallback(() => {
    setUrl("");
    setUrlError(null);
    resetMetadataState();
    Animated.timing(previewAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDetectedPlatform(null));
  }, [previewAnim, resetMetadataState]);

  useEffect(() => {
    const incoming = prefillUrl?.trim();
    if (!incoming || incoming === lastAppliedPrefillUrl.current) {
      return;
    }

    lastAppliedPrefillUrl.current = incoming;
    handleUrlChange(incoming);
  }, [handleUrlChange, prefillUrl]);

  useEffect(() => {
    const normalizedUrl = normalizeUrl(url) ?? url.trim();
    if (!detectedPlatform || !normalizedUrl || urlError) {
      if (activeMetadataKeyRef.current) {
        resetMetadataState();
      }
      return;
    }

    const metadataKey = `${detectedPlatform}:${normalizedUrl}`;
    if (activeMetadataKeyRef.current === metadataKey) {
      return;
    }

    activeMetadataKeyRef.current = metadataKey;
    setVideoMetadata(null);
    setMetadataStatus("loading");
    setMetadataError(null);
    setCustomTitle("");
    setCustomCreator("");
    loadMetadataForUrl(normalizedUrl, detectedPlatform);
  }, [detectedPlatform, loadMetadataForUrl, resetMetadataState, url, urlError]);

  const pasteFromClipboard = useCallback(async () => {
    const clipboardText = await Clipboard.getStringAsync();

    if (!clipboardText?.trim()) {
      setUrlError("Your clipboard doesn't have a link yet.");
      shakeError();
      return;
    }

    handleUrlChange(clipboardText);
  }, [handleUrlChange, shakeError]);

  const toggleCollection = (id) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((collectionId) => collectionId !== id) : [...prev, id],
    );
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;

    const createdCollection = await addCollection({
      name,
      emoji: newCollectionEmoji,
      coverType: newCollectionCoverType,
      coverImageUrl: null,
    });

    if (createdCollection?.blockedByPaywall) {
      return;
    }

    if (!createdCollection) {
      setUrlError("That collection could not be created right now.");
      return;
    }

    trackEvent("collection_created", { source: "add_flow" });
    setSelectedCollections((prev) => [...prev, createdCollection.id]);
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionCoverType("icon");
  };

  const resetForm = useCallback(() => {
    setUrl("");
    setUrlError(null);
    setDetectedPlatform(null);
    setSelectedCategory("fitness");
    setCustomCategoryName("");
    setSelectedCollections([]);
    setReminderEnabled(false);
    setSelectedTime(DEFAULT_TIME);
    setSelectedFrequency(DEFAULT_FREQUENCY);
    setSelectedReminderDays([]);
    setSelectedReminderFollowUpDelayMinutes(DEFAULT_FOLLOW_UP_DELAY);
    setShowReminderSetup(false);
    previewAnim.setValue(0);
    resetMetadataState();
  }, [previewAnim, resetMetadataState]);

  const clearSavedState = useCallback(() => {
    setSuccessMode("saved");
    setSavedPlatform(null);
    setSavedCategory("fitness");
    setSavedHasReminder(false);
    setSavedVideoId(null);
  }, []);

  const clearSaveSuccessFallback = useCallback(() => {
    if (saveSuccessFallbackRef.current) {
      clearTimeout(saveSuccessFallbackRef.current);
      saveSuccessFallbackRef.current = null;
    }
  }, []);

  const completeSaveSuccessAnimation = useCallback(() => {
    clearSaveSuccessFallback();
    setSaveSuccessAnimation(null);
    setShowSuccess(true);
  }, [clearSaveSuccessFallback]);

  const triggerSaveSuccessHaptic = useCallback(() => {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => null);
  }, []);

  const startSaveSuccessAnimation = useCallback(
    (payload) => {
      clearSaveSuccessFallback();

      if (reduceMotion) {
        triggerSaveSuccessHaptic();
        setSaveSuccessAnimation(null);
        setShowSuccess(true);
        return;
      }

      setSaveSuccessAnimation({
        ...payload,
        nonce: Date.now(),
      });
      saveSuccessFallbackRef.current = setTimeout(() => {
        setSaveSuccessAnimation(null);
        setShowSuccess(true);
        saveSuccessFallbackRef.current = null;
      }, 680);
    },
    [clearSaveSuccessFallback, reduceMotion, triggerSaveSuccessHaptic],
  );

  useEffect(
    () => () => {
      clearSaveSuccessFallback();
    },
    [clearSaveSuccessFallback],
  );

  const dismissSuccess = useCallback(() => {
    clearSaveSuccessFallback();
    setSaveSuccessAnimation(null);
    setShowSuccess(false);
    setSaveState("idle");
  }, [clearSaveSuccessFallback]);

  const reopenSuccess = useCallback(() => {
    setShowSuccess(true);
    setSaveState("saved");
  }, []);

  const handleSaveAnother = useCallback(() => {
    dismissSuccess();
    clearSavedState();
    resetForm();
  }, [clearSavedState, dismissSuccess, resetForm]);

  const handleViewLibrary = useCallback(() => {
    if (!savedVideoId) return;

    const highlight = savedVideoId;
    dismissSuccess();
    clearSavedState();
    resetForm();
    router.push({
      pathname: "/(tabs)/saved",
      params: { highlight },
    });
  }, [clearSavedState, dismissSuccess, resetForm, router, savedVideoId]);

  const handleDone = useCallback(() => {
    dismissSuccess();
    clearSavedState();
    resetForm();
    router.push("/(tabs)");
  }, [clearSavedState, dismissSuccess, resetForm, router]);

  const handleSave = useCallback(async () => {
    if (!url.trim()) {
      setUrlError("Paste a TikTok, Reel, YouTube, or webpage link");
      return;
    }

    if (!isLikelyUrl(url)) {
      setUrlError("Paste a TikTok, Reel, YouTube, or webpage link");
      shakeError();
      return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
      setUrlError("Paste a TikTok, Reel, YouTube, or webpage link");
      shakeError();
      return;
    }

    const resolvedCategory =
      selectedCategory === "other"
        ? customCategoryName.trim() || "other"
        : selectedCategory;

    const fetchedMetadata =
      videoMetadata ??
      (await loadMetadataForUrl(url, platform, {
        force: metadataStatus === "idle",
      }));
    const resolvedTitle =
      customTitle.trim() ||
      fetchedMetadata?.title?.trim() ||
      getGeneratedTitle(platform, url);
    const resolvedCreator =
      customCreator.trim() ||
      fetchedMetadata?.creator?.trim() ||
      (platform === "web" || platform === "amazon"
        ? getGeneratedTitle(platform, url)
        : "Unknown creator");
    const resolvedThumbnailUrl =
      fetchedMetadata?.thumbnailUrl ||
      getSafeThumbnailUrl(
        url,
        platform,
        getCategoryMeta(selectedCategory).thumbnail,
      );
    const resolvedVideoUrl =
      fetchedMetadata?.videoUrl?.trim() ||
      normalizeVideoUrlForSave(url) ||
      normalizeUrl(url) ||
      url.trim();

    const video = createMockVideo({
      videoUrl: resolvedVideoUrl,
      platform,
      title: resolvedTitle,
      creator: resolvedCreator,
      category: resolvedCategory,
      collections: selectedCollections,
      thumbnailUrl: resolvedThumbnailUrl,
      reminderEnabled,
      reminderTime: selectedTime,
      reminderFrequency: selectedFrequency,
      reminderDays: selectedReminderDays,
      reminderFollowUpDelayMinutes: selectedReminderFollowUpDelayMinutes,
    });

    setSaveState("saving");
    if (reduceMotion) {
      saveAnim.setValue(1);
    } else {
      Animated.sequence([
        Animated.timing(saveAnim, {
          toValue: 0.98,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(saveAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }

    const isFirstSave = useRecallStore.getState().videos.length === 0;
    const saveSource = prefillUrl?.trim() ? "share_extension" : "manual";
    const savedVideo = await addVideo(video);
    if (savedVideo?.blockedByPaywall) {
      setSaveState("idle");
      return;
    }

    if (!savedVideo) {
      setSaveState("idle");
      setUrlError("Recall could not save this video to Supabase right now.");
      shakeError();
      return;
    }

    if (savedVideo.alreadySaved) {
      setSuccessMode("duplicate");
      setSavedHasReminder(false);
      setSavedVideoId(savedVideo.id);
      setSaveState("saved");
      startSaveSuccessAnimation({
        thumbnailUrl: resolvedThumbnailUrl,
        title: resolvedTitle,
        platform,
      });
      return;
    }

    trackEvent("save_created", {
      platform: toAnalyticsPlatform(platform),
      save_source: saveSource,
      is_first_save: isFirstSave,
      has_reminder: Boolean(reminderEnabled),
    });

    setSuccessMode("saved");
    setSavedPlatform(platform);
    setSavedCategory(resolvedCategory);
    setSavedHasReminder(reminderEnabled);
    setSavedVideoId(savedVideo.id);
    setSaveState("saved");
    startSaveSuccessAnimation({
      thumbnailUrl: savedVideo.thumbnailUrl ?? resolvedThumbnailUrl,
      title: savedVideo.title ?? resolvedTitle,
      platform,
    });
  }, [
    addVideo,
    customCategoryName,
    customCreator,
    customTitle,
    loadMetadataForUrl,
    metadataStatus,
    prefillUrl,
    reduceMotion,
    reminderEnabled,
    saveAnim,
    selectedCategory,
    selectedCollections,
    selectedFrequency,
    selectedReminderFollowUpDelayMinutes,
    selectedReminderDays,
    selectedTime,
    shakeError,
    startSaveSuccessAnimation,
    url,
    videoMetadata,
  ]);

  const previewTitle =
    customTitle.trim() ||
    videoMetadata?.title?.trim() ||
    (detectedPlatform ? getGeneratedTitle(detectedPlatform, url) : "");
  const previewCreator =
    customCreator.trim() ||
    videoMetadata?.creator?.trim() ||
    (detectedPlatform === "web" || detectedPlatform === "amazon"
      ? getGeneratedTitle(detectedPlatform, url)
      : "Unknown creator");
  const previewCategory =
    selectedCategory === "other"
      ? customCategoryName.trim() || "other"
      : selectedCategory;
  const previewThumbnailUrl = detectedPlatform
    ? videoMetadata?.thumbnailUrl ||
      getSafeThumbnailUrl(
        url,
        detectedPlatform,
        getCategoryMeta(previewCategory).thumbnail,
      )
    : null;
  const shouldShowMetadataInputs =
    !!detectedPlatform && metadataStatus === "error";

  return {
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
    metadataError,
    shouldShowMetadataInputs,
    showSuccess,
    successMode,
    saveSuccessAnimation,
    savedPlatform,
    savedCategory,
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
    handleDone,
    dismissSuccess,
    reopenSuccess,
    completeSaveSuccessAnimation,
    triggerSaveSuccessHaptic,
    resetForm,
  };
}
