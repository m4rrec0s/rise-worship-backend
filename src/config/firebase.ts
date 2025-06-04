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
    if (!process.env.GOOGLE_PROJECT_ID) {
      throw new Error("Credenciais do Firebase não encontradas");
    }
    serviceAccount = {
      projectId: process.env.GOOGLE_PROJECT_ID,
      privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
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

export const createCustomToken = async (uid: string, customClaims?: object) => {
  try {
    const customToken = await auth.createCustomToken(uid, customClaims);
    return customToken;
  } catch (error) {
    throw new Error(`Erro ao criar token customizado: ${error}`);
  }
};
