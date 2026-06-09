import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/AuthSlice";
import {apiSlice} from "./slices/apiSlice";
import chatReducer from "./slices/chatSlice";

const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    chat: chatReducer,

  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});

export default store;


