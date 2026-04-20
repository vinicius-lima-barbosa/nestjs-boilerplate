import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService, AuthTokens } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @HttpCode(201)
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const authResponse = await this.authService.register(registerDto);
    this.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const authResponse = await this.authService.login(loginDto);
    this.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = request.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const authResponse = await this.authService.refresh(refreshToken);
    this.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Post('logout')
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(user.id);
    this.clearAuthCookies(response);
  }

  private setAuthCookies(response: Response, authResponse: AuthTokens): void {
    const baseOptions = this.getBaseCookieOptions();

    response.cookie('access_token', authResponse.accessToken, {
      ...baseOptions,
      maxAge: this.configService.getOrThrow<number>('authCookies.accessMaxAge'),
      path: '/',
    });

    response.cookie('refresh_token', authResponse.refreshToken, {
      ...baseOptions,
      maxAge: this.configService.getOrThrow<number>(
        'authCookies.refreshMaxAge',
      ),
      path: '/auth/refresh',
    });
  }

  private clearAuthCookies(response: Response): void {
    const baseOptions = this.getBaseCookieOptions();

    response.clearCookie('access_token', {
      ...baseOptions,
      path: '/',
    });

    response.clearCookie('refresh_token', {
      ...baseOptions,
      path: '/auth/refresh',
    });
  }

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.getOrThrow<boolean>('authCookies.secure'),
      sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>(
        'authCookies.sameSite',
      ),
    };
  }
}
