import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { dashboardRoutes } from './dashboardRoutes.js';
import { propertyRoutes } from './propertyRoutes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/dashboard', dashboardRoutes);
apiRoutes.use('/properties', propertyRoutes);
