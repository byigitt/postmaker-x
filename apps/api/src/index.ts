import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import analyzeRouter from './routes/analyze.js';
import generateRouter from './routes/generate.js';
import templatesRouter from './routes/templates.js';
import timingRouter from './routes/timing.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/analyze', analyzeRouter);
app.use('/api/generate', generateRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/timing', timingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
  console.log(`[API] Health check: http://localhost:${PORT}/health`);
});

export default app;
