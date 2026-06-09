import jwt from "jsonwebtoken";
import User from "../models/user.js";

const protectRoute= async (req, res, next) => {
    try {
        let token = req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ status: false, message: "Pas de token d'authentification" });
        }
        
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const resp = await User.findById(decodedToken.userId).select("isAdmin email role");
        
        if (!resp) {
            return res.status(401).json({ status: false, message: "Utilisateur non trouvé" });
        }
        
        req.user = {
            userId: resp._id,
            email: resp.email,
            isAdmin: resp.isAdmin,
            role: resp.role
        };
        
        next();
    } catch (error) {
        console.error("❌ Auth error:", error.message);
        return res.status(401).json({ status: false, message: "Token invalide ou expiré" });
    }
};
const isAdminRoute = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        return res.status(403).json({
            status: false,
            message: "Not authorized as admin. Try login as admin."
        });
    }
};
export { protectRoute, isAdminRoute };
