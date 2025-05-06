import prisma from "../prisma/database";
import { uploadToDrive } from "../config/googleDrive";

interface SetListData {
  title: string;
  groupId: string;
  description?: string;
  image?: Express.Multer.File;
}

class SetListService {
  async createSetList(
    firebaseUid: string,
    { title, groupId, description, image }: SetListData
  ) {
    try {
      if (!firebaseUid) {
        throw new Error("Usuário não encontrado, faça login para continuar.");
      }

      if (!groupId) {
        throw new Error("Grupo não encontrado.");
      }

      if (!title) {
        throw new Error("Título é obrigatório.");
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      // Verifica se o grupo existe
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      });

      if (!group) {
        throw new Error("Grupo não encontrado.");
      }

      // Verifica se o usuário é membro do grupo
      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        throw new Error("Você não é membro deste grupo.");
      }

      let imageUrl;
      if (image) {
        imageUrl = await uploadToDrive(image);
      }

      const setList = await prisma.setlist.create({
        data: {
          title,
          createdBy: user.id,
          groupId,
          description,
          imageUrl,
        },
      });

      return setList;
    } catch (error) {
      throw new Error("Error creating set list: " + (error as Error).message);
    }
  }

  async getAllSetLists() {
    try {
      const setLists = await prisma.setlist.findMany();
      return setLists;
    } catch (error) {
      throw new Error("Error fetching set lists: " + (error as Error).message);
    }
  }

  async getSetListById(id: string) {
    try {
      const setList = await prisma.setlist.findUnique({
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
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!setList) {
        throw new Error("SetList não encontrada.");
      }

      return setList;
    } catch (error) {
      throw new Error("Error fetching setlist: " + (error as Error).message);
    }
  }

  async getSetListsByGroup(groupId: string, firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      // Verifica se o usuário é membro do grupo
      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId,
        },
      });

      if (!membership) {
        throw new Error("Você não é membro deste grupo.");
      }

      const setLists = await prisma.setlist.findMany({
        where: {
          groupId,
        },
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

      return setLists;
    } catch (error) {
      throw new Error("Error fetching setlists: " + (error as Error).message);
    }
  }

  async updateSetList(
    id: string,
    firebaseUid: string,
    data: Partial<SetListData>
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id },
        select: { id: true, groupId: true, createdBy: true },
      });

      if (!setList) {
        throw new Error("SetList não encontrada.");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
        },
      });

      if (!membership) {
        throw new Error("Você não é membro deste grupo.");
      }

      let updateData: any = {
        title: data.title,
        description: data.description,
      };

      if (data.image) {
        updateData.imageUrl = await uploadToDrive(data.image);
      }

      const updatedSetList = await prisma.setlist.update({
        where: { id },
        data: updateData,
      });

      return updatedSetList;
    } catch (error) {
      throw new Error("Error updating setlist: " + (error as Error).message);
    }
  }

  async deleteSetList(id: string, firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id },
        select: { id: true, groupId: true, createdBy: true },
      });

      if (!setList) {
        throw new Error("SetList não encontrada.");
      }

      const isOwner = setList.createdBy === user.id;
      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
          permission: {
            in: ["admin", "edit"],
          },
        },
      });

      if (!isOwner && !membership) {
        throw new Error("Você não tem permissão para deletar esta SetList.");
      }

      await prisma.setlist.delete({
        where: { id },
      });

      return { message: "SetList deletada com sucesso." };
    } catch (error) {
      throw new Error("Error deleting setlist: " + (error as Error).message);
    }
  }
}

export default new SetListService();
