import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Notice from "../models/notification.js";

const createJWT = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000
    });
};

export const registerUser = async (req, res) => {
    try {
        const { fullname, email, password, isAdmin, role, title } = req.body;
        const userExist = await User.findOne({ email });
        if (userExist) {
            return res.status(400).json({
                status: false,
                message: "User already exists",
            });
        }
        const user = await User.create({
            fullname,
            email,
            password,
            isAdmin,
            role,
            title
        });
        if (user) {
            createJWT(res, user._id);
            user.password = undefined;
            res.status(201).json({
                status: true,
                message: "User registered successfully",
                user
            });
        } else {
            return res
                .status(400)
                .json({ status: false, message: "Invalid user data" });
        }
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while registering the user",
            error: error.message
        });
    }
};
export const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if (user && (await user.matchPassword(password))) {
            createJWT(res, user._id);
            user.password = undefined;
            res.status(200).json({
                status: true,
                message: "User logged in successfully",
                user
            });

        } else {
            return res.status(401).json({
                status: false,
                message: "Invalid email or password."
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while logging in",
            error: error.message
        });
    }
};
export const logoutUser = async (req, res) => {
    try {
        res.cookie( "token" , "" , {
            httpOnly: true,
            expires : new Date(0),
        });
        res.status(200).json({
            message: "Logout successful"
        });
} catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
}
};

export const getTeamList = async (req, res) => {
    try {
        const users = await User.find()
            .select("fullname title role email isActive");
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error.message });
    }
};

export const getNotificationsList = async (req, res) => {
    try {
        const { userId, isAdmin } = req.user;

        const query = {
            isRead: { $nin: [userId] },
        };

        if (isAdmin) {
            query.$or = [
                { team: userId },
                { team: { $size: 0 } },
            ];
        } else {
            query.team = userId;
        }

        const notice = await Notice.find(query)
            .populate("task", "title")
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json(notice);
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try{
        const { userId, isAdmin } = req.user;
        const { _id } = req.body;
        const id =
     isAdmin && userId ==_id
    ? userId 
    : isAdmin && userId !=_id
    ? _id
    : userId;
        const user = await User.findById(id);
        if(user) {
            user.fullname = req.body.fullname || user.fullname;
            user.title = req.body.title || user.title;
            user.email = req.body.email || user.email;
            const updatedUser = await user.save();
            res.status(200).json({
                status: true,
                message: "User profile updated successfully",
                user: updatedUser
            });
            user.password = undefined;
        }}
    catch (error) {
        console. log(error) ;
        return res.status(400).json({ status: false, message: error.message });
    }
};
export const markNotificationRead = async (req, res) => {
    try {
        const { userId } = req.user;
        const { isReadType, id } = req.query;
        let notice;
        if (isReadType === "all") {
            notice = await Notice.updateMany(
                { team: userId, isRead: { $nin: [userId] } },
                { $addToSet: { isRead: userId } }
            );
        } else {
            notice = await Notice.findOneAndUpdate(
                { _id: id, isRead: { $nin: [userId] } },
                { $addToSet: { isRead: userId } },
                { new: true }
            );
        }
        res.status(200).json({
            status: true,
            message: "Done",
            notice
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};
export const changeUserPassword = async (req, res) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                status: false,
                message: "Current and new passwords are required"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                status: false,
                message: "Current password is incorrect"
            });
        }

        user.password = newPassword;
        await user.save();
        user.password = undefined;

        res.status(200).json({
            status: true,
            message: "Password updated successfully",
            user
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};
export const changeUserStatus = async (req, res) => {
    try {

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};
export const activateUserProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.body;
        const user = await User.findById(id);
        if (user) {
            user.isActive = req.body.isActive;
            await user.save();
            user.password = undefined;
            res.status(201).json({
                status: true,
                message: `User account has been ${user?.isActive ? "activated" : "disabled"}`
            });
        } else {
            res.status(404).json({
                status: false,
                message: "User not found"
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};
export const deleteUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.status(200).json({ status: true, message: "User deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};