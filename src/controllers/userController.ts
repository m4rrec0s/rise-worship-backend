import { Request, Response } from "express";
import UserService from "../services/userService";

class UserController {
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserService.getAllUsers();
      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "ID do usuário é obrigatório" });
      return;
    }

    try {
      const user = await UserService.getUserById(id);
      res.status(200).json(user);
    } catch (error: any) {
      if (error.message.includes("não encontrado")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({ message: "Usuário não autenticado" });
      return;
    }

    const { name, email } = req.body;
    const image = req.file || null;

    try {
      const updatedUser = await UserService.updateUser({
        firebaseUid,
        userData: {
          name,
          email,
          image,
        },
      });

      res.status(200).json({
        message: "Usuário atualizado com sucesso",
        user: updatedUser,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // Verificar se o usuário é admin ou está excluindo seu próprio perfil
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({ message: "Usuário não autenticado" });
      return;
    }

    try {
      await UserService.deleteUser(id);
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } catch (error: any) {
      if (error.message.includes("não encontrado")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  }
}

export default new UserController();
