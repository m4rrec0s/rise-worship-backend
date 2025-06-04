import prisma from "../prisma/database";
import { uploadToDrive } from "../config/googleDrive";
import axios from "axios";
import * as cheerio from "cheerio";
import { Prisma } from "@prisma/client";

interface ChordSegment {
  chord: string;
  lineIndex: number;
  charOffset: number;
}
interface Cipher {
  key: string;
  segments: ChordSegment[];
}
interface MusicData {
  title: string;
  author: string;
  tone: string;
  categoryId?: string;
  tags?: string[];
  links?: {
    youtube?: string;
    spotify?: string;
    others?: string[];
  };
  lyrics: string;
  cipher?: Cipher;
  bpm?: number;
  thumbnail?: string;
  image?: Express.Multer.File;
}

class MusicService {
  async createMusic(
    firebaseUid: string,
    groupId: string,
    musicData: MusicData
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado, faça login para continuar.");
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new Error("Grupo não encontrado.");
      }

      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId,
          permission: { in: ["edit", "admin"] },
        },
      });

      if (!userGroup) {
        throw new Error(
          "Você não tem permissão para adicionar músicas neste grupo."
        );
      }

      let thumbnailUrl = musicData.thumbnail;

      if (musicData.image) {
        thumbnailUrl = await uploadToDrive(musicData.image);
      } else if (musicData.links?.youtube && !thumbnailUrl) {
        thumbnailUrl = await this.getYoutubeThumbnail(musicData.links.youtube);
      }

      const links = {
        youtube: musicData.links?.youtube || null,
        spotify: musicData.links?.spotify || null,
        others: musicData.links?.others || [],
      };

      const music = await prisma.music.create({
        data: {
          title: musicData.title,
          author: musicData.author,
          tone: musicData.tone,
          categoryId: musicData.categoryId,
          tags: musicData.tags || [],
          links: links,
          lyrics: musicData.lyrics,
          cipher: musicData.cipher
            ? JSON.parse(JSON.stringify(musicData.cipher))
            : null,
          bpm: musicData.bpm,
          thumbnail: thumbnailUrl,
          createdBy: user.id,
          groupId,
        },
      });

      return music;
    } catch (error) {
      throw new Error("Erro ao criar música: " + (error as Error).message);
    }
  }
  async getAllMusicsByGroup(
    groupId: string,
    firebaseUid: string,
    page?: number,
    perPage?: number,
    search?: string | null
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId,
        },
      });

      if (!userGroup) {
        throw new Error("Você não tem acesso a este grupo.");
      }
      const skip = page && perPage ? (page - 1) * perPage : undefined;
      const take = perPage;
      const searchCondition =
        search && search.trim() !== ""
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  author: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                { tags: { has: search } },
              ],
            }
          : undefined;

      const totalItems = await prisma.music.count({
        where: {
          groupId,
          ...searchCondition,
        },
      });

      const musics = await prisma.music.findMany({
        where: {
          groupId,
          ...searchCondition,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          title: "asc",
        },
        skip,
        take,
      });

      return {
        data: musics,
        pagination: {
          totalItems,
          currentPage: page || 1,
          itemsPerPage: perPage || totalItems,
          totalPages: perPage ? Math.ceil(totalItems / perPage) : 1,
          hasNext: page && perPage ? page * perPage < totalItems : false,
          hasPrevious: page ? page > 1 : false,
        },
      };
    } catch (error) {
      throw new Error(
        "Erro ao buscar músicas do grupo: " + (error as Error).message
      );
    }
  }

  async getMusicById(id: string, firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const music = await prisma.music.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
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

      if (!music) {
        throw new Error("Música não encontrada.");
      }

      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: music.groupId,
        },
      });

      if (!userGroup) {
        throw new Error("Você não tem acesso a esta música.");
      }

      return music;
    } catch (error) {
      throw new Error("Erro ao buscar música: " + (error as Error).message);
    }
  }

  async updateMusic(
    id: string,
    firebaseUid: string,
    musicData: Partial<MusicData>
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const music = await prisma.music.findUnique({
        where: { id },
        select: {
          id: true,
          groupId: true,
          createdBy: true,
        },
      });

      if (!music) {
        throw new Error("Música não encontrada.");
      }

      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: music.groupId,
          permission: { in: ["edit", "admin"] },
        },
      });

      const isCreator = music.createdBy === user.id;

      if (!userGroup && !isCreator) {
        throw new Error("Você não tem permissão para editar esta música.");
      }

      let thumbnailUrl = musicData.thumbnail;

      if (musicData.image) {
        thumbnailUrl = await uploadToDrive(musicData.image);
      } else if (
        musicData.links?.youtube &&
        (!thumbnailUrl ||
          musicData.links?.youtube !==
            ((await this.getMusicById(id, firebaseUid))?.links as any)?.youtube)
      ) {
        thumbnailUrl = await this.getYoutubeThumbnail(musicData.links.youtube);
      }

      const links = musicData.links
        ? {
            youtube: musicData.links?.youtube || null,
            spotify: musicData.links?.spotify || null,
            others: musicData.links?.others || [],
          }
        : undefined;

      const updatedMusic = await prisma.music.update({
        where: { id },
        data: {
          title: musicData.title,
          author: musicData.author,
          tone: musicData.tone,
          categoryId: musicData.categoryId,
          tags: musicData.tags,
          links: links,
          lyrics: musicData.lyrics,
          cipher: musicData.cipher
            ? JSON.parse(JSON.stringify(musicData.cipher))
            : null,
          bpm: musicData.bpm,
          thumbnail: thumbnailUrl,
        },
      });

      return updatedMusic;
    } catch (error) {
      throw new Error("Erro ao atualizar música: " + (error as Error).message);
    }
  }

  async deleteMusic(id: string, firebaseUid: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const music = await prisma.music.findUnique({
        where: { id },
        select: {
          id: true,
          groupId: true,
          createdBy: true,
        },
      });

      if (!music) {
        throw new Error("Música não encontrada.");
      }

      const isCreator = music.createdBy === user.id;
      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: user.id,
          groupId: music.groupId,
          permission: { in: ["admin", "edit"] },
        },
      });

      if (!isCreator && !userGroup) {
        throw new Error("Você não tem permissão para deletar esta música.");
      }

      await prisma.setlistMusic.deleteMany({
        where: { musicId: id },
      });

      await prisma.music.delete({
        where: { id },
      });

      return { message: "Música deletada com sucesso." };
    } catch (error) {
      throw new Error("Erro ao deletar música: " + (error as Error).message);
    }
  }

  async getYoutubeThumbnail(youtubeUrl: string): Promise<string> {
    const videoIdMatch = youtubeUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/
    );
    if (!videoIdMatch) throw new Error("URL do YouTube inválida.");

    const videoId = videoIdMatch[1];
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

    const response = await axios.get(url);
    const thumbnail = response.data.items[0]?.snippet.thumbnails.high.url;
    if (!thumbnail) throw new Error("Thumbnail não encontrada.");

    return thumbnail;
  }

  async searchLyrics(searchTerm: string) {
    try {
      const googleApiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.SEARCH_ENGINE_ID;

      if (!googleApiKey || !searchEngineId) {
        throw new Error("Chaves de API para busca não configuradas.");
      }

      const query = `${searchTerm} letra site:letras.mus.br`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
        query
      )}`;

      try {
        const response = await axios.get(url);

        if (!response.data.items || response.data.items.length === 0) {
          return [];
        }

        const searchResults = response.data.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        }));

        return searchResults;
      } catch (error: any) {
        if (error.response) {
          console.error("Erro na resposta da API do Google:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          });

          if (error.response.status === 403) {
            throw new Error(
              "Erro de autorização na API de busca. Verifique se a chave da API é válida e está habilitada para o serviço Custom Search."
            );
          }

          if (error.response.status === 400) {
            throw new Error(
              "Parâmetros inválidos para a API de busca. Verifique se o ID do mecanismo de pesquisa está correto."
            );
          }

          throw new Error(
            `Erro na API de busca: ${error.response.status} - ${
              error.response.data.error?.message || error.response.statusText
            }`
          );
        }

        throw new Error("Erro ao buscar letras: " + error.message);
      }
    } catch (error) {
      console.error("Erro completo:", error);
      throw error;
    }
  }

  async searchLyricsAlternative(searchTerm: string) {
    try {
      const searchUrl = `https://www.letras.mus.br/search/${encodeURIComponent(
        searchTerm
      ).replace(/%20/g, "-")}/`;

      const response = await axios.get(searchUrl);
      const $ = cheerio.load(response.data);

      interface LyricsSearchResult {
        title: string;
        link: string;
        snippet: string;
      }

      const results: LyricsSearchResult[] = [];

      $(".gsc-webResult").each((i, el) => {
        const title = $(el).find(".gs-title").text().trim();
        const link = $(el).find(".gs-title a").attr("href") || "";
        const snippet = $(el).find(".gs-snippet").text().trim();

        if (title && link) {
          results.push({
            title,
            link,
            snippet,
          });
        }
      });

      return results;
    } catch (error) {
      console.error("Erro ao buscar letras com método alternativo:", error);
      throw new Error(
        "Erro ao buscar letras com método alternativo: " +
          (error as Error).message
      );
    }
  }

  async extractLyrics(url: string) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      let lyrics = "";
      let title = "";
      let author = "";

      if (url.includes("letras.mus.br")) {
        title =
          $("h1.head-name").text().trim() ||
          $("h1.textStyle-primary").text().trim();

        if (!title) {
          title = $(".title-content h1").text().trim();
        }

        if (!title) {
          title = $("div.cnt-head_title h1").text().trim();
        }

        author =
          $("div.head-subtitle h2 a").text().trim() ||
          $("h2.textStyle-secondary").text().trim();

        if (!author) {
          author = $("div.head-info a").first().text().trim();
        }

        if (!author) {
          author = $("h3.head-subtitle a").text().trim();
        }

        if (!author) {
          author = $(".title-content h2 a").text().trim();
        }

        if (url.includes("/traduccion.html")) {
          const originalLyrics = $(".letra-original").html() || "";
          const translatedLyrics = $(".letra-traducao").html() || "";

          if (originalLyrics && translatedLyrics) {
            const cleanOriginal = this.cleanLyricsHtml(originalLyrics);
            const cleanTranslated = this.cleanLyricsHtml(translatedLyrics);

            lyrics = `ORIGINAL:\n\n${cleanOriginal}\n\nTRADUÇÃO:\n\n${cleanTranslated}`;
          } else {
            const letra = $(".cnt-trad_l").html() || "";
            const traducao = $(".cnt-trad_r").html() || "";

            if (letra && traducao) {
              const cleanOriginal = this.cleanLyricsHtml(letra);
              const cleanTranslated = this.cleanLyricsHtml(traducao);

              lyrics = `ORIGINAL:\n\n${cleanOriginal}\n\nTRADUÇÃO:\n\n${cleanTranslated}`;
            }
          }
        } else {
          const selectors = [
            ".cnt-letra",
            ".letra",
            ".lyric-original",
            ".letter-content",
            ".lyrics",
            ".letra-l",
          ];

          let lyricsHtml = "";

          for (const selector of selectors) {
            lyricsHtml = $(selector).html() || "";
            if (lyricsHtml) {
              break;
            }
          }

          if (lyricsHtml) {
            lyrics = this.cleanLyricsHtml(lyricsHtml);
          } else {
            $("div").each((i, el) => {
              const htmlContent = $(el).html() || "";
              if (
                (htmlContent.includes("<br") &&
                  htmlContent.split("<br").length > 5) ||
                (htmlContent.includes("<p>") &&
                  htmlContent.split("<p>").length > 3)
              ) {
                if (!lyricsHtml) {
                  lyricsHtml = htmlContent;
                }
              }
            });

            if (lyricsHtml) {
              lyrics = this.cleanLyricsHtml(lyricsHtml);
            }
          }
        }
      } else {
        throw new Error("Site não suportado para extração de letras.");
      }

      if (!lyrics) {
        console.error(
          "Falha ao extrair letra. Estrutura HTML encontrada:",
          $.html()
        );
        throw new Error(
          "Não foi possível extrair a letra da música. A estrutura do site pode ter mudado."
        );
      }

      lyrics = lyrics.replace(/([!?.])(\w)/g, "$1\n\n$2");

      if (!lyrics.includes("\n\n") && lyrics.includes("\n")) {
        lyrics = lyrics.split("\n").join("\n\n");
      }

      return {
        title: title || "Título não encontrado",
        author: author || "Autor não encontrado",
        lyrics,
      };
    } catch (error) {
      console.error("Erro completo ao extrair letra:", error);
      throw new Error("Erro ao extrair letra: " + (error as Error).message);
    }
  }

  private cleanLyricsHtml(html: string): string {
    let cleaned = html
      .replace(/<p>/gi, "PARAGRAPH_START")
      .replace(/<\/p>/gi, "PARAGRAPH_END");

    cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");

    cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "");

    cleaned = this.decodeHtmlEntities(cleaned);

    cleaned = cleaned.replace(/[ \t]+/g, " ");

    cleaned = cleaned
      .replace(/PARAGRAPH_START/g, "")
      .replace(/PARAGRAPH_END/g, "\n\n");

    cleaned = cleaned
      .split("\n")
      .map((line) => line.trim())
      .join("\n");

    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    cleaned = cleaned.trim();

    return cleaned;
  }

  private decodeHtmlEntities(text: string): string {
    const entities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&nbsp;": " ",
    };

    return text.replace(
      /&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g,
      (match) => entities[match as keyof typeof entities]
    );
  }
}

export default new MusicService();
