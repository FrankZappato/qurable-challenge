import { App } from './app';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    const app = new App();
    await app.start();
  } catch (error) {
    logger.error('Fatal error during bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
