import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "./AuthSlice";

const API_URI = "http://localhost:8800/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URI,
  credentials: "include",
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    api.dispatch(logout());
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ["Tasks", "Users", "Dashboard", "Notifications", "Files3D", "Briefs", "Annotations", "Gallery", "Sources", "Chat"],
  endpoints: (builder) => ({
    // ─── Auth ───
    login: builder.mutation({
      query: (credentials) => ({
        url: "/users/login",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/users/logout",
        method: "POST",
      }),
    }),
    register: builder.mutation({
      query: (data) => ({
        url: "/users/register",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Users"],
    }),

    // ─── Users ───
    getTeamList: builder.query({
      query: () => ({ url: "/users/get-team" }),
      providesTags: ["Users"],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: "/users/profile",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Users"],
    }),
    changePassword: builder.mutation({
      query: (data) => ({
        url: "/users/change-password",
        method: "PUT",
        body: data,
      }),
    }),
    activateUser: builder.mutation({
      query: (data) => ({
        url: `/users/${data.id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),

    // ─── Notifications ───
    getNotifications: builder.query({
      query: () => ({ url: "/users/notifications" }),
      providesTags: ["Notifications"],
    }),
    markNotifRead: builder.mutation({
      query: (data) => ({
        url: "/users/read-noti",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Notifications"],
    }),

    // ─── Chat ───
    getChatContacts: builder.query({
      query: () => ({ url: "/chat/contacts" }),
      providesTags: ["Chat"],
    }),
    getChatConversations: builder.query({
      query: () => ({ url: "/chat/conversations" }),
      providesTags: ["Chat"],
    }),
    createOrGetConversation: builder.mutation({
      query: (data) => ({
        url: "/chat/conversations",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Chat"],
    }),
    getChatMessages: builder.query({
      query: ({ conversationId, page = 1, limit = 30 }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        params: { page, limit },
      }),
      providesTags: ["Chat"],
    }),
    sendChatMessage: builder.mutation({
      query: (data) => ({
        url: "/chat/messages",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Chat"],
    }),
    markChatRead: builder.mutation({
      query: (conversationId) => ({
        url: `/chat/conversations/${conversationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Chat"],
    }),

    // ─── Tasks ───
    getDashboardStats: builder.query({
      query: () => ({ url: "/tasks/dashboard" }),
      providesTags: ["Dashboard"],
    }),
    getTasks: builder.query({
      query: ({ stage, isTrashed }) => ({
        url: "/tasks",
        params: { stage, isTrashed },
      }),
      providesTags: ["Tasks"],
    }),
    getTask: builder.query({
      query: (id) => ({ url: `/tasks/${id}` }),
      providesTags: ["Tasks"],
    }),
    createTask: builder.mutation({
      query: (data) => ({
        url: "/tasks/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Tasks", "Dashboard"],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tasks/update/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Tasks", "Dashboard"],
    }),
    updateTaskStage: builder.mutation({
      query: ({ id, stage }) => ({
        url: `/tasks/update-stage/${id}`,
        method: "PUT",
        body: { stage },
      }),
      invalidatesTags: ["Tasks", "Dashboard"],
    }),
    duplicateTask: builder.mutation({
      query: (id) => ({
        url: `/tasks/duplicate/${id}`,
        method: "POST",
      }),
      invalidatesTags: ["Tasks", "Dashboard"],
    }),
    trashTask: builder.mutation({
      query: (id) => ({
        url: `/tasks/delete-restore/${id}?actionType=trash`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Dashboard"],
    }),
    deleteRestoreTask: builder.mutation({
      query: ({ id, actionType }) => ({
        url: id
          ? `/tasks/delete-restore/${id}?actionType=${actionType}`
          : `/tasks/delete-restore?actionType=${actionType}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Dashboard"],
    }),
    createSubTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tasks/create-subtask/${id}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Tasks"],
    }),
    postActivity: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tasks/activity/${id}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Tasks"],
    }),

    // ─── 3D Files ───
    uploadFile3D: builder.mutation({
      query: (formData) => ({
        url: "/files/upload",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Files3D"],
    }),
    getFiles3D: builder.query({
      query: (params) => ({
        url: "/files",
        params,
      }),
      providesTags: ["Files3D"],
    }),
    getFile3D: builder.query({
      query: (id) => ({ url: `/files/${id}` }),
      providesTags: ["Files3D"],
    }),
    reviewFile3D: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/files/review/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Files3D"],
    }),
    deleteFile3D: builder.mutation({
      query: (id) => ({
        url: `/files/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Files3D"],
    }),

    // ─── Client: Briefs ───
    createBrief: builder.mutation({
      query: (formData) => ({
        url: "/client/briefs",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Briefs"],
    }),
    getBriefs: builder.query({
      query: (params) => ({
        url: "/client/briefs",
        params,
      }),
      providesTags: ["Briefs"],
    }),
    getBrief: builder.query({
      query: (id) => ({ url: `/client/briefs/${id}` }),
      providesTags: ["Briefs"],
    }),
    updateBriefStatus: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/client/briefs/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Briefs"],
    }),
    deleteBrief: builder.mutation({
      query: (id) => ({
        url: `/client/briefs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Briefs"],
    }),

    // ─── Client: Annotations ───
    createAnnotation: builder.mutation({
      query: (data) => ({
        url: "/client/annotations",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Annotations"],
    }),
    getAnnotations: builder.query({
      query: (fileId) => ({ url: `/client/annotations/${fileId}` }),
      providesTags: ["Annotations"],
    }),
    resolveAnnotation: builder.mutation({
      query: (id) => ({
        url: `/client/annotations/resolve/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Annotations"],
    }),
    deleteAnnotation: builder.mutation({
      query: (id) => ({
        url: `/client/annotations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Annotations"],
    }),
    updateAnnotation: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/client/annotations/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Annotations"],
    }),
    submitCorrections: builder.mutation({
      query: (fileId) => ({
        url: `/client/annotations/submit/${fileId}`,
        method: "POST",
      }),
    }),
    approveModel: builder.mutation({
      query: (fileId) => ({
        url: `/client/approve/${fileId}`,
        method: "POST",
      }),
    }),

    // ─── Client: Gallery ───
    getClientGallery: builder.query({
      query: () => ({ url: "/client/gallery" }),
      providesTags: ["Gallery"],
    }),

    // ─── Admin→User: Source Files ───
    uploadSources: builder.mutation({
      query: (formData) => ({
        url: "/sources/upload",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Sources"],
    }),
    getSources: builder.query({
      query: (params) => ({ url: "/sources", params }),
      providesTags: ["Sources"],
    }),
    deleteSource: builder.mutation({
      query: (id) => ({ url: `/sources/${id}` , method: "DELETE" }),
      invalidatesTags: ["Sources"],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useGetTeamListQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useActivateUserMutation,
  useDeleteUserMutation,
  useGetNotificationsQuery,
  useMarkNotifReadMutation,
  useGetChatContactsQuery,
  useGetChatConversationsQuery,
  useCreateOrGetConversationMutation,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useMarkChatReadMutation,
  useGetDashboardStatsQuery,
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStageMutation,
  useDuplicateTaskMutation,
  useTrashTaskMutation,
  useDeleteRestoreTaskMutation,
  useCreateSubTaskMutation,
  usePostActivityMutation,
  useUploadFile3DMutation,
  useGetFiles3DQuery,
  useGetFile3DQuery,
  useReviewFile3DMutation,
  useDeleteFile3DMutation,
  useCreateBriefMutation,
  useGetBriefsQuery,
  useGetBriefQuery,
  useUpdateBriefStatusMutation,
  useDeleteBriefMutation,
  useCreateAnnotationMutation,
  useGetAnnotationsQuery,
  useResolveAnnotationMutation,
  useDeleteAnnotationMutation,
  useUpdateAnnotationMutation,
  useSubmitCorrectionsMutation,
  useApproveModelMutation,
  useGetClientGalleryQuery,
  useUploadSourcesMutation,
  useGetSourcesQuery,
  useDeleteSourceMutation,
} = apiSlice;