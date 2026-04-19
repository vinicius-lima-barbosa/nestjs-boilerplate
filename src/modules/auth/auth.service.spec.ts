import { UserRole } from '@/generated/prisma/enums';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    validateCredentials: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    findRawById: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        'jwt.accessSecret': 'access-secret',
        'jwt.refreshSecret': 'refresh-secret',
        'jwt.accessExpiresIn': 900,
        'jwt.refreshExpiresIn': 604800,
      };
      return values[key];
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const user = {
    id: 'user-id',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed-password',
    role: UserRole.USER,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersServiceMock,
      jwtServiceMock,
      configServiceMock,
    );
  });

  it('should return tokens on valid login', async () => {
    usersServiceMock.validateCredentials.mockResolvedValue(user);
    jwtServiceMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    usersServiceMock.updateRefreshTokenHash.mockResolvedValue();
    const hashMock = bcrypt.hash as jest.Mock;
    hashMock.mockResolvedValue('hashed-refresh');

    const result = await service.login({
      email: user.email,
      password: '12345678',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(usersServiceMock.updateRefreshTokenHash.mock.calls[0]).toEqual([
      user.id,
      'hashed-refresh',
    ]);
  });

  it('should throw unauthorized when login credentials are invalid', async () => {
    usersServiceMock.validateCredentials.mockRejectedValue(
      new UnauthorizedException('Invalid credentials'),
    );

    await expect(
      service.login({ email: 'john@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw unauthorized when refresh token does not match', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
    });
    usersServiceMock.findRawById.mockResolvedValue({
      ...user,
      refreshTokenHash: 'stored-hash',
    });
    const compareMock = bcrypt.compare as jest.Mock;
    compareMock.mockResolvedValue(false);

    await expect(
      service.refresh('invalid-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
