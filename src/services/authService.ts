import { auth, createCustomToken } from "../config/firebase";
import axios from "axios";
import prisma from "../prisma/database";
import SessionService from "./sessionService";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

interface RegisterInput {
  firebaseUid: string;
  email: string;
  name: string;
  imageUrl?: string;
}

interface GoogleLoginInput {
  idToken: string;
  firebaseUid?: string;
  email: string;
  name: string;
  imageUrl?: string;
}

class AuthService {
  async register({ firebaseUid, email, name, imageUrl }: RegisterInput) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { firebaseUid },
      });

      if (existingUser) {
        throw new Error("Usuário já registrado");
      }

      const user = await prisma.user.create({
        data: {
          firebaseUid,
          email,
          name,
          imageUrl,
        },
      });

      return user;
    } catch (error: any) {
      throw new Error(`Erro ao registrar usuário: ${error.message}`);
    }
  }

  async googleLogin({
    idToken,
    firebaseUid,
    email,
    name,
    imageUrl,
  }: GoogleLoginInput) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      if (firebaseUid && firebaseUid !== uid) {
        throw new Error("firebaseUid não corresponde ao idToken");
      }

      let user = await prisma.user.findUnique({
        where: { firebaseUid: uid },
      });

      if (!user) {
        if (!email) {
          throw new Error("Email é necessário para o registro");
        }
        if (!name) {
          throw new Error("Nome é necessário para o registro");
        }

        user = await this.register({
          firebaseUid: uid,
          email,
          name,
          imageUrl,
        });
      }
      await prisma.user.update({
        where: { firebaseUid: uid },
        data: {
          lastLogin: new Date(),
        },
      });

      // Criar token de sessão (não expira)
      const sessionToken = await SessionService.createSessionToken(uid);

      return { idToken, firebaseUid: uid, user, sessionToken };
    } catch (error: any) {
      throw new Error(`Erro ao fazer login com Google: ${error.message}`);
    }
  }

  async login(email: string, password: string) {
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          email,
          password,
          returnSecureToken: true,
        }
      );

      interface FirebaseAuthResponse {
        idToken: string;
        localId: string;
      }

      const { idToken, localId: uid } = response.data as FirebaseAuthResponse;

      const user = await prisma.user.findUnique({
        where: { firebaseUid: uid },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }
      await prisma.user.update({
        where: { firebaseUid: uid },
        data: {
          lastLogin: new Date(),
        },
      });

      // Criar token de sessão (não expira)
      const sessionToken = await SessionService.createSessionToken(uid);

      return { idToken, firebaseUid: uid, user, sessionToken };
    } catch (error: any) {
      throw new Error(
        `Erro ao fazer login: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }
  async verifyFirebaseUid(firebaseUid: string) {
    try {
      const firebaseUser = await auth.getUser(firebaseUid);
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
      });

      if (!user) {
        throw new Error("Usuário não encontrado no banco de dados");
      }

      return user;
    } catch (error: any) {
      throw new Error(`Erro ao verificar firebaseUid: ${error.message}`);
    }
  }

  // Novo método para login com token de sessão
  async loginWithSessionToken(sessionToken: string) {
    try {
      const session = await SessionService.verifySessionToken(sessionToken);

      if (!session) {
        throw new Error("Token de sessão inválido ou expirado");
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid: session.firebaseUid },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Atualizar lastLogin
      await prisma.user.update({
        where: { firebaseUid: session.firebaseUid },
        data: {
          lastLogin: new Date(),
        },
      });

      return { firebaseUid: session.firebaseUid, user, sessionToken };
    } catch (error: any) {
      throw new Error(
        `Erro ao fazer login com token de sessão: ${error.message}`
      );
    }
  }

  // Método para criar token customizado do Firebase com duração estendida
  async createExtendedFirebaseToken(
    firebaseUid: string,
    durationInDays: number = 30
  ) {
    try {
      // Criar custom token do Firebase (válido por 1 hora para troca)
      const customToken = await createCustomToken(firebaseUid, {
        sessionDuration: durationInDays,
        createdAt: new Date().toISOString(),
      });

      // Criar também um token de sessão no nosso sistema
      const sessionToken = await SessionService.createExtendedToken(
        firebaseUid,
        durationInDays
      );

      return { customToken, sessionToken };
    } catch (error: any) {
      throw new Error(`Erro ao criar token estendido: ${error.message}`);
    }
  }

  // Método para logout (remove token de sessão)
  async logout(sessionToken: string) {
    try {
      await SessionService.removeSessionToken(sessionToken);
      return { message: "Logout realizado com sucesso" };
    } catch (error: any) {
      throw new Error(`Erro ao fazer logout: ${error.message}`);
    }
  }

  // Método para logout de todas as sessões
  async logoutAllSessions(firebaseUid: string) {
    try {
      await SessionService.removeAllUserSessions(firebaseUid);
      return { message: "Logout de todas as sessões realizado com sucesso" };
    } catch (error: any) {
      throw new Error(
        `Erro ao fazer logout de todas as sessões: ${error.message}`
      );
    }
  }
}

export default new AuthService();
