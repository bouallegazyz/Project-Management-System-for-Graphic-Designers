import express from 'express';
import userRoutes from './userRoutes.js';
import taskRoutes from './taskRoutes.js';
import fileRoutes from './fileRoutes.js';
import clientRoutes from './clientRoutes.js';
import sourceRoutes from './sourceRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = express.Router();

// Available route modules
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/files', fileRoutes);
router.use('/client', clientRoutes);
router.use('/sources', sourceRoutes);
router.use('/chat', chatRoutes);

export default router;