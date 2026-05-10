-- UDB Schema Backup
-- Generated: 2026-05-08T20:47:18.591Z
-- Database: udb

CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    firebaseUid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    displayName TEXT,
    role TEXT NOT NULL DEFAULT 'CHILD',
    avatarUrl TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AcademicRecord" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    subject TEXT NOT NULL,
    score DECIMAL NOT NULL,
    recordedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BehaviorLog" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    eventType TEXT NOT NULL,
    details JSONB,
    createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);
