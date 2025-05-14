import { Request, Response } from "express";
import MusicService from "../services/musicService";

class MusicController {
  async createMusic(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        author,
        tone,
        categoryId,
        tags,
        links,
        lyrics,
        cipher,
        bpm,
      } = req.body;
      const { groupId } = req.params;
      const firebaseUid = req.user?.uid;
      const image = req.file;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      if (!title || !author || !tone || !lyrics) {
        res.status(400).json({
          error:
            "Dados incompletos. Os campos título, autor, tom e letra são obrigatórios.",
        });
        return;
      }

      let parsedLinks;
      let parsedTags;

      // Verifica se links já é um objeto ou se precisa ser parseado
      if (links) {
        parsedLinks = typeof links === "string" ? JSON.parse(links) : links;
      }

      // Verifica se tags já é um array ou se precisa ser parseado
      if (tags) {
        parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
      }

      const music = await MusicService.createMusic(firebaseUid, groupId, {
        title,
        author,
        tone,
        categoryId,
        tags: parsedTags,
        links: parsedLinks,
        lyrics,
        cipher,
        bpm: bpm ? parseInt(bpm) : undefined,
        image,
      });

      res.status(201).json(music);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
  async getAllMusicsByGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { page, per_page, search } = req.query;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const pageNumber = page ? parseInt(page as string) : undefined;
      const itemsPerPage = per_page ? parseInt(per_page as string) : undefined;
      const searchTerm = search ? (search as string) : undefined;

      const result = await MusicService.getAllMusicsByGroup(
        groupId,
        firebaseUid,
        pageNumber,
        itemsPerPage,
        searchTerm
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getMusicById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const music = await MusicService.getMusicById(id, firebaseUid);
      res.status(200).json(music);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async updateMusic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        title,
        author,
        tone,
        categoryId,
        tags,
        links,
        lyrics,
        cipher,
        bpm,
      } = req.body;
      const firebaseUid = req.user?.uid;
      const image = req.file;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      let parsedLinks;
      let parsedTags;

      // Verifica se links já é um objeto ou se precisa ser parseado
      if (links) {
        parsedLinks = typeof links === "string" ? JSON.parse(links) : links;
      }

      // Verifica se tags já é um array ou se precisa ser parseado
      if (tags) {
        parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
      }

      const music = await MusicService.updateMusic(id, firebaseUid, {
        title,
        author,
        tone,
        categoryId,
        tags: parsedTags,
        links: parsedLinks,
        lyrics,
        cipher,
        bpm: bpm ? parseInt(bpm) : undefined,
        image,
      });

      res.status(200).json(music);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async deleteMusic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const result = await MusicService.deleteMusic(id, firebaseUid);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async searchLyrics(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Termo de busca não fornecido" });
        return;
      }

      try {
        const results = await MusicService.searchLyrics(query);
        res.status(200).json(results);
      } catch (error: any) {
        console.log(
          "Erro na busca principal, tentando método alternativo:",
          error.message
        );

        try {
          const alternativeResults = await MusicService.searchLyricsAlternative(
            query
          );
          res.status(200).json({
            results: alternativeResults,
            note: "Resultados obtidos pelo método alternativo devido a um problema com a API do Google.",
          });
        } catch (altError) {
          res.status(400).json({ error: (error as Error).message });
        }
      }
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async extractLyrics(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      if (!url) {
        res.status(400).json({ error: "URL não fornecida" });
        return;
      }

      const result = await MusicService.extractLyrics(url);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getYoutubeThumbnail(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      if (!url || typeof url !== "string") {
        res.status(400).json({ error: "URL do YouTube não fornecida" });
        return;
      }

      const thumbnailUrl = await MusicService.getYoutubeThumbnail(url);
      res.status(200).json({ thumbnailUrl });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}

export default new MusicController();
