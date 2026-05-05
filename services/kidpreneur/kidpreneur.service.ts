import { Injectable } from '@nestjs/common';

@Injectable()
export class KidPreneurService {
  planBusiness(userId: string) {
    return { userId, status: 'planning' };
  }
}
