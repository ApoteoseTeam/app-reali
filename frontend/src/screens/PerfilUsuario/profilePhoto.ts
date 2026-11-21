import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";

const photoKey = (userId: number) => `reali.profile-photo.v1.${userId}`;
const dataUri = (base64: string) => `data:image/jpeg;base64,${base64}`;

export async function readProfilePhoto(userId: number) {
  const key = photoKey(userId);
  if (Platform.OS === "web") return window.localStorage.getItem(key);
  const file = new File(Paths.document, `${key}.jpg`);
  return file.exists ? dataUri(await file.base64()) : null;
}

export async function saveProfilePhoto(userId: number, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(asset.width, asset.height) > 512) {
      context.resize(asset.width >= asset.height ? { width: 512 } : { height: 512 });
    }
    const image = await context.renderAsync();
    try {
      const photo = await image.saveAsync({ base64: true, compress: 0.82, format: SaveFormat.JPEG });
      if (!photo.base64) throw new Error("Não foi possível preparar a imagem selecionada.");
      const key = photoKey(userId);
      const uri = dataUri(photo.base64);
      if (Platform.OS === "web") {
        window.localStorage.setItem(key, uri);
      } else {
        const file = new File(Paths.document, `${key}.jpg`);
        try {
          await file.write(photo.base64, { encoding: "base64" });
        } finally {
          const cached = new File(photo.uri);
          if (cached.exists) cached.delete();
        }
      }
      return uri;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

export function removeProfilePhoto(userId: number) {
  const key = photoKey(userId);
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
  } else {
    const file = new File(Paths.document, `${key}.jpg`);
    if (file.exists) file.delete();
  }
}
