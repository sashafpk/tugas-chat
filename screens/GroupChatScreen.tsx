import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import { rnAuth, rnDb } from "../firebase";

type Msg = {
  id: string;
  text: string;
  senderId: string;
  senderEmail: string;
  imageBase64?: string;
  imageType?: string;
  createdAt?: any;
};

export default function GroupChatScreen({ route, navigation }: any) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const params = route?.params;
  const groupId = params?.groupId as string | undefined;
  const groupName = params?.groupName as string | undefined;

  const me = rnAuth.currentUser;

  const cacheKey = groupId ? `messages_${groupId}` : "";

  useEffect(() => {
    if (!groupId) {
      navigation.replace("Groups");
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw) as Msg[];
          setMessages(cached);
        }
      } catch {}
    })();

    const unsub = rnDb
      .collection("groups")
      .doc(groupId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        async (snap) => {
          if (!snap) return;
          const arr: Msg[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setMessages(arr);
          try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(arr.slice(0, 100)));
          } catch {}
        },
        () => {}
      );

    return unsub;
  }, [groupId, navigation, cacheKey]);

  const sendText = async () => {
    if (!groupId || !me) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    setText("");

    try {
      await rnDb
        .collection("groups")
        .doc(groupId)
        .collection("messages")
        .add({
          text: trimmed,
          senderId: me.uid,
          senderEmail: me.email,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      await rnDb.collection("groups").doc(groupId).set(
        {
          lastMessage: trimmed,
          lastAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } finally {
      setSending(false);
    }
  };

  const pickAndSendImage = async () => {
    if (!groupId || !me) return;

    const res = await launchImageLibrary({
      mediaType: "photo",
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.5,
      maxWidth: 900,
      maxHeight: 900,
    });

    const asset = res.assets && res.assets[0];
    if (!asset?.base64) return;

    const mime = asset.type || "image/jpeg";
    const base64Data = asset.base64;

    setSending(true);

    try {
      await rnDb
        .collection("groups")
        .doc(groupId)
        .collection("messages")
        .add({
          text: "",
          imageBase64: base64Data,
          imageType: mime,
          senderId: me.uid,
          senderEmail: me.email,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      await rnDb.collection("groups").doc(groupId).set(
        {
          lastMessage: "Image",
          lastAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const mine = me && item.senderId === me.uid;
    const imgUri =
      item.imageBase64
        ? `data:${item.imageType || "image/jpeg"};base64,${item.imageBase64}`
        : undefined;

    return (
      <View style={[styles.msgRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!mine && <Text style={styles.sender}>{item.senderEmail}</Text>}

          {!!imgUri && (
            <Image source={{ uri: imgUri }} style={styles.image} />
          )}

          {!!item.text && (
            <Text style={mine ? styles.textMine : styles.textTheirs}>
              {item.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>{groupName || "Group"}</Text>

      <FlatList
        data={messages}
        inverted
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.composer}>
          <Pressable onPress={pickAndSendImage} style={styles.imageBtn}>
            <Text style={styles.imageBtnText}>+</Text>
          </Pressable>

          <TextInput
            placeholder="Type message..."
            placeholderTextColor="#777"
            value={text}
            onChangeText={setText}
            style={styles.composerInput}
            multiline
          />

          <Pressable onPress={sendText} disabled={sending} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>{sending ? "..." : "Send"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222222",
  },
  msgRow: { flexDirection: "row", marginVertical: 5, paddingHorizontal: 8 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleMine: { backgroundColor: "#ff4fd8", borderTopRightRadius: 6 },
  bubbleTheirs: { backgroundColor: "#ffffff", borderTopLeftRadius: 6 },
  sender: { color: "#ff4fd8", fontSize: 11, fontWeight: "700", marginBottom: 2 },
  textMine: { color: "#000000", fontSize: 16, lineHeight: 20, fontWeight: "700" },
  textTheirs: { color: "#000000", fontSize: 16, lineHeight: 20 },
  image: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#111111",
  },
  composer: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222222",
    backgroundColor: "#000000",
    alignItems: "flex-end",
  },
  composerInput: {
    flex: 1,
    backgroundColor: "#111111",
    color: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ff4fd8",
  },
  sendBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#ff4fd8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sendBtnText: { color: "#000000", fontWeight: "900" },
  imageBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ff4fd8",
    justifyContent: "center",
    alignItems: "center",
  },
  imageBtnText: { color: "#000000", fontSize: 22, fontWeight: "900" },
});
