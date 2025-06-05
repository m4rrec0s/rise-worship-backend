import prisma from "../prisma/database";
import { uploadToDrive } from "../config/googleDrive";
import { auth } from "../config/firebase";

interface UpdateUserInput {
  firebaseUid: string;
  userData: {
    name?: string;
    email?: string;
    image?: Express.Multer.File | null;
  };
}

class UserService {
  async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch (error: any) {
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }
  }

  async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          createdGroups: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      return user;
    } catch (error: any) {
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }
  }

  async updateUser({ firebaseUid, userData }: UpdateUserInput) {
    try {
      const { name, email, image } = userData;

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      let imageUrl: string | undefined = undefined;
      if (image) {
        imageUrl = await uploadToDrive(image);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      if (email && email !== user.email) {
        await auth.updateUser(firebaseUid, { email });
      }

      const updatedUser = await prisma.user.update({
        where: { firebaseUid },
        data: updateData,
      });

      return updatedUser;
    } catch (error: any) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }
  }

  async deleteUser(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      await auth.deleteUser(user.firebaseUid);

      await prisma.userGroup.deleteMany({
        where: { userId: id },
      });

      const deletedUser = await prisma.user.delete({
        where: { id },
      });

      return deletedUser;
    } catch (error: any) {
      throw new Error(`Erro ao excluir usuário: ${error.message}`);
    }
  }

  async getUsersByEmail(emailQuery: string) {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            contains: emailQuery,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
        },
        orderBy: {
          email: "asc",
        },
      });

      return users;
    } catch (error: any) {
      throw new Error(`Erro ao buscar usuários por email: ${error.message}`);
    }
  }
}

export default new UserService();
