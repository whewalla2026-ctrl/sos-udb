import { Resolver, Query, Mutation, Args, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarketplaceService } from './marketplace.service';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
class MarketplaceItem {
  @Field() id: string;
  @Field() name: string;
  @Field({ nullable: true }) description: string;
  @Field() cost: number;
  @Field() category: string;
  @Field() icon: string;
}

@ObjectType()
class PurchaseResult {
  @Field(() => MarketplaceItem) item: any;
  @Field(() => GraphQLJSON) transaction: any;
}

@Resolver()
export class MarketplaceResolver {
  constructor(private marketplace: MarketplaceService) {}

  @Query(() => [MarketplaceItem])
  @UseGuards(GqlAuthGuard)
  async marketplaceItems(@CurrentUser() user: any) {
    return this.marketplace.getMarketplaceItems(user.id);
  }

  @Mutation(() => PurchaseResult)
  @UseGuards(GqlAuthGuard)
  async purchaseItem(
    @CurrentUser() user: any,
    @Args('itemId') itemId: string,
  ) {
    return this.marketplace.purchaseItem(user.id, itemId);
  }
}
