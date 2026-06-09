import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MdArrowBack,
  MdChat,
  MdCircle,
  MdClose,
  MdRefresh,
  MdSend,
} from "react-icons/md";
import { toast } from "react-hot-toast";

import {
  useGetChatConversationsQuery,
  useGetChatMessagesQuery,
  useMarkChatReadMutation,
  useSendChatMessageMutation,
} from "../redux/slices/apiSlice";
import useChatSocket from "../hooks/useChatSocket";
import {
  addMessageToConversation,
  setActiveConversation,
  setConversationMessages,
  setConversationUnread,
  setConversations,
  setWidgetOpen,
  toggleWidget,
  updateConversationPreview,
} from "../redux/slices/chatSlice";

const OPEN_CHANNEL_TYPE = "open-admin-graphistes";

const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatConversationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const isSameDay = now.toDateString() === date.toDateString();

  if (isSameDay) {
    return formatMessageTime(value);
  }

  return date.toLocaleDateString();
};

const isAdminUser = (user) => !!user && (user.isAdmin || user.role === "admin");

const isGraphisteUser = (user) => !!user && user.role === "user" && !user.isAdmin;

const getConversationLabel = (conversation) => {
  if (!conversation) return "Canal Admins & Graphistes";
  if (conversation.conversationType === OPEN_CHANNEL_TYPE) {
    return conversation.name || "Canal Admins & Graphistes";
  }
  return conversation.name || "Conversation";
};

