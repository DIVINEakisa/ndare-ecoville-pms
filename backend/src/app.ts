import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRoutes } from './routes/index.js';
import { publicRoutes } from './routes/publicRoutes.js';

export const app = express();

app.use(helmet());

// Public QR routes need open CORS — guests scan from any device/browser
// This must be registered BEFORE the restricted CORS middleware below
app.use('/api/public', cors({ origin: '*' }), publicRoutes);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'HMS API is healthy' });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);
