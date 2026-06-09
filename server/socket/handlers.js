import mongoose from "mongoose";

import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";

const MAX_MESSAGE_LENGTH = 2000;
const ADMIN_ROLE = "admin";
const GRAPHISTE_ROLE = "user";
const OPEN_CHANNEL_TYPE = "open-admin-graphistes";

const roomForConversation = (conversationId) => `conversation:${conversationId}`;
const roomForUser = (userId) => `user:${userId}`;

const normalizeObjectId = (id) => id?.toString?.() || String(id);

const getAck = (ack) => (typeof ack === "function" ? ack : null);

const ackError = (ack, message) => {
  const fn = getAck(ack);
  if (fn) {
    fn({ ok: false, message });
  }
};

const ackSuccess = (ack, payload) => {
  const fn = getAck(ack);
  if (fn) {
    fn({ ok: true, ...payload });
  }
};

const isAdminUser = (user) => !!user && (user.isAdmin || user.role === ADMIN_ROLE);

const isGraphisteUser = (user) => !!user && user.role === GRAPHISTE_ROLE && !user.isAdmin;

const isAllowedChatUser = (user) => isAdminUser(user) || isGraphisteUser(user);

const getAllowedUsersFilter = () => ({
  isActive: true,
  $or: [{ isAdmin: true }, { role: GRAPHISTE_ROLE, isAdmin: false }],
});

const loadOpenConversation = async (conversationId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return null;
  }

  const conversation = await Conversation.findById(conversationId).populate(
    "participants",
    "_id role isAdmin"
  );

  if (!conversation || conversation.conversationType !== OPEN_CHANNEL_TYPE) {
    return null;
  }

  return conversation;
};

const toPublicMessage = (message) => ({
  _id: normalizeObjectId(message._id),
  conversation: normalizeObjectId(message.conversation),
  sender: message.sender?._id
    ? {
        _id: normalizeObjectId(message.sender._id),
        fullname: message.sender.fullname,
        email: message.sender.email,
        role: message.sender.role,
        isAdmin: !!message.sender.isAdmin,
      }
    : { _id: normalizeObjectId(message.sender) },
  text: message.text,
  readBy: (message.readBy || []).map((id) => normalizeObjectId(id)),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const emitUnreadForUser = async (io, userId, conversationId) => {
  const unreadCount = await Message.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    readBy: { $nin: [userId] },
  });

  io.to(roomForUser(userId)).emit("conversation:unread", {
    conversationId: normalizeObjectId(conversationId),
    unreadCount,
  });
};

const getEligibleParticipantIds = async () => {
  const users = await User.find(getAllowedUsersFilter()).select("_id").lean();
  return users
    .map((user) => normalizeObjectId(user._id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .sort();
};

const syncOpenConversationParticipants = async (conversation) => {
  const eligibleIds = await getEligibleParticipantIds();
  const currentIds = Array.isArray(conversation.participants)
    ? conversation.participants.map((participant) => normalizeObjectId(participant._id || participant)).sort()
    : [];

  if (eligibleIds.length !== currentIds.length || eligibleIds.some((id, index) => id !== currentIds[index])) {
    await Conversation.findByIdAndUpdate(conversation._id, {
      participants: eligibleIds,
      conversationType: OPEN_CHANNEL_TYPE,
    });
  }

  return eligibleIds;
};

export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    if (!isAllowedChatUser(socket.user)) {
      socket.disconnect(true);
      return;
    }

    const userId = normalizeObjectId(socket.user.userId);
    const userRoom = roomForUser(userId);
    socket.join(userRoom);

    socket.on("conversation:join", async ({ conversationId } = {}, ack) => {
      try {
        const conversation = await loadOpenConversation(conversationId);
        if (!conversation) {
          return ackError(ack, "Accès conversation refusé");
        }

        socket.join(roomForConversation(conversationId));
        return ackSuccess(ack, { conversationId: normalizeObjectId(conversationId) });
      } catch (error) {
        return ackError(ack, "Impossible de rejoindre la conversation");
      }
    });

    socket.on("message:send", async ({ conversationId, text } = {}, ack) => {
      try {
        const sanitizedText = typeof text === "string" ? text.trim() : "";

        if (!sanitizedText) {
          return ackError(ack, "Message vide");
        }

        if (sanitizedText.length > MAX_MESSAGE_LENGTH) {
          return ackError(ack, "Message trop long");
        }

        const conversation = await loadOpenConversation(conversationId);
        if (!conversation) {
          return ackError(ack, "Accès conversation refusé");
        }

        const conversationRoom = roomForConversation(conversationId);
        socket.join(conversationRoom);

        let message = await Message.create({
          conversation: conversation._id,
          sender: userId,
          text: sanitizedText,
          readBy: [userId],
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: {
            text: sanitizedText,
            sender: userId,
            createdAt: message.createdAt,
          },
        });

        message = await Message.findById(message._id).populate(
          "sender",
          "fullname email role isAdmin"
        );

        const publicMessage = toPublicMessage(message);

        io.to(conversationRoom).emit("message:new", {
          conversationId: normalizeObjectId(conversation._id),
          message: publicMessage,
        });

        io.to(conversationRoom).emit("conversation:updated", {
          conversationId: normalizeObjectId(conversation._id),
          lastMessage: {
            text: sanitizedText,
            sender: normalizeObjectId(userId),
            createdAt: message.createdAt,
          },
          updatedAt: new Date(),
        });

        const participantIds = await syncOpenConversationParticipants(conversation);

        await Promise.all(
          participantIds.map((participantId) => emitUnreadForUser(io, participantId, conversation._id))
        );

        return ackSuccess(ack, { message: publicMessage });
      } catch (error) {
        return ackError(ack, "Envoi du message impossible");
      }
    });

    socket.on("conversation:read", async ({ conversationId } = {}, ack) => {
      try {
        const conversation = await loadOpenConversation(conversationId);
        if (!conversation) {
          return ackError(ack, "Accès conversation refusé");
        }

        const updateResult = await Message.updateMany(
          {
            conversation: conversation._id,
            sender: { $ne: userId },
            readBy: { $nin: [userId] },
          },
          {
            $addToSet: { readBy: userId },
          }
        );

        const conversationRoom = roomForConversation(conversationId);
        socket.join(conversationRoom);
        socket.to(conversationRoom).emit("conversation:read", {
          conversationId: normalizeObjectId(conversation._id),
          userId,
          readAt: new Date(),
        });

        await emitUnreadForUser(io, userId, conversation._id);

        return ackSuccess(ack, { markedCount: updateResult.modifiedCount || 0 });
      } catch (error) {
        return ackError(ack, "Mise à jour lecture impossible");
      }
    });

    socket.on("typing:start", async ({ conversationId } = {}) => {
      try {
        const conversation = await loadOpenConversation(conversationId);
        if (!conversation) {
          return;
        }

        const conversationRoom = roomForConversation(conversationId);
        socket.join(conversationRoom);
        socket.to(conversationRoom).emit("typing:start", {
          conversationId: normalizeObjectId(conversation._id),
          userId,
        });
      } catch (error) {
        // No-op to keep socket stable.
      }
    });

    socket.on("typing:stop", async ({ conversationId } = {}) => {
      try {
        const conversation = await loadOpenConversation(conversationId);
        if (!conversation) {
          return;
        }

        socket.to(roomForConversation(conversationId)).emit("typing:stop", {
          conversationId: normalizeObjectId(conversation._id),
          userId,
        });
      } catch (error) {
        // No-op to keep socket stable.
      }
    });
  });
};
