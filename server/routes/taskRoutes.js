import express from 'express';
import { isAdminRoute, protectRoute } from '../middlewares/authMiddleware.js';
import {
	getTasks,
	getTask,
	createTask,
	duplicateTask,
	postTaskActivity,
	createSubTask,
	updateTask,
	updateTaskStage,
	deleteRestoreTask,
	dashboardStatistics
} from '../controllers/taskController.js';

const router = express.Router();

// Create task
router.post('/create', protectRoute, isAdminRoute, createTask);

// Duplicate task
router.post('/duplicate/:id', protectRoute, isAdminRoute, duplicateTask);

// Post task activity
router.post('/activity/:id', protectRoute, postTaskActivity);

// Get dashboard statistics
router.get('/dashboard', protectRoute, dashboardStatistics);

// Get all tasks
router.get('/', protectRoute, getTasks);

// Get single task by ID
router.get('/:id', protectRoute, getTask);

// Create subtask
router.post('/create-subtask/:id', protectRoute, isAdminRoute, createSubTask);

// Update task
router.put('/update/:id', protectRoute, isAdminRoute, updateTask);

// Update task stage (admin or assigned user)
router.put('/update-stage/:id', protectRoute, updateTaskStage);

// Trash task

router.delete('/delete-restore', protectRoute, isAdminRoute, deleteRestoreTask);
router.delete('/delete-restore/:id', protectRoute, isAdminRoute, deleteRestoreTask);

export default router;