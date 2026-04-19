import { User } from '@/generated/prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.toEntity(user);
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.toEntity(user));
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toEntity(user);
  }

  async findRawById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    await this.ensureUserExists(id);

    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email is already in use');
      }
    }

    const dataToUpdate = {
      ...updateUserDto,
      password: updateUserDto.password
        ? await bcrypt.hash(updateUserDto.password, 10)
        : undefined,
    };

    const user = await this.usersRepository.update(id, dataToUpdate);
    return this.toEntity(user);
  }

  async remove(id: string): Promise<void> {
    await this.ensureUserExists(id);
    await this.usersRepository.delete(id);
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.ensureUserExists(userId);
    await this.usersRepository.setRefreshTokenHash(userId, refreshTokenHash);
  }

  private async ensureUserExists(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private toEntity(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
