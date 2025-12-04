import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";

export const rnAuth = auth();
export const rnDb = firestore();
export const rnStorage = storage();
