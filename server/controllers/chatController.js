import mongoose from "mongoose";

import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";
//Constantes de rôle et canal ouvert
const ADMIN_ROLE = "admin";
const GRAPHISTE_ROLE = "user";
//identifiants et nom pour le canal "ouvert" partagé entre admins et graphistes.
const OPEN_CHANNEL_TYPE = "open-admin-graphistes";
const OPEN_CHANNEL_KEY = "open-admin-graphistes";
const OPEN_CHANNEL_NAME = "Canal Admins & Graphistes";

const normalizeObjectId = (id) => id?.toString?.() || String(id);
//Convertit un ObjectId (ou autre) en chaîne stable pour comparaisons/JSON.
const isAdminUser = (user) => !!user && (user.isAdmin || user.role === ADMIN_ROLE);
//Vérifie si l'objet user représente un admin (booléen).
const isGraphisteUser = (user) => !!user && user.role === GRAPHISTE_ROLE && !user.isAdmin;
//Vérifie si l'utilisateur est un graphiste non-admin.
const isAllowedChatUser = (user) => isAdminUser(user) || isGraphisteUser(user);
//Regroupe la logique : seuls admins et graphistes sont autorisés.
const getAllowedUsersFilter = () => ({
  isActive: true,
  $or: [{ isAdmin: true }, { role: GRAPHISTE_ROLE, isAdmin: false }],
});
//Renvoie un filtre Mongo pour récupérer tous les utilisateurs actifs qui sont admins ou graphistes.
const toPublicUser = (user) => ({
  _id: normalizeObjectId(user._id),
  fullname: user.fullname,
  email: user.email,
  role: user.role,
  isAdmin: !!user.isAdmin,
  title: user.title || "",
  isActive: !!user.isActive,
});
//Formate un objet user pour l'API (évite d'exposer champs sensibles).
const toPublicMessage = (message) => ({
  _id: normalizeObjectId(message._id),
  conversation: normalizeObjectId(message.conversation),
  sender: message.sender?._id
    ? toPublicUser(message.sender)
    : { _id: normalizeObjectId(message.sender) },
  text: message.text,
  readBy: (message.readBy || []).map((id) => normalizeObjectId(id)),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});
