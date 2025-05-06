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
        throw new Error("Usuário não autenticado");
      }

      if (!groupId) {
        throw new Error("ID do grupo é obrigatório");
      }

      if (!title) {
        throw new Error("Título é obrigatório");
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      });

      if (!group) {
        throw new Error("Grupo não encontrado");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: groupId,
        },
      });

      if (!membership) {
        throw new Error("Você não é membro deste grupo");
      }

      let imageUrl;
      if (image) {
        imageUrl = await uploadToDrive(image);
      }

      const setList = await prisma.setlist.create({
        data: {
          title,
          description,
          imageUrl,
          groupId,
          createdBy: user.id,
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

      return setList;
    } catch (error) {
      throw new Error("Erro ao criar setlist: " + (error as Error).message);
    }
  }

  async getAllSetLists() {
    try {
      const setLists = await prisma.setlist.findMany({
        include: {
          creator: {
            select: {
              id: true,
              name: true,
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

      return setLists;
    } catch (error) {
      throw new Error("Erro ao buscar setlists: " + (error as Error).message);
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
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          musics: {
            include: {
              music: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      if (!setList) {
        throw new Error("Setlist não encontrada");
      }

      return setList;
    } catch (error) {
      throw new Error("Erro ao buscar setlist: " + (error as Error).message);
    }
  }

  async getSetListsByGroup(groupId: string, firebaseUid: string) {
    try {
      if (!firebaseUid) {
        throw new Error("Usuário não autenticado");
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId,
        },
      });

      if (!membership) {
        throw new Error("Você não é membro deste grupo");
      }

      const setLists = await prisma.setlist.findMany({
        where: { groupId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          musics: {
            select: {
              id: true,
              order: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return setLists;
    } catch (error) {
      throw new Error(
        "Erro ao buscar setlists do grupo: " + (error as Error).message
      );
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
        throw new Error("Usuário não encontrado");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id },
        include: {
          group: true,
        },
      });

      if (!setList) {
        throw new Error("Setlist não encontrada");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
          permission: { in: ["edit", "admin"] },
        },
      });

      const isCreator = setList.createdBy === user.id;

      if (!membership && !isCreator) {
        throw new Error("Você não tem permissão para editar esta setlist");
      }

      let imageUrl = undefined;
      if (data.image) {
        imageUrl = await uploadToDrive(data.image);
      }

      const updatedSetList = await prisma.setlist.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          imageUrl,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
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

      return updatedSetList;
    } catch (error) {
      throw new Error("Erro ao atualizar setlist: " + (error as Error).message);
    }
  }

  async deleteSetList(id: string, firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id },
        select: {
          id: true,
          groupId: true,
          createdBy: true,
        },
      });

      if (!setList) {
        throw new Error("Setlist não encontrada");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
          permission: { in: ["admin"] },
        },
      });

      const isCreator = setList.createdBy === user.id;

      if (!membership && !isCreator) {
        throw new Error("Você não tem permissão para excluir esta setlist");
      }

      await prisma.setlistMusic.deleteMany({
        where: { setlistId: id },
      });

      await prisma.setlist.delete({
        where: { id },
      });

      return { message: "Setlist excluída com sucesso" };
    } catch (error) {
      throw new Error("Erro ao excluir setlist: " + (error as Error).message);
    }
  }

  async addMusicToSetList(
    setlistId: string,
    musicId: string,
    order: number,
    firebaseUid: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id: setlistId },
      });

      if (!setList) {
        throw new Error("Setlist não encontrada");
      }

      const music = await prisma.music.findUnique({
        where: { id: musicId },
      });

      if (!music) {
        throw new Error("Música não encontrada");
      }

      if (music.groupId !== setList.groupId) {
        throw new Error("Esta música não pertence ao mesmo grupo da setlist");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
          permission: { in: ["edit", "admin"] },
        },
      });

      const isCreator = setList.createdBy === user.id;

      if (!membership && !isCreator) {
        throw new Error("Você não tem permissão para editar esta setlist");
      }

      // Verifica se a música já está na setlist
      const existingMusic = await prisma.setlistMusic.findFirst({
        where: {
          setlistId,
          musicId,
        },
      });

      if (existingMusic) {
        // Atualiza a ordem da música
        const updatedMusic = await prisma.setlistMusic.update({
          where: { id: existingMusic.id },
          data: { order },
          include: { music: true },
        });

        return updatedMusic;
      }

      // Se houver músicas com a mesma ordem ou maior, incrementa a ordem delas
      await prisma.setlistMusic.updateMany({
        where: {
          setlistId,
          order: {
            gte: order,
          },
        },
        data: {
          order: {
            increment: 1,
          },
        },
      });

      const setlistMusic = await prisma.setlistMusic.create({
        data: {
          setlistId,
          musicId,
          order,
        },
        include: {
          music: true,
        },
      });

      return setlistMusic;
    } catch (error) {
      throw new Error(
        "Erro ao adicionar música à setlist: " + (error as Error).message
      );
    }
  }

  async removeMusicFromSetList(
    setlistId: string,
    musicId: string,
    firebaseUid: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id: setlistId },
      });

      if (!setList) {
        throw new Error("Setlist não encontrada");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
          permission: { in: ["edit", "admin"] },
        },
      });

      const isCreator = setList.createdBy === user.id;

      if (!membership && !isCreator) {
        throw new Error("Você não tem permissão para editar esta setlist");
      }

      const setlistMusic = await prisma.setlistMusic.findFirst({
        where: {
          setlistId,
          musicId,
        },
      });

      if (!setlistMusic) {
        throw new Error("Música não encontrada na setlist");
      }

      // Obtém a ordem da música a ser removida
      const orderToRemove = setlistMusic.order;

      // Remove a música da setlist
      await prisma.setlistMusic.delete({
        where: { id: setlistMusic.id },
      });

      // Reorganiza as músicas subsequentes
      await prisma.setlistMusic.updateMany({
        where: {
          setlistId,
          order: {
            gt: orderToRemove,
          },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });

      return { message: "Música removida da setlist com sucesso" };
    } catch (error) {
      throw new Error(
        "Erro ao remover música da setlist: " + (error as Error).message
      );
    }
  }

  async reorderSetListMusic(
    setlistId: string,
    musicId: string,
    newOrder: number,
    firebaseUid: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const setList = await prisma.setlist.findUnique({
        where: { id: setlistId },
      });

      if (!setList) {
        throw new Error("Setlist não encontrada");
      }

      const membership = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: setList.groupId,
          permission: { in: ["edit", "admin"] },
        },
      });

      const isCreator = setList.createdBy === user.id;

      if (!membership && !isCreator) {
        throw new Error("Você não tem permissão para editar esta setlist");
      }

      const setlistMusic = await prisma.setlistMusic.findFirst({
        where: {
          setlistId,
          musicId,
        },
      });

      if (!setlistMusic) {
        throw new Error("Música não encontrada na setlist");
      }

      const currentOrder = setlistMusic.order;

      if (currentOrder === newOrder) {
        return { message: "A ordem permaneceu a mesma" };
      }

      // Atualiza a ordem das outras músicas
      if (newOrder > currentOrder) {
        // Movendo para baixo
        await prisma.setlistMusic.updateMany({
          where: {
            setlistId,
            order: {
              gt: currentOrder,
              lte: newOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      } else {
        // Movendo para cima
        await prisma.setlistMusic.updateMany({
          where: {
            setlistId,
            order: {
              gte: newOrder,
              lt: currentOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }

      // Atualiza a ordem da música específica
      await prisma.setlistMusic.update({
        where: { id: setlistMusic.id },
        data: { order: newOrder },
      });

      return { message: "Ordem da música atualizada com sucesso" };
    } catch (error) {
      throw new Error(
        "Erro ao reordenar música na setlist: " + (error as Error).message
      );
    }
  }
}

export default new SetListService();
