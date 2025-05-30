import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";
import SessionService from "../services/sessionService";

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Token não fornecido" });
      return;
    }

    let token = authHeader.split(" ")[1];
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    // Primeiro tentar verificar como token de sessão
    const sessionData = await SessionService.verifySessionToken(token);
    if (sessionData) {
      // Token de sessão válido
      req.user = {
        uid: sessionData.firebaseUid,
        sessionId: sessionData.sessionToken,
        tokenType: "session",
      };
      return next();
    }

    // Se não for token de sessão, tentar como Firebase ID token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        ...decodedToken,
        tokenType: "firebase",
      };
      return next();
    } catch (firebaseError) {
      // Se ambos falharam, retornar erro
      res.status(401).json({
        error: "Token inválido",
        details:
          "Token não é válido nem como sessão nem como Firebase ID token",
      });
      return;
    }
  } catch (error: any) {
    res.status(401).json({ error: "Token inválido", details: error.message });
    return;
  }
};

// Middleware específico para tokens de sessão apenas
export const verifySessionToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Token de sessão não fornecido" });
      return;
    }

    let sessionToken = authHeader.split(" ")[1];
    if (sessionToken.startsWith("Bearer ")) {
      sessionToken = sessionToken.split(" ")[1];
    }

    const sessionData = await SessionService.verifySessionToken(sessionToken);

    if (!sessionData) {
      res.status(401).json({ error: "Token de sessão inválido ou expirado" });
      return;
    }
    req.user = {
      uid: sessionData.firebaseUid,
      sessionId: sessionData.sessionToken,
      tokenType: "session",
    };

    return next();
  } catch (error: any) {
    res.status(401).json({
      error: "Erro ao verificar token de sessão",
      details: error.message,
    });
    return;
  }
};
