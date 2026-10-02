export type AuthScope = "merchant" | "admin";

export interface AccessTokenPayload {
  sub: string;
  scope: AuthScope;
  iat?: number;
  exp?: number;
}
