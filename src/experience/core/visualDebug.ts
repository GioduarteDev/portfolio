export type VisualDebugState = {
  enabled: boolean;
  paused: boolean;
  freezeTime: boolean;
  freezeParticles: boolean;
  hideCursor: boolean;
  homeProgress?: number;
  transitionProgress?: number;
  projectsOffset?: number;
};

export type VisualDebugPatch = Partial<
  Omit<VisualDebugState, "enabled">
>;

export type VisualDebugController = {
  readonly state: VisualDebugState;
  setState: (patch: VisualDebugPatch) => void;
};

declare global {
  interface Window {
    __UNSEEN_DEBUG__?: VisualDebugController;
  }
}

const parseBoolean = (
  params: URLSearchParams,
  key: string,
  fallback: boolean,
) => {
  const value = params.get(key);
  if (value === null) return fallback;
  return value === "1" || value.toLowerCase() === "true";
};

const parseProgress = (
  params: URLSearchParams,
  key: string,
  maximum = 1,
) => {
  const rawValue = params.get(key);
  if (rawValue === null) return undefined;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(maximum, Math.max(0, value));
};

export const readVisualDebugState = (
  search = window.location.search,
): VisualDebugState => {
  const params = new URLSearchParams(search);
  const enabled = params.get("debug") === "1";
  const hasProgressOverride =
    params.has("homeProgress") ||
    params.has("transitionProgress") ||
    params.has("transition") ||
    params.has("projectsOffset");

  return {
    enabled,
    paused: enabled && parseBoolean(params, "pause", hasProgressOverride),
    freezeTime: enabled && parseBoolean(params, "freezeTime", false),
    freezeParticles:
      enabled && parseBoolean(params, "freezeParticles", false),
    hideCursor: enabled && parseBoolean(params, "hideCursor", false),
    homeProgress: enabled
      ? parseProgress(params, "homeProgress")
      : undefined,
    transitionProgress: enabled
      ? parseProgress(
          params,
          params.has("transitionProgress")
            ? "transitionProgress"
            : "transition",
        )
      : undefined,
    projectsOffset: enabled
      ? parseProgress(params, "projectsOffset", Number.MAX_SAFE_INTEGER)
      : undefined,
  };
};

export const getDebugScreen = (
  search = window.location.search,
): "loader" | "intro" | "home" => {
  const params = new URLSearchParams(search);
  const screen = params.get("screen");
  if (screen === "loader" || screen === "intro") return screen;
  return "home";
};

export const ensureVisualDebugController = () => {
  if (!readVisualDebugState().enabled) return null;
  if (window.__UNSEEN_DEBUG__) return window.__UNSEEN_DEBUG__;

  const state = readVisualDebugState();
  const controller: VisualDebugController = {
    state,
    setState: (patch) => {
      Object.assign(state, patch);
      window.dispatchEvent(
        new CustomEvent<VisualDebugState>(
          "unseen-debug-change",
          { detail: { ...state } },
        ),
      );
    },
  };

  window.__UNSEEN_DEBUG__ = controller;
  return controller;
};

export const getVisualDebugStateFromEvent = (
  event: Event,
): VisualDebugState | null => {
  if (!(event instanceof CustomEvent)) return null;
  const state = event.detail as VisualDebugState;
  return state?.enabled ? state : null;
};
