import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { Camera, CircleUser } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Action, Feedback } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { colors } from "../../theme/colors";
import { readProfilePhoto, removeProfilePhoto, saveProfilePhoto } from "./profilePhoto";
import { styles } from "./styles";

export function ProfileAvatar({ userId, name, role }: { userId: number; name: string; role: string }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const action = useAction();

  useFocusEffect(useCallback(() => {
    let current = true;
    setLoading(true);
    void readProfilePhoto(userId).then(
      uri => { if (current) { setPhoto(uri); setLoadError(null); } },
      () => { if (current) setLoadError("Não foi possível carregar a foto neste dispositivo."); },
    ).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [userId]));

  function choosePhoto() {
    void action.run(async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: Platform.OS !== "web",
        aspect: [1, 1],
      });
      if (picked.canceled) return;
      setPhoto(await saveProfilePhoto(userId, picked.assets[0]));
      setLoadError(null);
    });
  }

  function clearPhoto() {
    void action.run(async () => {
      removeProfilePhoto(userId);
      setPhoto(null);
      setLoadError(null);
    });
  }

  return (
    <View style={styles.avatarArea}>
      <View style={styles.avatarContorno}>
        <View style={styles.avatarBorda}>
          {photo
            ? <Image source={{ uri: photo }} style={styles.avatar} accessibilityLabel="Foto do meu perfil" testID="profile-photo" resizeMode="cover" />
            : <CircleUser size={54} color={colors.primary} />}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={photo ? "Trocar foto" : "Adicionar foto"}
          accessibilityState={{ disabled: loading || action.busy }} disabled={loading || action.busy}
          onPress={choosePhoto} testID="profile-choose-photo"
          style={[styles.editar, (loading || action.busy) && styles.desabilitado]}>
          <Camera size={17} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.identidade}>
        <Text accessibilityRole="header" style={styles.nome}>{name}</Text>
        <Text style={styles.cargo}>{role}</Text>
      </View>
      {photo && <>
        <Text style={styles.fotoNota}>Foto salva neste dispositivo.</Text>
        <Action title="Remover foto" disabled={action.busy} onPress={clearPhoto} variant="flat" testID="profile-remove-photo" />
      </>}
      <Feedback loading={loading || action.busy} error={action.error ?? loadError} />
    </View>
  );
}
