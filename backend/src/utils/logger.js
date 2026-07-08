import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: false,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
        headers: request.headers,
      };
    },
    res(reply) {
      return {
        statusCode: reply.statusCode,
      };
    },
  },
});

export default logger;
