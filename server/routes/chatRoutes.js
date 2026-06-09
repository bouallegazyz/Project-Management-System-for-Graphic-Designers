import express from "express";

import {
  getChatContacts,
  getConversations,
  getConversationMessages,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
} from "../controllers/chatController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/contacts", protectRoute, getChatContacts);
router.get("/conversations", protectRoute, getConversations);
router.post("/conversations", protectRoute, getOrCreateConversation);
router.get("/conversations/:conversationId/messages", protectRoute, getConversationMessages);
router.put("/conversations/:conversationId/read", protectRoute, markConversationRead);
router.post("/messages", protectRoute, sendMessage);

export default router;
