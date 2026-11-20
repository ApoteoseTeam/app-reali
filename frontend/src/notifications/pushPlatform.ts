type Permission = { granted: boolean; canAskAgain: boolean };
type Listener = { remove: () => void };

export type PushPlatform = {
  platform: "ANDROID" | "IOS";
  permission(prompt: boolean): Promise<Permission>;
  token(nativeToken?: unknown): Promise<string>;
  onReceipt(received: () => void): Listener;
  onOpen(opened: (data: unknown) => void): Listener;
  onTokenChanged(changed: (nativeToken: unknown) => void): Listener;
  lastOpen(): unknown;
  clearOpen(): void;
  clearPresented(): Promise<void>;
};
