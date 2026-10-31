import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { PasswordLoginDto } from './dto/password-login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion Google via OpenID Connect (étudiants, personnels, invités)' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton Google invalide, expiré ou audience/émetteur incorrect' })
  @ApiForbiddenResponse({ description: 'Compte non invité, suspendu, sans affectation ou domaine refusé' })
  async googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithGoogle(dto.idToken, ipAddress, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion administrateur avec email et mot de passe' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email ou mot de passe incorrect' })
  @ApiForbiddenResponse({ description: 'Compte suspendu ou sans affectation active' })
  @ApiTooManyRequestsResponse({ description: 'Limite de tentatives dépassée (5 échecs en 15m)' })
  async login(@Body() dto: PasswordLoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithPassword(dto.email, dto.password, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir les jetons d accès et de session (rotation de jeton)' })
  @ApiOkResponse({ description: 'Nouveaux jetons accessToken et refreshToken' })
  @ApiUnauthorizedResponse({ description: 'Jeton de rafraîchissement invalide, expiré ou session révoquée' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(dto.refreshToken, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion et révocation de la session courante' })
  @ApiOkResponse({ description: 'Session révoquée' })
  async logout(@CurrentUser() user: any, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await this.authService.logout(user?.sessionId, user?.id, ipAddress, userAgent);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l utilisateur courant avec ses affectations et ses permissions' })
  @ApiOkResponse({ description: 'Utilisateur courant et ses permissions calculées' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
