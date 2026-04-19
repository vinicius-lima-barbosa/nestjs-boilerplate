import { User } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';

export class UserEntity {
  id!: string;
  name!: string;
  email!: string;
  role!: UserRole;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(data: Omit<User, 'password' | 'refreshTokenHash'>) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.role = data.role;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
