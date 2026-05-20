# Electron Desktop Agent - v4.1 Deferred

## Status: DEFERRED (Feature Flag: `desktop-agent`)

The Electron Desktop Agent client requires a desktop development environment to build. The server-side heartbeat endpoint is implemented and functional.

## Server-Side (DELIVERED)
- `POST /agent/heartbeat` - Accepts focus data from desktop client
- `POST /agent/register` - Registers client installation
- Fallback mode uses in-platform activity data when desktop agent disabled

## Client-Side (DEFERRED to v4.1)

### Requirements for v4.1
- Electron 28+ with electron-builder
- System tray with focus tracking (NOT keylogging)
- Accessibility API for app usage monitoring
- CPU < 1%, memory < 100MB
- 60-second heartbeat interval
- Offline buffer (24 hours)
- Auto-update via electron-updater

### Platform Targets
- macOS 12+ (Apple Silicon + Intel)
- Windows 10/11 (x64)
- Linux (AppImage, Ubuntu/Debian)

### Directory Structure (v4.1)
```
apps/desktop-agent/
├── src/
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Context bridge
│   ├── tray.ts          # System tray
│   ├── tracker.ts       # Accessibility API tracker
│   └── heartbeat.ts     # 60s heartbeat to server
├── package.json
└── electron-builder.yml
```

### Heartbeat Payload
```typescript
interface AgentHeartbeat {
  userId: string;           // From auth token
  timestamp: string;        // ISO 8601
  appUsage: {
    appName: string;       // e.g., "Chrome", "VS Code"
    category: string;      // "productive" | "distracting" | "educational"
    durationSec: number;
  }[];
  focusScore: number;      // 0-1 calculated locally
  agentVersion: string;    // e.g., "1.0.0"
  platform: string;        // "darwin" | "win32" | "linux"
}
```

### Privacy Compliance
- NO keylogging
- NO screen recording
- NO keystroke capture
- Only app focus time (foreground window duration)
- All data stays on device except heartbeat

### Fallback Behavior
When `desktop-agent` feature flag is disabled, Safety Score uses:
- In-platform activity only (quests completed, learning time)
- No external app tracking

## Feature Flag Configuration
```typescript
// FeatureFlagService
{
  key: 'desktop-agent',
  description: 'Enable desktop agent focus tracking',
  rollout: 0,  // 0% - disabled by default
  default: false,
}
```