//Formate un objet user pour l'API (évite d'exposer champs sensibles).
const toPublicConversation = (conversation, currentUserId, unreadCount = 0) => {
  const participants = (conversation.participants || []).map((participant) =>
    participant?._id ? toPublicUser(participant) : { _id: normalizeObjectId(participant) }
  );
//construit participants en transformant chaque participant en toPublicUser si disponible,
//otherParticipant : pour les DMs, choisit l'autre personne (null pour canal ouvert),
//inclut lastMessage, unreadCount, timestamps.
  const otherParticipant =
    conversation.conversationType === OPEN_CHANNEL_TYPE
      ? null
      : participants.find((participant) => participant._id !== normalizeObjectId(currentUserId));

  return {
    _id: normalizeObjectId(conversation._id),
    conversationType: conversation.conversationType || "dm",
    name: conversation.name || "",
    participants,
    otherParticipant: otherParticipant || null,
    lastMessage: conversation.lastMessage || null,
    unreadCount,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const areSameIdSets = (left = [], right = []) => {
  if (left.length !== right.length) {
    return false;
  }
//compare deux tableaux d'ids triés (même longueur et mêmes éléments index par index). Utilisé pour décider si participants changent.
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
};

const hydrateConversationParticipants = (conversation, users) => {
  const userMap = new Map(users.map((user) => [normalizeObjectId(user._id), user]));

  const hydratedParticipants = Array.isArray(conversation.participants)
    ? conversation.participants
        .map((participantId) => userMap.get(normalizeObjectId(participantId)))
        .filter(Boolean)
    : [];

  return {
    ...conversation,
    participants: hydratedParticipants,
  };
};
//Recrée participants d'une conversation en remplaçant ids par objets utilisateurs (à partir d'une liste users préchargée). Utilisé pour le canal ouvert pour renvoyer participants complets.
//Objectif : s'assurer qu'un canal global ("open-admin-graphistes") existe et que sa liste de participants est à jour.
const ensureOpenConversation = async () => {
  const allowedUsers = await User.find(getAllowedUsersFilter())
    .select("fullname email role isAdmin title isActive")
    .sort({ fullname: 1 })
    .lean();
  //Récupère allowedUsers via User.find(getAllowedUsersFilter()) (sélectionne champs utiles, triés).

  const participantIds = allowedUsers
    .map((user) => normalizeObjectId(user._id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .sort();
  //Construit participantIds en normalisant et en filtrant pour ObjectId valides, triés.
  let conversation = await Conversation.findOne({ participantKey: OPEN_CHANNEL_KEY }).lean();
  //Cherche une conversation existante par participantKey.
  if (!conversation) {
    const created = await Conversation.create({
      conversationType: OPEN_CHANNEL_TYPE,
      name: OPEN_CHANNEL_NAME,
      participants: participantIds,
      participantKey: OPEN_CHANNEL_KEY,
    });

    conversation = created.toObject();
    //Si aucune, crée une conversation avec Conversation.create({...}).
  }

  const currentIds = Array.isArray(conversation.participants)
    ? conversation.participants.map((id) => normalizeObjectId(id)).sort()
    : [];

  const shouldUpdateConversation =
    conversation.conversationType !== OPEN_CHANNEL_TYPE ||
    (conversation.name || "") !== OPEN_CHANNEL_NAME ||
    !areSameIdSets(currentIds, participantIds);
//Si diff, met à jour la conversation (findByIdAndUpdate with { new: true, lean: true }).
  if (shouldUpdateConversation) {
    conversation = await Conversation.findByIdAndUpdate(
      conversation._id,
      {
        conversationType: OPEN_CHANNEL_TYPE,
        name: OPEN_CHANNEL_NAME,
        participants: participantIds,
        participantKey: OPEN_CHANNEL_KEY,
      },
      { new: true, lean: true }
    );
  }
//Renvoie conversation (avec participants hydratés) et participants (liste d'utilisateurs autorisés).
  return {
    conversation: hydrateConversationParticipants(conversation, allowedUsers),
    participants: allowedUsers,
  };
};
//Renvoie conversation (avec participants hydratés) et participants (liste d'utilisateurs autorisés).
const validateOpenConversationAccess = async (conversationId, requester) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return null;
  }

  if (!isAllowedChatUser(requester)) {
    return null;
  }

  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation || conversation.conversationType !== OPEN_CHANNEL_TYPE) {
    return null;
  }

  return conversation;
};

export const getChatContacts = async (req, res) => {
  try {
    const requester = { role: req.user.role, isAdmin: req.user.isAdmin };

    if (!isAllowedChatUser(requester)) {
      return res.status(403).json({
        status: false,
        message: "Le chat est réservé aux admins et graphistes.",
      });
    }

    const { participants } = await ensureOpenConversation();

    return res.status(200).json({
      status: true,
      contacts: participants
        .filter((participant) => normalizeObjectId(participant._id) !== normalizeObjectId(req.user.userId))
        .map(toPublicUser),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const requester = { role: req.user.role, isAdmin: req.user.isAdmin };

    if (!isAllowedChatUser(requester)) {
      return res.status(403).json({
        status: false,
        message: "Le chat est réservé aux admins et graphistes.",
      });
    }

    const { conversation } = await ensureOpenConversation();

    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: req.user.userId },
      readBy: { $nin: [req.user.userId] },
    });

    return res.status(200).json({
      status: true,
      conversation: toPublicConversation(conversation, req.user.userId, unreadCount),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const requester = { role: req.user.role, isAdmin: req.user.isAdmin };

    if (!isAllowedChatUser(requester)) {
      return res.status(403).json({
        status: false,
        message: "Le chat est réservé aux admins et graphistes.",
      });
    }

    const { conversation } = await ensureOpenConversation();

    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: req.user.userId },
      readBy: { $nin: [req.user.userId] },
    });

    return res.status(200).json({
      status: true,
      conversations: [toPublicConversation(conversation, req.user.userId, unreadCount)],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const requester = { role: req.user.role, isAdmin: req.user.isAdmin };
    const { conversationId } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "30", 10), 1), 100);

    const conversation = await validateOpenConversationAccess(conversationId, requester);
    if (!conversation) {
      return res.status(403).json({ status: false, message: "Accès conversation refusé." });
    }

    const total = await Message.countDocuments({ conversation: conversationId });

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "fullname email role isAdmin title isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const orderedMessages = messages.reverse().map(toPublicMessage);

    return res.status(200).json({
      status: true,
      messages: orderedMessages,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const requester = { role: req.user.role, isAdmin: req.user.isAdmin };
    const { conversationId, text } = req.body;
    const sanitizedText = typeof text === "string" ? text.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ status: false, message: "Conversation invalide." });
    }

    if (!sanitizedText) {
      return res.status(400).json({ status: false, message: "Message vide." });
    }

    const conversation = await validateOpenConversationAccess(conversationId, requester);
    if (!conversation) {
      return res.status(403).json({ status: false, message: "Accès conversation refusé." });
    }

    let message = await Message.create({
      conversation: conversationId,
      sender: req.user.userId,
      text: sanitizedText,
      readBy: [req.user.userId],
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        text: sanitizedText,
        sender: req.user.userId,
        createdAt: message.createdAt,
      },
    });

    message = await Message.findById(message._id).populate(
      "sender",
      "fullname email role isAdmin title isActive"
    );

    return res.status(201).json({
      status: true,
      message: toPublicMessage(message),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const requester = { role: req.user.role, isAdmin: req.user.isAdmin };
    const { conversationId } = req.params;

    const conversation = await validateOpenConversationAccess(conversationId, requester);
    if (!conversation) {
      return res.status(403).json({ status: false, message: "Accès conversation refusé." });
    }

    const updateResult = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user.userId },
        readBy: { $nin: [req.user.userId] },
      },
      {
        $addToSet: { readBy: req.user.userId },
      }
    );

    return res.status(200).json({
      status: true,
      markedCount: updateResult.modifiedCount || 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
