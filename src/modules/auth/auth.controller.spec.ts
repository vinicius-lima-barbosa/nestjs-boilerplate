import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const registerMock = jest.fn();
  const loginMock = jest.fn();
  const refreshMock = jest.fn();
  const logoutMock = jest.fn();

  const authServiceMock = {
    register: registerMock,
    login: loginMock,
    refresh: refreshMock,
    logout: logoutMock,
  } as unknown as jest.Mocked<AuthService>;

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string | number | boolean> = {
        'authCookies.secure': false,
        'authCookies.sameSite': 'lax',
        'authCookies.accessMaxAge': 900000,
        'authCookies.refreshMaxAge': 604800000,
      };
      return values[key];
    }),
  } as unknown as jest.Mocked<ConfigService>;

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authServiceMock, configServiceMock);
  });

  it('should be auth cookies on register', async () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;

    authServiceMock.register.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-id',
        name: 'John',
        email: 'john@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const registerResponse = await controller.register(
      { name: 'John', email: 'john@example.com', password: '12345678' },
      response,
    );

    expect(registerResponse.user.id).toBe('user-id');
    expect(cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-token',
      expect.objectContaining({ path: '/' }),
    );
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ path: '/auth/refresh' }),
    );
  });

  it('should set auth cookies on login', async () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;

    authServiceMock.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-id',
        name: 'John',
        email: 'john@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const loginResponse = await controller.login(
      { email: 'john@example.com', password: '12345678' },
      response,
    );

    expect(loginResponse.user.id).toBe('user-id');
    expect(cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-token',
      expect.objectContaining({ path: '/' }),
    );
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ path: '/auth/refresh' }),
    );
  });

  it('should use refresh token from cookie', async () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;
    const request = {
      cookies: {
        refresh_token: 'cookie-refresh-token',
      },
    } as unknown as Request;

    authServiceMock.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-id',
        name: 'John',
        email: 'john@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const refreshResponse = await controller.refresh(request, response);

    expect(refreshResponse.user.id).toBe('user-id');

    expect(refreshMock).toHaveBeenCalledWith('cookie-refresh-token');
  });

  it('should clear cookies on logout', async () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;

    authServiceMock.logout.mockResolvedValue();

    await controller.logout({ id: 'user-id' }, response);

    expect(logoutMock).toHaveBeenCalledWith('user-id');
    expect(clearCookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      expect.objectContaining({ path: '/' }),
    );
    expect(clearCookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      expect.objectContaining({ path: '/auth/refresh' }),
    );
  });
});