const ChatWidget = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    isOpen,
    conversations,
    activeConversationId,
    messagesByConversation,
    unreadByConversation,
    typingByConversation,
    socketConnected,
  } = useSelector((state) => state.chat);

  const canUseChat = isAdminUser(user) || isGraphisteUser(user);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const { joinConversation, sendMessage, markConversationRead, startTyping, stopTyping } = useChatSocket();

  const [sendChatMessageRest] = useSendChatMessageMutation();
  const [markChatReadRest] = useMarkChatReadMutation();

  const {
    data: conversationsData,
    isFetching: conversationsLoading,
    refetch: refetchConversations,
  } = useGetChatConversationsQuery(undefined, {
    skip: !canUseChat,
    pollingInterval: canUseChat ? 20000 : 0,
  });

  const { data: messagesData, isFetching: messagesLoading } = useGetChatMessagesQuery(
    { conversationId: activeConversationId, page: 1, limit: 50 },
    {
      skip: !canUseChat || !activeConversationId,
      refetchOnMountOrArgChange: true,
    }
  );

  useEffect(() => {
    if (!canUseChat) {
      return;
    }

    const nextConversations = conversationsData?.conversations || [];
    dispatch(setConversations(nextConversations));
  }, [canUseChat, conversationsData, dispatch]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      dispatch(setActiveConversation(conversations[0]._id));
    }
  }, [activeConversationId, conversations, dispatch]);

  useEffect(() => {
    if (!isOpen) {
      setMobileThreadOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!activeConversationId || !messagesData?.messages) return;

    dispatch(
      setConversationMessages({
        conversationId: activeConversationId,
        messages: messagesData.messages,
      })
    );
  }, [activeConversationId, dispatch, messagesData]);

  useEffect(() => {
    if (!isOpen || !activeConversationId) return;

    joinConversation(activeConversationId).catch(() => {});

    markConversationRead(activeConversationId)
      .catch(() => markChatReadRest(activeConversationId).unwrap())
      .catch(() => {})
      .finally(() => {
        dispatch(setConversationUnread({ conversationId: activeConversationId, unreadCount: 0 }));
      });
  }, [activeConversationId, dispatch, isOpen, joinConversation, markChatReadRest, markConversationRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversationId, messagesByConversation]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const totalUnread = useMemo(() => {
    return Object.values(unreadByConversation || {}).reduce((sum, count) => sum + (count || 0), 0);
  }, [unreadByConversation]);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation._id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messagesByConversation[activeConversationId] || [];
  }, [activeConversationId, messagesByConversation]);

  const typingUsers = useMemo(() => {
    if (!activeConversationId || !activeConversation) return [];
    const typingMap = typingByConversation[activeConversationId] || {};
    const participants = activeConversation.participants || [];

    return Object.entries(typingMap)
      .filter(([typingUserId, isTyping]) => isTyping && typingUserId !== user?._id)
      .map(([typingUserId]) => {
        const participant = participants.find((member) => member._id === typingUserId);
        if (participant) {
          return participant;
        }
        return { _id: typingUserId, fullname: "Un membre" };
      });
  }, [activeConversation, activeConversationId, typingByConversation, user?._id]);

  if (!canUseChat) {
    return null;
  }

  const handleSelectConversation = async (conversationId) => {
    dispatch(setActiveConversation(conversationId));
    dispatch(setWidgetOpen(true));
    dispatch(setConversationUnread({ conversationId, unreadCount: 0 }));
    setMobileThreadOpen(true);

    try {
      await joinConversation(conversationId);
      await markConversationRead(conversationId);
    } catch {
      try {
        await markChatReadRest(conversationId).unwrap();
      } catch {
        // Silent fallback
      }
    }
  };

  const handleSendMessage = async () => {
    if (!activeConversationId) return;

    const text = messageText.trim();
    if (!text || sending) return;

    setSending(true);
    setMessageText("");
    stopTyping(activeConversationId);

    try {
      const response = await sendMessage(activeConversationId, text);
      const message = response?.message;

      if (message?._id) {
        dispatch(addMessageToConversation({ conversationId: activeConversationId, message }));
        dispatch(
          updateConversationPreview({
            conversationId: activeConversationId,
            lastMessage: {
              text: message.text,
              sender: message.sender?._id || message.sender,
              createdAt: message.createdAt,
            },
            updatedAt: message.createdAt,
          })
        );
      }
    } catch {
      try {
        const fallback = await sendChatMessageRest({ conversationId: activeConversationId, text }).unwrap();
        const message = fallback?.message;

        if (message?._id) {
          dispatch(addMessageToConversation({ conversationId: activeConversationId, message }));
          dispatch(
            updateConversationPreview({
              conversationId: activeConversationId,
              lastMessage: {
                text: message.text,
                sender: message.sender?._id || message.sender,
                createdAt: message.createdAt,
              },
              updatedAt: message.createdAt,
            })
          );
        }
      } catch (error) {
        toast.error(error?.data?.message || "Envoi impossible");
      }
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value) => {
    setMessageText(value);
    if (!activeConversationId) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    if (value.trim().length > 0) {
      startTyping(activeConversationId);
      typingTimerRef.current = setTimeout(() => {
        stopTyping(activeConversationId);
      }, 1200);
    } else {
      stopTyping(activeConversationId);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          type="button"
          onClick={() => dispatch(toggleWidget())}
          className="relative bloom-gradient text-white h-14 w-14 rounded-full shadow-xl shadow-bloom-pink/30 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MdChat className="text-2xl" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="w-[min(96vw,920px)] h-[min(84vh,680px)] bg-bloom-white rounded-2xl shadow-2xl border border-bloom-gray-light/40 overflow-hidden flex">
          <div
            className={`border-r border-bloom-gray-light/30 flex flex-col ${
              mobileThreadOpen ? "hidden sm:flex sm:w-[40%]" : "w-full sm:w-[40%]"
            }`}
          >
            <div className="px-4 py-3 border-b border-bloom-gray-light/30 flex items-center justify-between bloom-gradient text-white">
              <div>
                <p className="font-semibold">Canal ouvert</p>
                <p className="text-xs opacity-90">Admins + Graphistes</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    refetchConversations();
                  }}
                  className="p-1 rounded-md hover:bg-white/15 transition-colors"
                >
                  <MdRefresh className="text-lg" />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setWidgetOpen(false))}
                  className="p-1 rounded-md hover:bg-white/15 transition-colors"
                >
                  <MdClose className="text-lg" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <div className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-bloom-gray">
                Canaux disponibles
              </div>

              {conversationsLoading && conversations.length === 0 && (
                <p className="text-sm text-bloom-gray px-2">Chargement du canal...</p>
              )}

              {!conversationsLoading && conversations.length === 0 && (
                <p className="text-sm text-bloom-gray px-2">Aucun canal disponible.</p>
              )}

              {conversations.map((conversation) => {
                const isActive = activeConversationId === conversation._id;
                const unread = unreadByConversation[conversation._id] || 0;

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation._id)}
                    className={`w-full text-left rounded-xl px-3 py-2 transition-all border ${
                      isActive
                        ? "bg-bloom-pink/10 border-bloom-pink/30"
                        : "border-transparent hover:bg-bloom-bg"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-bloom-dark truncate">
                          {getConversationLabel(conversation)}
                        </p>
                        <p className="text-xs text-bloom-gray truncate">
                          {conversation.lastMessage?.text || "Aucun message"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] text-bloom-gray">
                          {formatConversationTime(
                            conversation.lastMessage?.createdAt || conversation.updatedAt
                          )}
                        </span>
                        {unread > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bloom-gradient text-white text-[10px] font-semibold flex items-center justify-center">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${mobileThreadOpen ? "flex" : "hidden"} sm:flex flex-1 flex-col`}>
            <div className="px-4 py-3 border-b border-bloom-gray-light/30 flex items-center justify-between">
              {activeConversation ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileThreadOpen(false)}
                      className="sm:hidden p-1 rounded-md hover:bg-bloom-bg"
                    >
                      <MdArrowBack className="text-xl text-bloom-gray" />
                    </button>
                    <div>
                      <p className="font-semibold text-bloom-dark">{getConversationLabel(activeConversation)}</p>
                      <p className="text-xs text-bloom-gray">Canal ouvert admins et graphistes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-bloom-gray">
                    <MdCircle
                      className={`text-[10px] ${socketConnected ? "text-green-500" : "text-red-500"}`}
                    />
                    {socketConnected ? "En ligne" : "Hors ligne"}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    className="sm:hidden p-1 rounded-md hover:bg-bloom-bg"
                  >
                    <MdArrowBack className="text-xl text-bloom-gray" />
                  </button>
                  <p className="text-sm text-bloom-gray">Sélectionnez le canal</p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 bg-bloom-bg/60">
              {!activeConversation && (
                <div className="h-full flex items-center justify-center text-bloom-gray text-sm">
                  Ouvrez le canal pour commencer.
                </div>
              )}

              {activeConversation && messagesLoading && activeMessages.length === 0 && (
                <p className="text-sm text-bloom-gray">Chargement des messages...</p>
              )}

              {activeConversation &&
                activeMessages.map((message) => {
                  const senderId = message.sender?._id || message.sender;
                  const isMine = senderId === user?._id;
                  const senderName = message.sender?.fullname || "Membre";

                  return (
                    <div
                      key={message._id}
                      className={`mb-2 flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          isMine
                            ? "bloom-gradient text-white rounded-br-md"
                            : "bg-white border border-bloom-gray-light/30 text-bloom-dark rounded-bl-md"
                        }`}
                      >
                        {!isMine && (
                          <p className="text-[11px] font-semibold text-bloom-pink mb-1">{senderName}</p>
                        )}
                        <p className="whitespace-pre-wrap wrap-break-word">{message.text}</p>
                        <p className={`mt-1 text-[10px] ${isMine ? "text-white/90" : "text-bloom-gray"}`}>
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}

              {typingUsers.length > 0 && (
                <p className="text-xs text-bloom-gray italic mt-1">
                  {typingUsers[0].fullname} est en train d'écrire...
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-bloom-gray-light/30 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(event) => handleTyping(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={activeConversation ? "Écrire dans le canal..." : "Canal indisponible"}
                  disabled={!activeConversation || sending}
                  className="flex-1 resize-none rounded-xl border border-bloom-gray-light/40 px-3 py-2 text-sm outline-none focus:border-bloom-pink/60 disabled:bg-bloom-bg"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!activeConversation || sending || !messageText.trim()}
                  className="h-10 w-10 rounded-xl bloom-gradient text-white flex items-center justify-center disabled:opacity-50"
                >
                  <MdSend className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
