import { Request, Response } from "express";
import AuthService from "../services/authService";
import { auth } from "../config/firebase";

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        [key: string]: any;
      };
    }
  }
}

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: "Dados incompletos" });
      return;
    }

    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      const user = await AuthService.register({
        firebaseUid: userRecord.uid,
        email,
        name,
      });

      res.status(201).json({
        firebaseUid: userRecord.uid,
        user,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "E-mail e senha são obrigatórios" });
      return;
    }
    try {
      const { idToken, firebaseUid, user, sessionToken } =
        await AuthService.login(email, password);
      res.status(200).json({
        firebaseUid,
        idToken,
        user,
        sessionToken,
      });
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async googleLogin(req: Request, res: Response): Promise<void> {
    const { idToken, firebaseUid, email, name, imageUrl } = req.body;

    if (!idToken) {
      res.status(400).json({ message: "idToken é obrigatório" });
      return;
    }

    try {
      const result = await AuthService.googleLogin({
        idToken,
        firebaseUid,
        email,
        name,
        imageUrl,
      });
      if (!result.user) {
        res
          .status(404)
          .json({ message: "Usuário não encontrado, complete o registro" });
        return;
      }
      res.status(200).json({
        message: "Login com Google bem-sucedido",
        idToken: result.idToken,
        firebaseUid: result.firebaseUid,
        user: result.user,
        sessionToken: result.sessionToken,
      });
      return;
    } catch (error: any) {
      console.error("Erro no login com Google:", error);
      res.status(401).json({
        message: error.message,
        details:
          "Verifique se todos os campos obrigatórios foram fornecidos (email, name, )",
      });
      return;
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const user = await AuthService.verifyFirebaseUid(firebaseUid);

      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      res.status(200).json({
        message: "Autenticação bem-sucedida",
        user,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Novo endpoint para login com token de sessão
  async loginWithSession(req: Request, res: Response): Promise<void> {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      res.status(400).json({ message: "Token de sessão é obrigatório" });
      return;
    }

    try {
      const result = await AuthService.loginWithSessionToken(sessionToken);
      res.status(200).json({
        message: "Login com token de sessão bem-sucedido",
        firebaseUid: result.firebaseUid,
        user: result.user,
        sessionToken: result.sessionToken,
      });
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  // Endpoint para criar token estendido
  async createExtendedToken(req: Request, res: Response): Promise<void> {
    const { durationInDays = 30 } = req.body;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({ message: "Usuário não autenticado" });
      return;
    }

    try {
      const result = await AuthService.createExtendedFirebaseToken(
        firebaseUid,
        durationInDays
      );
      res.status(200).json({
        message: `Token estendido criado com duração de ${durationInDays} dias`,
        customToken: result.customToken,
        sessionToken: result.sessionToken,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // Endpoint para logout (remove token de sessão)
  async logout(req: Request, res: Response): Promise<void> {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      res.status(400).json({ message: "Token de sessão é obrigatório" });
      return;
    }

    try {
      const result = await AuthService.logout(sessionToken);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // Endpoint para logout de todas as sessões
  async logoutAllSessions(req: Request, res: Response): Promise<void> {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({ message: "Usuário não autenticado" });
      return;
    }

    try {
      const result = await AuthService.logoutAllSessions(firebaseUid);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new AuthController();
