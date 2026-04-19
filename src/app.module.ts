import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, UsersModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
