import { Request, Response } from "express";
import GroupService from "../services/groupService";
import prisma from "../prisma/database";

class GroupController {
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const { name, description } = req.body;
      const image = req.file;

      const group = await GroupService.createGroup(firebaseUid, {
        createdBy: firebaseUid,
        name,
        description,
        image,
      });

      res.status(201).json({
        message: "Grupo criado com sucesso",
        group,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getAllGroups(req: Request, res: Response): Promise<void> {
    try {
      const groups = await GroupService.getGroups();
      res.status(200).json(groups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getGroupsByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const groups = await GroupService.getGroupsByUserId(userId);
      res.status(200).json(groups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getGroupById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const group = await GroupService.getGroupById(id);
      res.status(200).json(group);
    } catch (error: any) {
      if (error.message.includes("não encontrado")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  }

  async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      const members = await GroupService.getMembers(groupId);
      res.status(200).json(members);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async addUserToGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { userId, permission } = req.body;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const requester = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!requester) {
        res.status(404).json({ message: "Usuário não encontrado" });
        return;
      }

      const isAdmin = await prisma.userGroup.findFirst({
        where: {
          userId: requester.id,
          groupId,
          permission: "admin",
        },
      });

      const isCreator = await prisma.group.findFirst({
        where: {
          id: groupId,
          createdBy: requester.id,
        },
      });

      if (!isAdmin && !isCreator) {
        res.status(403).json({
          message:
            "Você não tem permissão para adicionar usuários a este grupo",
        });
        return;
      }

      const result = await GroupService.addUserToGroup({
        groupId,
        userId,
        permission,
      });

      res.status(200).json({
        message: "Usuário adicionado ao grupo com sucesso",
        result,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getInfoGroupById(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const groupInfo = await GroupService.getInfoGroup(groupId);
      res.status(200).json(groupInfo);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async joinGroupByInvite(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        res.status(404).json({ message: "Usuário não encontrado" });
        return;
      }

      const result = await GroupService.addUserToGroup({
        groupId,
        userId: user.id,
        permission: "view",
      });

      res.status(200).json({
        message: "Você entrou no grupo com sucesso",
        result,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        res.status(404).json({ message: "Usuário não encontrado" });
        return;
      }

      const isCreator = await prisma.group.findFirst({
        where: {
          id: groupId,
          createdBy: user.id,
        },
      });

      if (isCreator) {
        res.status(400).json({
          message:
            "O criador do grupo não pode sair. Você deve excluir o grupo ou transferir a propriedade para outro usuário.",
        });
        return;
      }

      const result = await GroupService.removeUserFromGroup(groupId, user.id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async removeUserFromGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, userId } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const requester = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!requester) {
        res.status(404).json({ message: "Usuário não encontrado" });
        return;
      }

      const isAdmin = await prisma.userGroup.findFirst({
        where: {
          userId: requester.id,
          groupId,
          permission: "admin",
        },
      });

      const isCreator = await prisma.group.findFirst({
        where: {
          id: groupId,
          createdBy: requester.id,
        },
      });

      if (!isAdmin && !isCreator) {
        res.status(403).json({
          message: "Você não tem permissão para remover usuários deste grupo",
        });
        return;
      }

      const userToRemove = await prisma.user.findUnique({
        where: { id: userId },
      });

      const groupInfo = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (
        groupInfo &&
        userToRemove &&
        groupInfo.createdBy === userToRemove.id
      ) {
        res
          .status(403)
          .json({ message: "Não é possível remover o criador do grupo" });
        return;
      }

      const result = await GroupService.removeUserFromGroup(groupId, userId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { name, description } = req.body;
      const image = req.file;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const group = await GroupService.updateGroup(groupId, {
        name,
        description,
        image,
      });

      res.status(200).json({
        message: "Grupo atualizado com sucesso",
        group,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      const group = await GroupService.deleteGroup(id, firebaseUid);
      res.status(200).json({
        message: "Grupo excluído com sucesso",
        group,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateUserPermission(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, userId } = req.params;
      const { permission } = req.body;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      // Verificar se a permissão solicitada é válida
      if (!["view", "edit"].includes(permission)) {
        res.status(400).json({
          message:
            "Permissão inválida. As permissões válidas são 'view' e 'edit'",
        });
        return;
      }

      const requester = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!requester) {
        res.status(404).json({ message: "Usuário não encontrado" });
        return;
      }

      // Verificar se o solicitante tem permissão de admin no grupo
      const isAdmin = await prisma.userGroup.findFirst({
        where: {
          userId: requester.id,
          groupId,
          permission: "admin",
        },
      });

      const isCreator = await prisma.group.findFirst({
        where: {
          id: groupId,
          createdBy: requester.id,
        },
      });

      if (!isAdmin && !isCreator) {
        res.status(403).json({
          message: "Você não tem permissão para editar permissões neste grupo",
        });
        return;
      }

      const result = await GroupService.updateUserPermission({
        groupId,
        userId,
        permission,
      });

      res.status(200).json({
        message: "Permissão do usuário atualizada com sucesso",
        result,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new GroupController();
