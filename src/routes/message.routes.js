import { Router } from "express";
import { getAllMessages, translateMessage } from "../controllers/message.controller.js";
const router = Router();

router.route("/get-all-messages").post(getAllMessages);
router.route("/translate-message").post(translateMessage);

export default router;