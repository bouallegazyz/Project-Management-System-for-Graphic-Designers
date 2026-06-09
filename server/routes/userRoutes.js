import express from 'express';
import { protectRoute, isAdminRoute } from '../middlewares/authMiddleware.js';
import { registerUser, loginUser, logoutUser } from '../controllers/userController.js';
import { getTeamList, getNotificationsList, updateUserProfile, markNotificationRead, changeUserPassword, activateUserProfile, deleteUserProfile } from '../controllers/userController.js';

const router = express.Router();

// Auth-related user endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

router.get('/get-team', protectRoute, isAdminRoute, getTeamList);
router.get('/notifications', protectRoute, getNotificationsList);
router.put('/profile', protectRoute, updateUserProfile);//changeUserProfi1e to UserProfile
router.put('/read-noti', protectRoute, markNotificationRead);
router.put('/change-password', protectRoute, changeUserPassword);
//FOR ADMIN ONLY - ADMIN ROUTES
router
	.route('/:id')
	.put(protectRoute, isAdminRoute, activateUserProfile)
	.delete(protectRoute, isAdminRoute, deleteUserProfile);

export default router;