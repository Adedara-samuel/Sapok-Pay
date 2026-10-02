import { Global, Inject, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.constants";

/**
 * A factory-provided client has no lifecycle hooks of its own — without
 * this, `app.close()` (and a real SIGTERM graceful shutdown in production)
 * never calls `.quit()`, leaving the connection dangling. Found via the
 * e2e test suite refusing to exit cleanly after a passing run — a real
 * shutdown-hygiene bug, not just a test artifact.
 */
@Injectable()
class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>("REDIS_URL");
        return new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
