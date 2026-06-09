import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";

import {
  addMessageToConversation,
  setConversationUnread,
  setSocketConnected,
  setTypingState,
  updateConversationPreview,
} from "../redux/slices/chatSlice";

const SOCKET_URL = "http://localhost:8800";

const isAdminUser = (user) => !!user && (user.isAdmin || user.role === "admin");
const isGraphisteUser = (user) => !!user && user.role === "user" && !user.isAdmin;

export const useChatSocket = () => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);

  const { user } = useSelector((state) => state.auth);
  const activeConversationId = useSelector((state) => state.chat.activeConversationId);

  useEffect(() => {
    const hasChatAccess = isAdminUser(user) || isGraphisteUser(user);

    if (!hasChatAccess) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      dispatch(setSocketConnected(false));
      return;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      dispatch(setSocketConnected(true));
    });

    socket.on("disconnect", () => {
      dispatch(setSocketConnected(false));
    });

    socket.on("message:new", ({ conversationId, message }) => {
      if (!conversationId || !message) return;

      dispatch(addMessageToConversation({ conversationId, message }));
      dispatch(
        updateConversationPreview({
          conversationId,
          lastMessage: {
            text: message.text,
            sender: message.sender?._id || message.sender,
            createdAt: message.createdAt,
          },
          updatedAt: message.createdAt,
        })
      );
    });

    socket.on("conversation:updated", ({ conversationId, lastMessage, updatedAt }) => {
      if (!conversationId) return;
      dispatch(updateConversationPreview({ conversationId, lastMessage, updatedAt }));
    });

    socket.on("conversation:unread", ({ conversationId, unreadCount }) => {
      if (!conversationId) return;
      dispatch(setConversationUnread({ conversationId, unreadCount }));
    });

    socket.on("typing:start", ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;
      dispatch(setTypingState({ conversationId, userId, isTyping: true }));
    });

    socket.on("typing:stop", ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;
      dispatch(setTypingState({ conversationId, userId, isTyping: false }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      dispatch(setSocketConnected(false));
    };
  }, [dispatch, user]);

  useEffect(() => {
    if (!socketRef.current || !activeConversationId) return;

    socketRef.current.emit("conversation:join", { conversationId: activeConversationId });
  }, [activeConversationId]);

  const emitWithAck = (eventName, payload = {}) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) {
        reject(new Error("Socket non connecté"));
        return;
      }

      socket.emit(eventName, payload, (response) => {
        if (response?.ok) {
          resolve(response);
        } else {
          reject(new Error(response?.message || "Socket event failed"));
        }
      });
    });
  };

  const joinConversation = (conversationId) =>
    emitWithAck("conversation:join", { conversationId });

  const sendMessage = (conversationId, text) =>
    emitWithAck("message:send", { conversationId, text });

  const markConversationRead = (conversationId) =>
    emitWithAck("conversation:read", { conversationId });

  const startTyping = (conversationId) => {
    if (!socketRef.current || !socketRef.current.connected || !conversationId) return;
    socketRef.current.emit("typing:start", { conversationId });
  };

  const stopTyping = (conversationId) => {
    if (!socketRef.current || !socketRef.current.connected || !conversationId) return;
    socketRef.current.emit("typing:stop", { conversationId });
  };

  return {
    joinConversation,
    sendMessage,
    markConversationRead,
    startTyping,
    stopTyping,
  };
};

export default useChatSocket;
