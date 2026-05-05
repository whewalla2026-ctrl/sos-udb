import { Injectable } from '@nestjs/common';
@Injectable()
export class JoonWorldService {
  private pods: Array<{ id: string; status: string }> = [];
  createStudyPod(id: string) {
    const pod = { id, status: 'created' };
    this.pods.push(pod);
    return pod;
  }
  listPods() {
    return this.pods;
  }
}
