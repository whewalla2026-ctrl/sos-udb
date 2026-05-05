import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { InstitutionalService } from './institutional.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class InstitutionalResolver {
  constructor(private readonly institutionalService: InstitutionalService) {}

  @Query(() => GraphQLJSON)
  async getInstitutionalAnalytics(@Args('partnerId') partnerId: string) {
    return this.institutionalService.getInstitutionalAnalytics(partnerId);
  }

  @Mutation(() => GraphQLJSON)
  async onboardPartner(
    @Args('name') name: string,
    @Args('domain') domain: string,
    @Args('contactEmail') contactEmail: string,
  ) {
    return this.institutionalService.onboardPartner({ name, domain, contactEmail });
  }
}
