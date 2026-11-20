import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { ApiError } from "../api/client";
import { enrollPush, pushNoticeId } from "../api/notificationActions";
import { api, useSession } from "../session/provider";
import { pushPlatform } from "./platform";

const installationKey = "reali.push.identity.v1";
const enabledKey = "reali.push.enabled.v1";
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
type Installation = { installation: string; installation_secret: string };
let installationLoad: Promise<Installation> | undefined;

function installation() {
  installationLoad ??= (async () => {
    const raw = await SecureStore.getItemAsync(installationKey, options);
    if (raw) {
      const saved = JSON.parse(raw) as Installation;
      if (saved.installation && /^[0-9a-f]{64}$/.test(saved.installation_secret)) return saved;
    }
    const next = {
      installation: Crypto.randomUUID(),
      installation_secret: Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, "0")).join(""),
    };
    await SecureStore.setItemAsync(installationKey, JSON.stringify(next), options);
    return next;
  })().catch(error => { installationLoad = undefined; throw error; });
  return installationLoad;
}

const deviceKey = (user: number) => `reali.push.device.${user}`;
type Status = "unavailable" | "idle" | "loading" | "active" | "denied" | "invalid" | "error";
type NotificationContext = {
  revision: number; invalidate: () => void; status: Status;
  enable: () => Promise<void>; disable: () => Promise<void>;
};
const Context = createContext<NotificationContext>({
  revision: 0, invalidate: () => undefined, status: "unavailable",
  enable: async () => undefined, disable: async () => undefined,
});

async function revoke(user: number, signal: AbortSignal) {
  const id = await SecureStore.getItemAsync(deviceKey(user), options);
  if (id && !signal.aborted) {
    try { await api.revokePush(id, signal); }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 404) throw error; }
    if (!signal.aborted) await SecureStore.deleteItemAsync(deviceKey(user), options);
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { me, workspace, status: sessionStatus } = useSession();
  const user = sessionStatus === "AUTHENTICATED" ? me?.user.id : undefined;
  const workspaceKey = workspace?.school ? workspace.key : undefined;
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [registration, setRegistration] = useState({ user, status: "idle" as Status });
  const controller = useRef<AbortController | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const handled = useRef<string | null>(null);
  const invalidate = useCallback(() => setRevision(value => value + 1), []);

  const refreshDevice = useCallback((prompt = false, nativeToken?: unknown) => {
    const signal = controller.current?.signal;
    if (!user || !pushPlatform || !signal || signal.aborted) return Promise.resolve();
    const platform = pushPlatform;
    if (running.current && nativeToken === undefined && !prompt) return running.current;
    const task = (running.current ?? Promise.resolve()).then(async () => {
      if (signal.aborted) return;
      const change = (status: Status) => { if (!signal.aborted) setRegistration({ user, status }); };
      try {
        const enabled = prompt || await SecureStore.getItemAsync(enabledKey, options) === "yes";
        if (!enabled) {
          await revoke(user, signal);
          change("idle");
          return;
        }
        if (prompt) change("loading");
        const result = await enrollPush({
          signal,
          permission: async () => (await platform.permission(prompt)).granted,
          token: () => platform.token(nativeToken),
          register: async push_token => {
            const identity = await installation();
            const device = await api.registerPush({ ...identity, push_token, platform: platform.platform }, signal);
            if (signal.aborted) return;
            await SecureStore.setItemAsync(deviceKey(user), device.id, options);
            await SecureStore.setItemAsync(enabledKey, "yes", options);
          },
        });
        if (result === "denied") await revoke(user, signal);
        if (result !== "cancelled") change(result);
      } catch {
        change("error");
      }
    }).finally(() => { if (running.current === task) running.current = null; });
    running.current = task;
    return task;
  }, [user]);

  const disable = useCallback(async () => {
    const signal = controller.current?.signal;
    if (!user || !signal || !pushPlatform) return;
    try {
      setRegistration({ user, status: "loading" });
      await running.current;
      if (signal.aborted) return;
      await SecureStore.setItemAsync(enabledKey, "no", options);
      await revoke(user, signal);
      if (!signal.aborted) setRegistration({ user, status: "idle" });
    } catch {
      if (!signal.aborted) setRegistration({ user, status: "error" });
    }
  }, [user]);

  useEffect(() => {
    if (!user || !pushPlatform) return;
    const platform = pushPlatform;
    const active = new AbortController();
    controller.current = active;
    void refreshDevice();
    const token = platform.onTokenChanged(value => { void refreshDevice(false, value); });
    const foreground = AppState.addEventListener("change", value => {
      if (value === "active") {
        invalidate();
        void refreshDevice();
      }
    });
    return () => {
      active.abort();
      if (controller.current === active) {
        controller.current = null;
        running.current = null;
      }
      handled.current = null;
      token.remove();
      foreground.remove();
      platform.clearOpen();
      void platform.clearPresented().catch(() => undefined);
    };
  }, [user, invalidate, refreshDevice]);

  useEffect(() => {
    if (!workspaceKey || !pushPlatform || !user) return;
    const platform = pushPlatform;
    const open = (data: unknown) => {
      const id = pushNoticeId(data);
      if (id && handled.current !== id) {
        handled.current = id;
        invalidate();
        router.push({ pathname: "/notificacao", params: { id } });
      }
      platform.clearOpen();
    };
    const receipt = platform.onReceipt(invalidate);
    const response = platform.onOpen(open);
    const last = platform.lastOpen();
    if (last) open(last);
    return () => { receipt.remove(); response.remove(); };
  }, [workspaceKey, user, router, invalidate]);

  const status = !pushPlatform ? "unavailable" : user === registration.user ? registration.status : "idle";
  return <Context.Provider value={{ revision, invalidate, status, enable: () => refreshDevice(true), disable }}>
    {children}
  </Context.Provider>;
}

export function useNotifications() { return useContext(Context); }
