import { Request, Response } from "express";
import SetListService from "../services/setListService";

class SetListController {
  async createSetList(req: Request, res: Response): Promise<void> {
    try {
      const { title, groupId, description } = req.body;
      const firebaseUid = req.user?.uid;
      const image = req.file;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const setList = await SetListService.createSetList(firebaseUid, {
        title,
        groupId,
        description,
        image,
      });

      res.status(201).json(setList);
      return;
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  async getAllSetLists(req: Request, res: Response): Promise<void> {
    try {
      const setLists = await SetListService.getAllSetLists();
      res.status(200).json(setLists);
      return;
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  async getSetListById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const setList = await SetListService.getSetListById(id);
      res.status(200).json(setList);
      return;
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  async getSetListsByGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const setLists = await SetListService.getSetListsByGroup(
        groupId,
        firebaseUid
      );
      res.status(200).json(setLists);
      return;
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  async updateSetList(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
      const firebaseUid = req.user?.uid;
      const image = req.file;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const setList = await SetListService.updateSetList(id, firebaseUid, {
        title,
        description,
        image,
        groupId: "",
      });

      res.status(200).json(setList);
      return;
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }

  async deleteSetList(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const result = await SetListService.deleteSetList(id, firebaseUid);
      res.status(200).json(result);
      return;
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
  }
}

export default new SetListController();
