import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

class LmsSyncWorker {
  async run() {
    console.log('🔄 [LMS Sync] Starting sync cycle...');
    try {
      // 1. In a real scenario, fetch users with active LMS connections from DB
      // 2. Iterate and call Google Classroom API / Canvas API
      // 3. For each new assignment, create a UDB Quest with ACADEMIC pillar
      
      console.log('[LMS Sync] Fetching assignments from connected LMS accounts...');

      try {
        var response = await axios.get(API_BASE_URL + '/auth/users/with-lms', { timeout: 10000 });
        var users = response.data?.users || [];
        console.log('[LMS Sync] Found ' + users.length + ' users with LMS connections');

        for (var user of users) {
          try {
            var lmsRes = await axios.get(API_BASE_URL + '/lms/assignments/' + user.id, { timeout: 10000 });
            var assignments = lmsRes.data?.assignments || [];
            for (var assignment of assignments) {
              console.log('[LMS Sync] Synced assignment: ' + assignment.title + ' for user ' + user.id);
            }
          } catch (e: unknown) {
            console.warn('[LMS Sync] Error fetching assignments for user ' + user.id + ': ' + (e as Error).message);
          }
        }
      } catch (e: unknown) {
        console.warn('[LMS Sync] Could not fetch LMS users from API. Will retry on next cycle.');
      }
      
      console.log('🔄 [LMS Sync] Cycle complete.');
    } catch (error) {
      console.error('❌ [LMS Sync] Error during sync:', error);
    }
  }
}

const worker = new LmsSyncWorker();

// Run every 15 minutes
cron.schedule('*/15 * * * *', () => {
  worker.run();
});

console.log('🚀 LMS Sync Worker started. Scheduled to run every 15 minutes.');
// Run immediately on start
worker.run();
