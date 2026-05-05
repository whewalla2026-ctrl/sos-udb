import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { AiService } from './ai.service';
import { MonteCarloService } from './monte-carlo.service';
import { SkillAgentService } from './skill-agent.service';
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

@ObjectType() class SimulationPathwayResponse {
  @Field() name: string;
  @Field() probability: number;
  @Field() impactScore: number;
}

@ObjectType() class AvatarAttribute {
  @Field() trait: string;
  @Field() value: string;
  @Field() intensity: number;
}

@ObjectType() class SimulationResult {
  @Field() narrative: string;
  @Field(() => [SimulationPathwayResponse]) pathways: SimulationPathwayResponse[];
  @Field(() => [AvatarAttribute]) avatarAttributes: AvatarAttribute[];
  @Field() p50Academic: number;
  @Field() p50Financial: number;
  @Field() p50Wellness: number;
}

@ObjectType() class EmotionalStateResponse {
  @Field() emotion: string;
  @Field() focusScore: number;
  @Field() resilienceLevel: string;
}

@InputType() class BusinessPlanInput {
  @Field() problem: string;
  @Field() solution: string;
  @Field() targetMarket: string;
  @Field() pricingModel: string;
  @Field() founderAge: number;
}

@ObjectType() class SkillAgentResponse {
  @Field() id: string;
  @Field() skillName: string;
  @Field() status: string;
  @Field() autonomyLevel: number;
  @Field(() => String, { nullable: true }) lastAction?: string;
}

@ObjectType() class AchievementResponse {
  @Field() id: string;
  @Field() title: string;
}

@ObjectType() class MintResultResponse {
  @Field() success: boolean;
  @Field() txHash: string;
  @Field() tokenId: string;
}

@ObjectType() class SkillMasteryResponse {
  @Field(() => AchievementResponse) achievement: AchievementResponse;
  @Field(() => MintResultResponse) mintResult: MintResultResponse;
}

@Resolver()
export class AiResolver {
  constructor(
    private ai: AiService,
    private monteCarlo: MonteCarloService,
    private skillAgent: SkillAgentService
  ) {}

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

  @Mutation(() => SimulationResult)
  @UseGuards(GqlAuthGuard)
  async runFutureSimulation(@CurrentUser() user: any): Promise<SimulationResult> {
    const results = await this.monteCarlo.runSimulation(user.id);
    const narrative = await this.ai.generateFutureSelfNarrative(user.id, results);
    const avatarAttributes = await this.ai.calculateAvatarEvolution(user.id, results);
    
    return {
      narrative,
      avatarAttributes,
      pathways: [
        { name: 'Academic Scholar', probability: results.pathways.academicMastery / 10, impactScore: 0.8 },
        { name: 'Tech Entrepreneur', probability: results.pathways.financialIndependence / 10, impactScore: 0.9 },
        { name: 'Wellness Guru', probability: results.pathways.wellnessScore / 10, impactScore: 0.85 },
      ],
      p50Academic: results.p50.academic,
      p50Financial: results.p50.financial,
      p50Wellness: results.p50.wellness,
    };
  }

  @Mutation(() => EmotionalStateResponse)
  @UseGuards(GqlAuthGuard)
  async analyzeEmotionalState(
    @CurrentUser() user: any,
    @Args('videoUrl') videoUrl: string,
    @Args('transcript') transcript: string,
  ) {
    return this.ai.analyzeEmotionalState(user.id, videoUrl, transcript);
  }

  @Mutation(() => SkillAgentResponse)
  @UseGuards(GqlAuthGuard)
  async deploySkillAgent(
    @CurrentUser() user: any,
    @Args('skillName') skillName: string,
  ) {
    return this.skillAgent.deployAgent(user.id, skillName);
  }

  @Query(() => [SkillAgentResponse])
  @UseGuards(GqlAuthGuard)
  async mySkillAgents(@CurrentUser() user: any) {
    return this.skillAgent.getMyAgents(user.id);
  }

  @Mutation(() => SkillMasteryResponse)
  @UseGuards(GqlAuthGuard)
  async completeSkillMastery(
    @Args('agentId') agentId: string,
  ) {
    return this.skillAgent.completeSkillMastery(agentId);
  }
}
