import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility, IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";

import type { PushPlatform } from "./pushPlatform";

function pushData(response: Notifications.NotificationResponse | null) {
  return response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ? response.notification.request.content.data : null;
}

const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
const android = Platform.OS === "android";
const available = Boolean(projectId) && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

if (available) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const pushPlatform: PushPlatform | null = available ? {
  platform: android ? "ANDROID" : "IOS",
  async permission(prompt) {
    if (android) {
      await Notifications.setNotificationChannelAsync("reali", {
        name: "Atualizações do Reali",
        importance: AndroidImportance.DEFAULT,
        lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = (permission: Notifications.NotificationPermissionsStatus) =>
      permission.granted || permission.ios?.status === IosAuthorizationStatus.PROVISIONAL;
    const permission = prompt && !granted(current) && current.canAskAgain
      ? await Notifications.requestPermissionsAsync() : current;
    return { granted: granted(permission), canAskAgain: permission.canAskAgain };
  },
  async token(nativeToken) {
    const options = { projectId, devicePushToken: nativeToken as Notifications.DevicePushToken | undefined };
    return (await Notifications.getExpoPushTokenAsync(options)).data;
  },
  onReceipt: callback => Notifications.addNotificationReceivedListener(callback),
  onOpen: callback => Notifications.addNotificationResponseReceivedListener(
    response => callback(pushData(response)),
  ),
  onTokenChanged: callback => Notifications.addPushTokenListener(callback),
  lastOpen: () => pushData(Notifications.getLastNotificationResponse()),
  clearOpen: Notifications.clearLastNotificationResponse,
  clearPresented: Notifications.dismissAllNotificationsAsync,
} : null;
