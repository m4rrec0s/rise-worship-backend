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

interface UpdatePermissionInput {
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

  async getGroups() {
    try {
      const groups = await prisma.group.findMany({
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!groups) {
        throw new Error("Nenhum grupo encontrado");
      }

      return groups;
    } catch (error: any) {
      throw new Error(`Erro ao buscar grupos: ${error.message}`);
    }
  }

  async getGroupsByUserId(userId: string) {
    try {
      const groups = await prisma.userGroup.findMany({
        where: { userId },
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

      if (!groups) {
        throw new Error("Nenhum grupo encontrado para este usuário");
      }

      return groups;
    } catch (error: any) {
      throw new Error(`Erro ao buscar grupos do usuário: ${error.message}`);
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

  async getMembers(groupId: string) {
    try {
      const members = await prisma.userGroup.findMany({
        where: { groupId },
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
      });

      if (!members) {
        throw new Error("Nenhum membro encontrado");
      }

      return members;
    } catch (error: any) {
      throw new Error(`Erro ao buscar membros do grupo: ${error.message}`);
    }
  }
  async getInfoGroup(groupId: string) {
    try {
      // Verificamos primeiro se o grupo existe
      const groupExists = await prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      });

      if (!groupExists) {
        throw new Error("Grupo não encontrado");
      }

      // Busca informações básicas do grupo
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
        },
      });

      // Contagem de músicas no grupo
      const musicsCount = await prisma.music.count({
        where: { groupId },
      }); // Contagem de setlists no grupo
      const setlistsCount = await prisma.setlist.count({
        where: { groupId },
      });

      // Contagem de membros no grupo
      const membersCount = await prisma.userGroup.count({
        where: { groupId },
      });

      // Retorna o grupo com as contagens como estatísticas
      return {
        ...group,
        stats: {
          musicsCount,
          setlistsCount,
          membersCount,
        },
      };
    } catch (error: any) {
      throw new Error(`Erro ao obter informações do grupo: ${error.message}`);
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

  async deleteGroup(groupId: string, firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId,
          permission: {
            in: ["admin"],
          },
        },
      });

      if (!userGroup) {
        throw new Error("Você não tem permissão para deletar este grupo");
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new Error("Grupo não encontrado");
      }

      await prisma.userGroup.deleteMany({
        where: { groupId },
      });

      await prisma.group.delete({
        where: { id: groupId },
      });

      return { message: "Grupo deletado com sucesso" };
    } catch (error: any) {
      throw new Error(`Erro ao deletar grupo: ${error.message}`);
    }
  }

  async updateUserPermission({
    groupId,
    userId,
    permission,
  }: UpdatePermissionInput) {
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

      if (!existingPermission) {
        throw new Error("Usuário não pertence a este grupo");
      }

      // Não permitir mudança de permissão se o usuário for o criador do grupo
      if (group.createdBy === userId) {
        throw new Error(
          "Não é possível alterar a permissão do criador do grupo"
        );
      }

      const updatedPermission = await prisma.userGroup.update({
        where: { id: existingPermission.id },
        data: { permission },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
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
    } catch (error: any) {
      throw new Error(
        `Erro ao atualizar permissão do usuário: ${error.message}`
      );
    }
  }
}

export default new GroupService();
