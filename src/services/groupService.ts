import prisma from "../prisma/database";
import { uploadToDrive } from "../config/googleDrive";

interface CreateGroupInput {
  createdBy: string;
  name: string;
  image?: Express.Multer.File | undefined;
  description?: string | undefined;
}

interface AddUserToGroupInput {
  groupId: string;
  userId: string;
  permission: "view" | "edit" | "admin";
}

class GroupService {
  async createGroup(firebaseUid: string, groupData: CreateGroupInput) {
    try {
      const { name, image, description } = groupData;

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado, faça login para continuar.");
      }

      if (!name) {
        throw new Error("Nome do grupo é obrigatório.");
      }

      let imageUrl;

      if (image) {
        imageUrl = await uploadToDrive(image);
      }

      const group = await prisma.group.create({
        data: {
          name,
          imageUrl,
          description,
          createdBy: user?.id,
          permissions: {
            create: {
              userId: user.id,
              permission: "admin",
            },
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return group;
    } catch (error: any) {
      throw new Error(`Erro ao criar grupo: ${error.message}`);
    }
  }

  async getGroupsByFirebaseUid(firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado, faça login para continuar.");
      }

      // Buscar grupos onde o usuário tem permissões
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: user.id },
        include: {
          group: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Converter para o formato desejado
      const groups = userGroups.map((ug) => ({
        id: ug.group.id,
        name: ug.group.name,
        description: ug.group.description,
        imageUrl: ug.group.imageUrl,
        permission: ug.permission,
        createdBy: ug.group.creator,
      }));

      // Buscar grupos onde o usuário é o criador (caso algum não esteja coberto nas permissões)
      const createdGroups = await prisma.group.findMany({
        where: { createdBy: user.id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const groupIds = new Set(groups.map((g) => g.id));
      for (const group of createdGroups) {
        if (!groupIds.has(group.id)) {
          groups.push({
            id: group.id,
            name: group.name,
            description: group.description,
            imageUrl: group.imageUrl,
            permission: "admin",
            createdBy: group.creator,
          });
        }
      }

      return groups;
    } catch (error: any) {
      throw new Error(`Erro ao buscar grupos: ${error.message}`);
    }
  }

  async getGroupById(id: string) {
    try {
      const group = await prisma.group.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
          permissions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        throw new Error("Grupo não encontrado");
      }

      return group;
    } catch (error: any) {
      throw new Error(`Erro ao buscar grupo: ${error.message}`);
    }
  }

  async addUserToGroup({ groupId, userId, permission }: AddUserToGroupInput) {
    try {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new Error("Grupo não encontrado");
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const existingPermission = await prisma.userGroup.findFirst({
        where: {
          userId,
          groupId,
        },
      });

      if (existingPermission) {
        const updatedPermission = await prisma.userGroup.update({
          where: { id: existingPermission.id },
          data: { permission },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return updatedPermission;
      }

      const userGroup = await prisma.userGroup.create({
        data: {
          userId,
          groupId,
          permission,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return userGroup;
    } catch (error: any) {
      throw new Error(`Erro ao adicionar usuário ao grupo: ${error.message}`);
    }
  }

  async removeUserFromGroup(groupId: string, userId: string) {
    try {
      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId,
          groupId,
        },
      });

      if (!userGroup) {
        throw new Error("Usuário não pertence a este grupo");
      }

      await prisma.userGroup.delete({
        where: { id: userGroup.id },
      });

      return { message: "Usuário removido do grupo com sucesso" };
    } catch (error: any) {
      throw new Error(`Erro ao remover usuário do grupo: ${error.message}`);
    }
  }

  async updateGroup(groupId: string, groupData: Partial<CreateGroupInput>) {
    try {
      const { name, image, description } = groupData;

      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new Error("Grupo não encontrado");
      }

      let imageUrl;

      if (image) {
        imageUrl = await uploadToDrive(image);
      }

      const updatedGroup = await prisma.group.update({
        where: { id: groupId },
        data: {
          name,
          imageUrl,
          description,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updatedGroup;
    } catch (error: any) {
      throw new Error(`Erro ao atualizar grupo: ${error.message}`);
    }
  }
}

export default new GroupService();
