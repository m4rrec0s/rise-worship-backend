import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.resolve(
  __dirname,
  "../../serviceAccountKey.json"
);

let serviceAccount;
try {
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  } else {
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error("Credenciais do Firebase não encontradas");
    }
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
  }
} catch (error) {
  throw error;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://riseworship-ee5b3-default-rtdb.firebaseio.com`,
  });
}

export const auth = admin.auth();
