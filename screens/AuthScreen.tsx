import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { rnAuth, rnDb } from "../firebase";

export default function AuthScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function upsertUser(uid: string, emailVal: string, usernameVal: string) {
    const ref = rnDb.collection("users").doc(uid);
    await ref.set(
      {
        uid,
        email: emailVal.toLowerCase(),
        username: usernameVal.toLowerCase(),
        displayName: usernameVal,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async function findEmailByUsername(u: string) {
    const snap = await rnDb
      .collection("users")
      .where("username", "==", u.toLowerCase())
      .limit(1)
      .get();

    if (snap.empty) return null;
    return (snap.docs[0].data() as any).email as string;
  }

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!username.trim()) throw new Error("Username wajib diisi");
        if (!email.trim()) throw new Error("Email wajib diisi");

        const existing = await rnDb
          .collection("users")
          .where("username", "==", username.toLowerCase())
          .limit(1)
          .get();

        if (!existing.empty) throw new Error("Username sudah dipakai");

        const cred = await rnAuth.createUserWithEmailAndPassword(
          email.trim(),
          password
        );
        const em = cred.user.email;
        if (em) await upsertUser(cred.user.uid, em, username.trim());
      } else {
        if (!username.trim()) throw new Error("Username wajib diisi");
        const em = await findEmailByUsername(username.trim());
        if (!em) throw new Error("Username tidak ditemukan");
        const cred = await rnAuth.signInWithEmailAndPassword(em, password);
        const realEmail = cred.user.email;
        if (realEmail) await upsertUser(cred.user.uid, realEmail, username.trim());
      }
    } catch (e: any) {
      const msg = e?.message ?? "Auth error";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.h1}>
          {isRegister ? "Create Account" : "Welcome Back"}
        </Text>

        <TextInput
          placeholder="Username"
          placeholderTextColor="#777"
          style={styles.input}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        {isRegister && (
          <TextInput
            placeholder="Email"
            placeholderTextColor="#777"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        )}

        <TextInput
          placeholder="Password (min 6)"
          placeholderTextColor="#777"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!!err && <Text style={styles.error}>{err}</Text>}

        <Pressable style={styles.button} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnText}>
              {isRegister ? "Register" : "Login"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setIsRegister(v => !v)} style={{ marginTop: 10 }}>
          <Text style={styles.link}>
            {isRegister ? "Already have account? Login" : "New here? Register"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000", justifyContent: "center" },
  card: {
    backgroundColor: "#111111",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#222222",
  },
  h1: { color: "#ffffff", fontSize: 26, fontWeight: "800" },
  input: {
    backgroundColor: "#000000",
    color: "#ffffff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff4fd8",
  },
  button: {
    backgroundColor: "#ff4fd8",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#000000", fontWeight: "900" },
  link: { color: "#ffffff", fontWeight: "600" },
  error: { color: "#ff9aa8" },
});
