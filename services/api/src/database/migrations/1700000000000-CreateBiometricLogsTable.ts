import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBiometricLogsTable implements MigrationInterface {
  name = 'CreateBiometricLogsTable20250516000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS biometric_logs (
        time        TIMESTAMPTZ NOT NULL,
        user_id     UUID NOT NULL,
        hrv         FLOAT CHECK (hrv IS NULL OR (hrv BETWEEN 0 AND 1)),
        sleep_hours FLOAT CHECK (sleep_hours IS NULL OR (sleep_hours BETWEEN 0 AND 14)),
        stress_index FLOAT CHECK (stress_index IS NULL OR (stress_index BETWEEN 0 AND 1)),
        resting_hr  INT CHECK (resting_hr IS NULL OR (resting_hr BETWEEN 30 AND 220)),
        steps       INT CHECK (steps IS NULL OR (steps >= 0)),
        source      VARCHAR(50) NOT NULL DEFAULT 'manual',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (time, user_id)
      );
    `);

    try {
      await queryRunner.query(`
        SELECT create_hypertable(
          'biometric_logs',
          'time',
          chunk_time_interval => INTERVAL '1 month',
          if_not_exists => TRUE
        );
      `);
      console.log('Biometric logs hypertable created successfully');
    } catch (error) {
      console.log('Hypertable may already exist or TimescaleDB not available:', error.message);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_biometric_user_time 
      ON biometric_logs (user_id, time DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_biometric_source 
      ON biometric_logs (source);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_biometric_daily 
      ON biometric_logs (user_id, DATE(time));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_biometric_daily;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_biometric_source;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_biometric_user_time;`);
    await queryRunner.query(`DROP TABLE IF EXISTS biometric_logs;`);
  }
}
