import { Router } from "express";
import AuthController from "./controllers/authController";
import UserController from "./controllers/userController";
import { verifyToken } from "./middleware/authMiddleware";
import { upload } from "./config/multer";

const router = Router();

// ============== Auth Routes ==============
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.post("/auth/google-login", AuthController.googleLogin);
router.get("/auth/me", verifyToken, AuthController.getMe);

// ============== User Routes ==============
router.put(
  "/user/profile",
  verifyToken,
  upload.single("image"),
  UserController.updateUser
);
router.get("/users", UserController.getAllUsers);
router.get("/user/:id", UserController.getUserById);
router.delete("/user/:id", verifyToken, UserController.deleteUser);

export default router;
