import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { rnAuth, rnDb } from "../firebase";

type Group = {
  id: string;
  name: string;
  members: string[];
  lastMessage?: string;
  lastAt?: any;
};

export default function GroupsScreen({ navigation }: any) {
  const me = rnAuth.currentUser!;
  const [groups, setGroups] = useState<Group[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");

    const queryRef = rnDb
      .collection("groups")
      .where("members", "array-contains", me.uid);

    const unsub = queryRef.onSnapshot(
      (snap) => {
        if (!snap) {
          setGroups([]);
          return;
        }
        const arr = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setGroups(arr);
      },
      (error) => {
        setErr(error?.message ?? "Failed to load groups");
        setGroups([]);
      }
    );

    return unsub;
  }, [me.uid]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Groups</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={() => navigation.navigate("CreateGroup")}>
            <Text style={styles.link}>New Group</Text>
          </Pressable>
          <Pressable onPress={() => rnAuth.signOut()}>
            <Text style={styles.link}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {!!err && <Text style={styles.errText}>{err}</Text>}

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate("GroupChat", {
                groupId: item.id,
                groupName: item.name,
              })
            }
          >
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.sub}>
              {item.lastMessage || "No messages yet"}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No groups yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222222",
  },
  h1: { fontSize: 28, fontWeight: "800", color: "#ffffff" },
  link: { color: "#ff4fd8", fontWeight: "800" },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222222",
    backgroundColor: "#000000",
  },
  title: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  sub: { color: "#aaaaaa", fontSize: 13, marginTop: 2 },
  errText: {
    color: "#ff9aa8",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyText: { padding: 16, color: "#666666" },
});
