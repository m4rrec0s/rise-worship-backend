import crypto from "crypto";
import prisma from "../prisma/database";

interface SessionData {
  id: string;
  sessionToken: string;
  userId: string;
  firebaseUid: string;
  expiresAt: Date | null;
  createdAt: Date;
}

class SessionService {
  async createSessionToken(firebaseUid: string): Promise<string> {
    const sessionToken = crypto.randomBytes(64).toString("hex");

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    await prisma.session.deleteMany({
      where: { firebaseUid },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        firebaseUid,
        expiresAt: null,
        createdAt: new Date(),
      },
    });

    return sessionToken;
  }
  async createExtendedToken(
    firebaseUid: string,
    durationInDays: number = 30
  ): Promise<string> {
    const sessionToken = crypto.randomBytes(64).toString("hex");

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationInDays);

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        firebaseUid,
        expiresAt,
        createdAt: new Date(),
      },
    });

    return sessionToken;
  }
  async verifySessionToken(sessionToken: string): Promise<SessionData | null> {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: { sessionToken },
      });
      return null;
    }

    return {
      id: session.id,
      sessionToken: session.sessionToken,
      userId: session.userId,
      firebaseUid: session.firebaseUid,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }
  async removeSessionToken(sessionToken: string): Promise<boolean> {
    try {
      await prisma.session.delete({
        where: { sessionToken },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeAllUserSessions(firebaseUid: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { firebaseUid },
    });
  }

  async cleanExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

export default new SessionService();
