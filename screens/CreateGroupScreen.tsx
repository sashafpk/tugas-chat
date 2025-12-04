import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { rnAuth, rnDb } from "../firebase";

type UserItem = { uid: string; email: string; displayName?: string; username?: string };

export default function CreateGroupScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [err, setErr] = useState("");

  const me = rnAuth.currentUser;

  useEffect(() => {
    setErr("");

    if (!me) {
      navigation.replace("Groups");
      return;
    }

    const unsub = rnDb.collection("users").onSnapshot(
      (snap) => {
        if (!snap) {
          setUsers([]);
          return;
        }
        const arr: UserItem[] = [];
        snap.forEach((d) => {
          const u = d.data() as UserItem;
          if (u.uid !== me.uid) arr.push(u);
        });
        setUsers(arr);
      },
      (error) => {
        setErr(error?.message ?? "Failed to load users");
        setUsers([]);
      }
    );

    return unsub;
  }, [me, navigation]);

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  async function create() {
    if (!me) return;
    if (!name.trim() || selected.size === 0) return;

    const memberUids = Array.from(new Set([me.uid, ...Array.from(selected)]));

    const docRef = await rnDb.collection("groups").add({
      name: name.trim(),
      members: memberUids,
      createdBy: me.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      lastAt: firestore.FieldValue.serverTimestamp(),
    });

    navigation.replace("GroupChat", {
      groupId: docRef.id,
      groupName: name.trim(),
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.h1}>Create Group</Text>

      <TextInput
        placeholder="Group name"
        placeholderTextColor="#777"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.label}>Select members</Text>

      {!!err && <Text style={styles.errText}>{err}</Text>}

      <FlatList
        data={users}
        keyExtractor={(u) => u.uid}
        renderItem={({ item }) => {
          const on = selected.has(item.uid);
          return (
            <Pressable style={styles.userRow} onPress={() => toggle(item.uid)}>
              <View style={[styles.checkbox, on && styles.checkboxOn]}>
                {on && <View style={styles.checkboxDot} />}
              </View>
              <Text style={styles.userText}>
                {item.username || item.displayName || item.email}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {err ? "" : "No other users found. Register another account first."}
          </Text>
        }
      />

      <Pressable style={styles.button} onPress={create}>
        <Text style={styles.btnText}>Create</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000", padding: 16 },
  h1: { fontSize: 24, fontWeight: "800", color: "#ffffff", marginBottom: 12 },
  input: {
    backgroundColor: "#111111",
    color: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ff4fd8",
  },
  label: { color: "#aaaaaa", marginVertical: 8 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222222",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ff4fd8",
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxOn: { backgroundColor: "#ff4fd8" },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000000",
  },
  userText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  button: {
    backgroundColor: "#ff4fd8",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#000000", fontWeight: "900" },
  errText: { color: "#ff9aa8", marginBottom: 6 },
  emptyText: { paddingVertical: 12, color: "#666666" },
});
