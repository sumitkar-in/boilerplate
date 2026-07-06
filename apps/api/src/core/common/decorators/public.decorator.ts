import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as exempt from the global JwtAuthGuard (registered as
 * APP_GUARD in core/auth/auth.module.ts). Every route requires a valid
 * access token by default — use this for login/refresh/accept-invite/
 * 2fa-verify-login, which run before a session exists.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
