import { create } from "zustand";
import {
  areFreemiumLimitsEnforced,
  arePaywallsEnabled,
  PAYWALL_TRIGGERS,
  PLAN_TIERS,
} from "../utils/freemium";

function isLimitPaywallTrigger(trigger) {
  return (
    trigger === PAYWALL_TRIGGERS.SAVE_VIDEO ||
    trigger === PAYWALL_TRIGGERS.CREATE_REMINDER ||
    trigger === PAYWALL_TRIGGERS.CREATE_COLLECTION
  );
}

export const usePaywallStore = create((set) => ({
  tier: PLAN_TIERS.FREE,
  isVisible: false,
  trigger: null,
  source: null,
  showPaywall: (trigger, source = "app") => {
    // Free v1.0: paywalls are completely unreachable.
    if (!arePaywallsEnabled()) {
      return;
    }

    // Defense in depth: never open a blocking limit paywall when limits are soft.
    if (!areFreemiumLimitsEnforced() && isLimitPaywallTrigger(trigger)) {
      return;
    }

    set({
      isVisible: true,
      trigger,
      source,
    });
  },
  hidePaywall: () =>
    set({
      isVisible: false,
      trigger: null,
      source: null,
    }),
  setTier: (tier) =>
    set({
      tier,
    }),
}));
