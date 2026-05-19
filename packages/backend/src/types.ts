import { Env } from 'hono';

export interface AppEnv extends Env {
    Variables: {
        userId: bigint;
        authMethod: string;
    };
}
