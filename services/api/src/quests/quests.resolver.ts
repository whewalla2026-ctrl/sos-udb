import { Resolver } from '@nestjs/graphql';
import { QuestsService } from './quests.service';

@Resolver()
export class QuestsResolver {
  constructor(private readonly questsService: QuestsService) {}
}
