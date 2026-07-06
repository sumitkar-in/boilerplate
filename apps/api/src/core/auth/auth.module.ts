import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { authConfig } from '../config';
import { AuditLogService } from '../common/audit-log.service';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AuthContextMiddleware } from './auth-context.middleware';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ImpersonationService } from './impersonation.service';
import { InvitesService } from './invites.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { TokenService } from './token.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (auth: ReturnType<typeof authConfig>) => ({
        secret: auth.jwtSecret,
      }),
    }),
    UsersModule,
    TenantsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    TwoFactorAuthService,
    InvitesService,
    ImpersonationService,
    AuthContextMiddleware,
    RefreshTokensService,
    TwoFactorService,
    AuditLogService,
    // Global default guard — every route requires a valid access token
    // unless marked @Public(). See: core/auth/guards/jwt-auth.guard.ts
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // '{*splat}' is the Express 5 / path-to-regexp v8 wildcard-all syntax.
    consumer.apply(AuthContextMiddleware).forRoutes('{*splat}');
  }
}
