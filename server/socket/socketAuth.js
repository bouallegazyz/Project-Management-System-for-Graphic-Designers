import jwt from "jsonwebtoken";

import User from "../models/user.js";

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const equalIndex = part.indexOf("=");
      if (equalIndex === -1) return acc;

      const key = part.slice(0, equalIndex).trim();
      const value = part.slice(equalIndex + 1).trim();
      if (!key) return acc;

      acc[key] = decodeURIComponent(value || "");
      return acc;
    }, {});
};

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake?.headers?.cookie || "");
    const tokenFromCookie = cookies.token;
    const tokenFromAuth = socket.handshake?.auth?.token;
    const token = tokenFromCookie || tokenFromAuth;

    if (!token) {
      return next(new Error("No auth token"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select(
      "_id fullname email role isAdmin isActive"
    );

    if (!user || !user.isActive) {
      return next(new Error("User not allowed"));
    }

    socket.user = {
      userId: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    };

    return next();
  } catch (error) {
    return next(new Error("Invalid auth token"));
  }
};
