import pino from 'pino';
import { config } from './config.mjs';

export const log = pino({ level: config.LOG_LEVEL });
