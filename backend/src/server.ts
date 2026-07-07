import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap() {
  await connectDatabase();
  app.listen(env.PORT, () => {
    console.log(`HMS API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start HMS API', error);
  process.exit(1);
});
