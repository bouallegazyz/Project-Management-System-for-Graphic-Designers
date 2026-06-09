import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isOpen: false,
  socketConnected: false,
  activeConversationId: null,
  conversations: [],
  messagesByConversation: {},
  typingByConversation: {},
  unreadByConversation: {},
};

const ensureConversationPreview = (state, conversationId) => {
  if (!conversationId) return;
  if (!state.unreadByConversation[conversationId]) {
    state.unreadByConversation[conversationId] = 0;
  }
};

const sortByUpdatedAtDesc = (conversations) => {
  conversations.sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearChatState: () => ({ ...initialState }),
    setWidgetOpen: (state, action) => {
      state.isOpen = !!action.payload;
    },
    toggleWidget: (state) => {
      state.isOpen = !state.isOpen;
    },
    setSocketConnected: (state, action) => {
      state.socketConnected = !!action.payload;
    },
    setActiveConversation: (state, action) => {
      state.activeConversationId = action.payload || null;
      if (action.payload) {
        state.unreadByConversation[action.payload] = 0;
      }
    },
    setConversations: (state, action) => {
      const conversations = Array.isArray(action.payload) ? action.payload : [];
      state.conversations = conversations;
      conversations.forEach((conversation) => {
        const conversationId = conversation?._id;
        if (!conversationId) return;
        state.unreadByConversation[conversationId] = conversation.unreadCount || 0;
      });
      sortByUpdatedAtDesc(state.conversations);
      if (
        state.activeConversationId &&
        !state.conversations.some((conversation) => conversation._id === state.activeConversationId)
      ) {
        state.activeConversationId = null;
      }
    },
    upsertConversation: (state, action) => {
      const conversation = action.payload;
      if (!conversation?._id) return;

      const existingIndex = state.conversations.findIndex((item) => item._id === conversation._id);
      if (existingIndex === -1) {
        state.conversations.push(conversation);
      } else {
        state.conversations[existingIndex] = {
          ...state.conversations[existingIndex],
          ...conversation,
        };
      }

      ensureConversationPreview(state, conversation._id);
      if (typeof conversation.unreadCount === "number") {
        state.unreadByConversation[conversation._id] = conversation.unreadCount;
      }
      sortByUpdatedAtDesc(state.conversations);
    },
    setConversationMessages: (state, action) => {
      const { conversationId, messages } = action.payload || {};
      if (!conversationId) return;
      state.messagesByConversation[conversationId] = Array.isArray(messages) ? messages : [];
    },
    addMessageToConversation: (state, action) => {
      const { conversationId, message } = action.payload || {};
      if (!conversationId || !message?._id) return;

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      const alreadyExists = state.messagesByConversation[conversationId].some(
        (existingMessage) => existingMessage._id === message._id
      );
      if (!alreadyExists) {
        state.messagesByConversation[conversationId].push(message);
      }
    },
    setConversationUnread: (state, action) => {
      const { conversationId, unreadCount } = action.payload || {};
      if (!conversationId) return;
      state.unreadByConversation[conversationId] = Math.max(unreadCount || 0, 0);
    },
    updateConversationPreview: (state, action) => {
      const { conversationId, lastMessage, updatedAt } = action.payload || {};
      if (!conversationId) return;

      const existing = state.conversations.find((conversation) => conversation._id === conversationId);
      if (!existing) return;

      existing.lastMessage = lastMessage || existing.lastMessage;
      existing.updatedAt = updatedAt || existing.updatedAt;
      sortByUpdatedAtDesc(state.conversations);
    },
    setTypingState: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload || {};
      if (!conversationId || !userId) return;

      if (!state.typingByConversation[conversationId]) {
        state.typingByConversation[conversationId] = {};
      }

      state.typingByConversation[conversationId][userId] = !!isTyping;
    },
  },
});

export const {
  clearChatState,
  setWidgetOpen,
  toggleWidget,
  setSocketConnected,
  setActiveConversation,
  setConversations,
  upsertConversation,
  setConversationMessages,
  addMessageToConversation,
  setConversationUnread,
  updateConversationPreview,
  setTypingState,
} = chatSlice.actions;

export default chatSlice.reducer;
