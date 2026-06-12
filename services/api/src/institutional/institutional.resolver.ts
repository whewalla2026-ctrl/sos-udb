import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InstitutionalService, TeacherDashboard } from './institutional.service';
import { MockIntegrationService } from '../shared/mock-integration.service';

@Resolver()
export class InstitutionalResolver {
  constructor(
    private institutional: InstitutionalService,
    private mock: MockIntegrationService,
  ) {}

  @Query(() => String, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async teacherDashboard(@CurrentUser() user: any): Promise<TeacherDashboard | null> {
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') return null;
    return this.institutional.getTeacherDashboard(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async assignQuestToClass(
    @CurrentUser() user: any,
    @Args('questId') questId: string,
    @Args('classId') classId: string,
  ): Promise<boolean> {
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') return false;
    await this.institutional.assignQuestToClass(questId, classId, user.id);
    return true;
  }

  @Query(() => String, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async cleverSync(@CurrentUser() user: any, @Args('districtId') districtId: string): Promise<string | null> {
    if (user.role !== 'ADMIN') return null;
    const result = await this.mock.cleverSync(districtId);
    return `Synced ${result.students.length} students, ${result.teachers.length} teachers from Clever district ${districtId}`;
  }

  @Query(() => String, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async classLinkSync(@CurrentUser() user: any, @Args('orgId') orgId: string): Promise<string | null> {
    if (user.role !== 'ADMIN') return null;
    const result = await this.mock.classLinkSync(orgId);
    return `Synced ${result.users.length} users from ClassLink org ${orgId}`;
  }

  @Query(() => Int)
  async cohortSize(@Args('schoolId') schoolId: string): Promise<number> {
    return this.institutional.getCohortSize(schoolId);
  }
}
