import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { AuthResolver } from './auth.resolver';
import { AdminAuthResolver } from './admin-auth.resolver';
import { AuthController } from './auth.controller';
import { FirebaseStrategy } from './strategies/firebase.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsModule } from '../shared/metrics.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRY', '15m') },
      }),
    }),
    PrismaModule,
    MetricsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, AuthResolver, AdminAuthResolver, FirebaseStrategy, JwtStrategy, GqlAuthGuard, RolesGuard],
  exports: [AuthService, GqlAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
