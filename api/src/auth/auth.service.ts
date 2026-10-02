import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { ConflictApiException, ForbiddenApiException, UnauthorizedApiException } from "../common/exceptions/api.exception";
import type { AccessTokenPayload, AuthScope } from "./jwt-payload";

/**
 * Bcrypt hash of an arbitrary fixed string, never a real password. Compared
 * against on a "no such account" login attempt purely to burn roughly the
 * same CPU time as a real bcrypt.compare — otherwise "unknown email"
 * responses return measurably faster than "wrong password" ones, which is
 * itself a user-enumeration side channel.
 */
const TIMING_SAFE_DUMMY_HASH = "$2b$12$A32ZipC6u3YQv8hIx/a0RexVV3ya3GTJp2wWX8TJ.OFSbdupesTg6";

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async merchantSignup(email: string, password: string, businessName: string): Promise<AuthTokens> {
    const existing = await this.prisma.merchant.findUnique({ where: { email } });
    if (existing) throw new ConflictApiException("A merchant account with this email already exists", "EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(password, this.config.get<number>("BCRYPT_SALT_ROUNDS", 12));

    const merchant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.merchant.create({ data: { email, passwordHash, businessName } });
      const wallet = await tx.wallet.create({ data: { merchantId: created.id, currency: "NGN" } });
      await tx.ledgerAccount.create({ data: { walletId: wallet.id, currency: "NGN" } });
      return created;
    });

    return this.issueTokens(merchant.id, "merchant");
  }

  async merchantLogin(email: string, password: string): Promise<AuthTokens> {
    const merchant = await this.prisma.merchant.findUnique({ where: { email } });
    const passwordMatches = await bcrypt.compare(password, merchant?.passwordHash ?? TIMING_SAFE_DUMMY_HASH);
    if (!merchant || !passwordMatches) {
      throw new UnauthorizedApiException("Incorrect email or password", "INVALID_CREDENTIALS");
    }
    if (merchant.status !== "ACTIVE") {
      throw new ForbiddenApiException("This account has been suspended. Contact support.", "ACCOUNT_SUSPENDED");
    }

    await this.prisma.merchant.update({ where: { id: merchant.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(merchant.id, "merchant");
  }

  /**
   * One login for every user — merchant or platform admin. Looks up both
   * tables and bcrypt-compares against both (a real hash, or the timing-safe
   * dummy one if that table had no match) before deciding, so response time
   * never leaks which table an email belongs to, or whether it exists at
   * all. An email could in principle exist in both tables; whichever one's
   * password actually matches wins, checked admin-first.
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    const [admin, merchant] = await Promise.all([this.prisma.adminUser.findUnique({ where: { email } }), this.prisma.merchant.findUnique({ where: { email } })]);

    const adminMatches = await bcrypt.compare(password, admin?.passwordHash ?? TIMING_SAFE_DUMMY_HASH);
    if (admin && adminMatches) {
      if (admin.status !== "ACTIVE") throw new ForbiddenApiException("This account has been disabled", "ACCOUNT_DISABLED");
      await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
      return this.issueTokens(admin.id, "admin");
    }

    const merchantMatches = await bcrypt.compare(password, merchant?.passwordHash ?? TIMING_SAFE_DUMMY_HASH);
    if (merchant && merchantMatches) {
      if (merchant.status !== "ACTIVE") throw new ForbiddenApiException("This account has been suspended. Contact support.", "ACCOUNT_SUSPENDED");
      await this.prisma.merchant.update({ where: { id: merchant.id }, data: { lastLoginAt: new Date() } });
      return this.issueTokens(merchant.id, "merchant");
    }

    throw new UnauthorizedApiException("Incorrect email or password", "INVALID_CREDENTIALS");
  }

  async adminLogin(email: string, password: string): Promise<AuthTokens> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    const passwordMatches = await bcrypt.compare(password, admin?.passwordHash ?? TIMING_SAFE_DUMMY_HASH);
    if (!admin || !passwordMatches) {
      throw new UnauthorizedApiException("Incorrect email or password", "INVALID_CREDENTIALS");
    }
    if (admin.status !== "ACTIVE") {
      throw new ForbiddenApiException("This account has been disabled", "ACCOUNT_DISABLED");
    }

    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(admin.id, "admin");
  }

  private async issueTokens(sub: string, scope: AuthScope): Promise<AuthTokens> {
    const expiresIn = this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m");
    const payload: AccessTokenPayload = { sub, scope };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn,
    });
    return { accessToken, expiresIn: durationToSeconds(expiresIn) };
  }
}

const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

function durationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 900;
  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit as keyof typeof UNIT_SECONDS];
}
