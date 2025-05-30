import { Router } from "express";
import AuthController from "./controllers/authController";
import UserController from "./controllers/userController";
import GroupController from "./controllers/groupController";
import SetListController from "./controllers/setListController";
import MusicController from "./controllers/musicController";
import { verifyToken, verifySessionToken } from "./middleware/authMiddleware";
import { upload } from "./config/multer";

const router = Router();

router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.post("/auth/google-login", AuthController.googleLogin);
router.get("/auth/me", verifyToken, AuthController.getMe);

// Novos endpoints para tokens de sessão
router.post("/auth/session-login", AuthController.loginWithSession);
router.post(
  "/auth/extended-token",
  verifyToken,
  AuthController.createExtendedToken
);
router.post("/auth/logout", AuthController.logout);
router.post("/auth/logout-all", verifyToken, AuthController.logoutAllSessions);

router.put(
  "/user/profile",
  verifyToken,
  upload.single("image"),
  UserController.updateUser
);
router.get("/users", UserController.getAllUsers);
router.get("/user/:id", UserController.getUserById);
router.delete("/user/:id", verifyToken, UserController.deleteUser);

router.post(
  "/groups",
  verifyToken,
  upload.single("image"),
  GroupController.createGroup
);
router.get("/groups", GroupController.getAllGroups);
router.get(
  "/groups/user/:userId",
  verifyToken,
  GroupController.getGroupsByUserId
);
router.get("/groups/:id", GroupController.getGroupById);
router.get("/groups/:groupId/members", GroupController.getGroupMembers);
router.get("/groups/:groupId/info", GroupController.getInfoGroupById);
router.get(
  "/groups/:groupId/check-membership",
  verifyToken,
  GroupController.checkUserInGroup
);

router.post(
  "/groups/:groupId/members",
  verifyToken,
  GroupController.addUserToGroup
);
router.post(
  "/groups/:groupId/join",
  verifyToken,
  GroupController.joinGroupByInvite
);

router.put(
  "/groups/:groupId",
  verifyToken,
  upload.single("image"),
  GroupController.updateGroup
);

router.delete(
  "/groups/:groupId/members",
  verifyToken,
  GroupController.removeFromGroup
);
router.delete(
  "/groups/:groupId/leave",
  verifyToken,
  GroupController.leaveGroup
);

router.put(
  "/groups/:groupId/members/:userId/permission",
  verifyToken,
  GroupController.updateUserPermission
);
router.delete("/groups/:groupId", verifyToken, GroupController.deleteGroup);

router.post(
  "/setlists",
  verifyToken,
  upload.single("image"),
  SetListController.createSetList
);
router.get("/setlists", SetListController.getAllSetLists);
router.get("/setlists/:id", SetListController.getSetListById);
router.get(
  "/groups/:groupId/setlists",
  verifyToken,
  SetListController.getSetListsByGroup
);
router.put(
  "/setlists/:id",
  verifyToken,
  upload.single("image"),
  SetListController.updateSetList
);
router.delete("/setlists/:id", verifyToken, SetListController.deleteSetList);

router.post(
  "/setlists/:setlistId/musics/:musicId",
  verifyToken,
  SetListController.addMusicToSetList
);
router.delete(
  "/setlists/:setlistId/musics/:musicId",
  verifyToken,
  SetListController.removeMusicFromSetList
);
router.put(
  "/setlists/:setlistId/musics/:musicId/order",
  verifyToken,
  SetListController.reorderSetListMusic
);

router.post(
  "/groups/:groupId/musics",
  verifyToken,
  upload.single("image"),
  MusicController.createMusic
);
router.get(
  "/groups/:groupId/musics",
  verifyToken,
  MusicController.getAllMusicsByGroup
);
router.get("/musics/:id", verifyToken, MusicController.getMusicById);
router.put(
  "/musics/:id",
  verifyToken,
  upload.single("image"),
  MusicController.updateMusic
);
router.delete("/musics/:id", verifyToken, MusicController.deleteMusic);
router.get("/search-lyrics", verifyToken, MusicController.searchLyrics);
router.post("/extract-lyrics", verifyToken, MusicController.extractLyrics);
router.get(
  "/youtube-thumbnail",
  verifyToken,
  MusicController.getYoutubeThumbnail
);

export default router;
