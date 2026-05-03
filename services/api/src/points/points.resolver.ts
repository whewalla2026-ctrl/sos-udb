import { Resolver, Query, Args, Int, ObjectType, Field } from '@nestjs/graphql';
import { PointsService } from './points.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ObjectType()
class LedgerEntry {
  @Field() id: string;
  @Field() transactionType: string;
  @Field(() => Int) amount: number;
  @Field(() => Int) balanceAfter: number;
  @Field() source: string;
  @Field({ nullable: true }) description?: string;
  @Field() status: string;
  @Field() createdAt: Date;
}

@ObjectType()
class LedgerPage {
  @Field(() => [LedgerEntry]) entries: LedgerEntry[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) pageSize: number;
}

@Resolver()
export class PointsResolver {
  constructor(private points: PointsService) {}

  @Query(() => Int)
  @UseGuards(GqlAuthGuard)
  async myBalance(@CurrentUser() user: any): Promise<number> {
    return this.points.getBalance(user.id);
  }

  @Query(() => LedgerPage)
  @UseGuards(GqlAuthGuard)
  async myLedger(
    @CurrentUser() user: any,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
  ): Promise<any> {
    return this.points.getLedger(user.id, page, pageSize) as any;
  }
}
