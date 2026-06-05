import { create } from "zustand";
import { PLAN_TIERS } from "../utils/freemium";

export const usePaywallStore = create((set) => ({
  tier: PLAN_TIERS.FREE,
  isVisible: false,
  trigger: null,
  source: null,
  showPaywall: (trigger, source = "app") =>
    set({
      isVisible: true,
      trigger,
      source,
    }),
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
