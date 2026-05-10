import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../shared/user-role';
import { ROLES_KEY } from '../guards/roles.guard';

export var Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
