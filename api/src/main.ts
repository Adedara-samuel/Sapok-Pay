import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.use(helmet());

  // CORS IS needed (unlike a pure internal service): SAPOK Pay is a public
  // self-service platform now (see README's architecture-pivot note) — the
  // web/ dashboard calls this API directly from the browser.
  const corsOrigins = config
    .get<string>("CORS_ORIGINS", "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : true, credentials: true });

  const globalPrefix = config.get<string>("API_GLOBAL_PREFIX", "api/v1");
  app.setGlobalPrefix(globalPrefix);

  if (config.get<string>("NODE_ENV") !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("SAPOK Pay")
      .setDescription("Organisational wallet, ledger, bank-connection and payroll-payment infrastructure")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  }

  const port = config.get<number>("SAPOK_PAY_PORT", 4100);
  await app.listen(port);
  logger.log(`SAPOK Pay listening on http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
