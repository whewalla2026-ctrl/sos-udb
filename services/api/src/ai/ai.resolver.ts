import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { AiService } from './ai.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ObjectType, Field, InputType } from '@nestjs/graphql';

@ObjectType() class SocraticResponse {
  @Field() response: string;
  @Field() intent: string;
}

@ObjectType() class BusinessPlanResponse {
  @Field() executiveSummary: string;
  @Field() isValid: boolean;
  @Field() validationNotes: string;
}

@InputType() class BusinessPlanInput {
  @Field() problem: string;
  @Field() solution: string;
  @Field() targetMarket: string;
  @Field() pricingModel: string;
  @Field() founderAge: number;
}

@Resolver()
export class AiResolver {
  constructor(private ai: AiService) {}

  @Mutation(() => SocraticResponse)
  @UseGuards(GqlAuthGuard)
  async askTutor(
    @CurrentUser() user: any,
    @Args('sessionId') sessionId: string,
    @Args('input') input: string,
    @Args('subject') subject: string,
  ) {
    const { response, intent } = await this.ai.runSocraticSession(user.id, sessionId, input, subject, []);
    return { response, intent };
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async coachingInsight(@CurrentUser() user: any): Promise<string> {
    return this.ai.getCoachingInsight(user.id);
  }

  @Mutation(() => BusinessPlanResponse)
  @UseGuards(GqlAuthGuard)
  async generateBusinessPlan(@Args('data') data: BusinessPlanInput) {
    return this.ai.generateBusinessPlan(data);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async futureSelfNarrative(@CurrentUser() user: any): Promise<string> {
    return this.ai.generateFutureSelfNarrative(user.id);
  }
}
