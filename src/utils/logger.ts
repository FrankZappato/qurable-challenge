import winston from 'winston';
import { config } from '../config/environment';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: config.logging.filePath.replace('.log', '-error.log'),
      level: 'error',
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.filePath,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: config.logging.filePath.replace('.log', '-exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: config.logging.filePath.replace('.log', '-rejections.log'),
    }),
  ],
});

// Suppress logs during tests
if (config.server.isTest) {
  logger.transports.forEach((t) => (t.silent = true));
}
