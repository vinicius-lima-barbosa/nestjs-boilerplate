import { UserRole } from '@/generated/prisma/enums';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const usersRepositoryMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setRefreshTokenHash: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(usersRepositoryMock);
  });

  it('should create a user with hashed password', async () => {
    const dto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '12345678',
      role: UserRole.USER,
    };

    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    usersRepositoryMock.create.mockResolvedValue({
      id: 'user-id',
      name: dto.name,
      email: dto.email,
      role: dto.role,
      password: 'hashed-password',
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const hashMock = bcrypt.hash as jest.Mock;
    hashMock.mockResolvedValue('hashed-password');

    const result = await service.create(dto);

    expect(usersRepositoryMock.findByEmail.mock.calls[0][0]).toBe(dto.email);
    expect(hashMock.mock.calls[0]).toEqual([dto.password, 10]);
    expect(usersRepositoryMock.create.mock.calls[0][0]).toEqual({
      ...dto,
      password: 'hashed-password',
    });
    expect(result.email).toBe(dto.email);
  });

  it('should throw conflict when email already exists', async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue({
      id: 'user-id',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.USER,
      password: 'hashed-password',
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: '12345678',
        role: UserRole.USER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should throw not found when deleting missing user', async () => {
    usersRepositoryMock.findById.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
