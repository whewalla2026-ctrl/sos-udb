import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/user-role';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UUPSyncService } from './uup-sync.service';
import { ObjectType, Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

enum ConflictResolutionEnum {
  pending = 'pending',
  local_wins = 'local_wins',
  remote_wins = 'remote_wins',
  merged = 'merged',
}

registerEnumType(ConflictResolutionEnum, { name: 'ConflictResolution' });

@ObjectType()
class SyncDeviceType {
  @Field() id: string;
  @Field() userId: string;
  @Field() deviceId: string;
  @Field({ nullable: true }) deviceName?: string;
  @Field() deviceType: string;
  @Field({ nullable: true }) lastSyncAt?: Date;
  @Field({ nullable: true }) stateHash?: string;
  @Field(() => GraphQLJSON) metadata: any;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
}

@ObjectType()
class SyncConflictType {
  @Field() id: string;
  @Field() userId: string;
  @Field() deviceId: string;
  @Field() resourceType: string;
  @Field() resourceId: string;
  @Field(() => GraphQLJSON) localValue: any;
  @Field(() => GraphQLJSON) remoteValue: any;
  @Field() resolution: string;
  @Field({ nullable: true }) resolvedAt?: Date;
  @Field() createdAt: Date;
}

@ObjectType()
class SyncStateResult {
  @Field({ nullable: true }) synced?: boolean;
  @Field({ nullable: true }) conflict?: boolean;
  @Field({ nullable: true }) conflictId?: string;
  @Field({ nullable: true }) message?: string;
  @Field(() => GraphQLJSON, { nullable: true }) state?: any;
}

@ObjectType()
class ResolveConflictResult {
  @Field() resolved: boolean;
  @Field() resolution: string;
}

@ObjectType()
class RegisterDeviceResult {
  @Field() registered: boolean;
}

@ObjectType()
class EnqueueResult {
  @Field() queued: boolean;
}

@ObjectType()
class RetryQueueResult {
  @Field() processed: number;
  @Field() failed: number;
}

@InputType()
class RegisterDeviceInput {
  @Field() deviceId: string;
  @Field({ nullable: true }) deviceName?: string;
  @Field({ nullable: true }) deviceType?: string;
}

@InputType()
class SyncStateInput {
  @Field() deviceId: string;
  @Field(() => GraphQLJSON) localState: any;
}

@InputType()
class ResolveConflictInput {
  @Field() conflictId: string;
  @Field(() => ConflictResolutionEnum) resolution: ConflictResolutionEnum;
}

@InputType()
class OfflineChangeInput {
  @Field() deviceId: string;
  @Field(() => GraphQLJSON) payload: any;
}

@Resolver()
export class UupSyncResolver {
  constructor(private uupSync: UUPSyncService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async myUUP(@CurrentUser() user: any) {
    return this.uupSync.getUUP(user.id);
  }

  @Query(() => [SyncDeviceType])
  @UseGuards(GqlAuthGuard)
  async myDevices(@CurrentUser() user: any) {
    return this.uupSync.getDevices(user.id);
  }

  @Query(() => [SyncConflictType])
  @UseGuards(GqlAuthGuard)
  async myConflicts(
    @CurrentUser() user: any,
    @Args('status', { nullable: true }) status?: string,
  ) {
    return this.uupSync.getConflicts(user.id, status);
  }

  @Query(() => SyncConflictType, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async conflict(@CurrentUser() user: any, @Args('conflictId') conflictId: string) {
    return this.uupSync.getConflict(user.id, conflictId);
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard)
  async retryQueueSize(@CurrentUser() user: any) {
    return this.uupSync.getRetryQueueSize(user.id);
  }

  @Mutation(() => RegisterDeviceResult)
  @UseGuards(GqlAuthGuard)
  async registerDevice(
    @CurrentUser() user: any,
    @Args('input') input: RegisterDeviceInput,
  ) {
    return this.uupSync.registerDevice(
      user.id,
      input.deviceId,
      input.deviceName,
      input.deviceType,
    );
  }

  @Mutation(() => SyncStateResult)
  @UseGuards(GqlAuthGuard)
  async syncState(
    @CurrentUser() user: any,
    @Args('input') input: SyncStateInput,
  ) {
    return this.uupSync.syncState(user.id, input.deviceId, input.localState);
  }

  @Mutation(() => ResolveConflictResult)
  @UseGuards(GqlAuthGuard)
  async resolveConflict(
    @CurrentUser() user: any,
    @Args('input') input: ResolveConflictInput,
  ) {
    return this.uupSync.resolveConflict(user.id, input.conflictId, input.resolution as any);
  }

  @Mutation(() => EnqueueResult)
  @UseGuards(GqlAuthGuard)
  async enqueueOfflineChange(
    @CurrentUser() user: any,
    @Args('input') input: OfflineChangeInput,
  ) {
    return this.uupSync.enqueueOfflineChange(user.id, input.deviceId, input.payload);
  }

  @Mutation(() => RetryQueueResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async processRetryQueue() {
    return this.uupSync.processRetryQueue();
  }
}
