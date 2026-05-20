import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3030),
  HOST: z.string().default('127.0.0.1'),
  IPC_ROOT: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
});

export const config = schema.parse(process.env);
