# Got Ya! Automated Testing Guide for Claude Code

## Overview
This document provides instructions for running automated browser tests for the Got Ya! multiplayer trivia game. These tests verify cross-device join functionality, QR code display, and full game flow.

## Prerequisites

1. **Node.js 18+** installed
2. **Playwright browsers** installed:
   ```bash
   npx playwright install chromium
   ```

## Quick Start

### Run All 20 Game Tests
```bash
# Start the dev server
npm run dev &

# Wait for server to start, then run tests
sleep 5 && npx tsx tests/game-tests.ts
```

### Run Supabase Connection Test
```bash
npx tsx tests/supabase-test.ts
```

### Run Cross-Device Debug Test
```bash
npm run dev &
sleep 5 && npx tsx tests/cross-device-debug.ts
```

## Test Suites

### Suite 1: Game Creation with Early QR (Tests 1-5)
Verifies the new QR code feature that displays before entering a nickname:
- Test 1: QR code displays before nickname entry
- Test 2: Room code is pre-generated (6 chars)
- Test 3: Complete game creation flow
- Test 4: Room code persists from create to lobby
- Test 5: Back button on create screen works

### Suite 2: Same Browser Tab Sync (Tests 6-10)
Tests localStorage + BroadcastChannel sync for same-browser multiplayer:
- Test 6: Join from same browser context
- Test 7: Multiple players join same browser
- Test 8: Join via URL (QR code simulation)
- Test 9: Player count updates when someone joins
- Test 10: Invalid room code shows error

### Suite 3: Cross-Device Join (Tests 11-15)
Tests Supabase-based sync for different devices:
- Test 11: QR code visible in isolated context
- Test 12: Cross-device join (separate browsers)
- Test 13: Join button shows loading state
- Test 14: Room code input auto-uppercases
- Test 15: URL join parameter pre-fills code

### Suite 4: Full Game Flow (Tests 16-20)
End-to-end game testing:
- Test 16: Minimum players required to start
- Test 17: Start game with 2 players
- Test 18: Submit answers phase
- Test 19: Full round - both players submit
- Test 20: Leave game returns to home

## Manual Cross-Device Testing

To test real cross-device functionality with the deployed app:

### On Vercel (https://got-yad.vercel.app/)

1. **Device 1 (Host)**:
   - Open https://got-yad.vercel.app/ on your computer
   - Click "CREATE GAME"
   - Note the QR code and room code displayed
   - Enter your nickname and click "START"

2. **Device 2 (Player)**:
   - Scan the QR code with your phone, OR
   - Open https://got-yad.vercel.app/ and click "JOIN GAME"
   - Enter the room code and your nickname
   - Click "JOIN"

3. **Expected Result**:
   - Both devices should see each other in the lobby
   - Host can start the game
   - Both players can submit answers and vote

## Environment Variables

Ensure `.env` has Supabase credentials for cross-device sync:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Troubleshooting

### Tests timeout or crash
- Ensure dev server is running: `npm run dev`
- Try with a fresh browser: Tests launch fresh browsers per test
- Check available memory/resources

### Cross-device join shows "Room not found"
- Verify Supabase credentials in `.env`
- Run `npx tsx tests/supabase-test.ts` to verify connection
- Check browser console for `[Sync]` logs

### QR code not showing
- Verify `qrcode.react` is installed: `npm install qrcode.react`
- Check browser console for errors

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run game tests
  run: |
    npm ci
    npx playwright install chromium
    npm run build
    npm run preview &
    sleep 5
    npx tsx tests/game-tests.ts
```

## Test Files

| File | Purpose |
|------|---------|
| `tests/game-tests.ts` | Main 20-test suite |
| `tests/cross-device-debug.ts` | Debug cross-device join with logging |
| `tests/supabase-test.ts` | Test Supabase connection directly |

## Expected Output (All Tests Pass)

```
=== TEST RESULTS SUMMARY ===

Total:  20
Passed: 20
Failed: 0

✓ Test 1: QR code displays before nickname entry
✓ Test 2: Room code is pre-generated (6 chars)
✓ Test 3: Complete game creation flow
✓ Test 4: Room code persists from create to lobby
✓ Test 5: Back button on create screen works
✓ Test 6: Join from same browser context
✓ Test 7: Multiple players join same browser
✓ Test 8: Join via URL (QR code simulation)
✓ Test 9: Player count updates when someone joins
✓ Test 10: Invalid room code shows error
✓ Test 11: QR code visible in isolated context
✓ Test 12: Cross-device join (separate browsers)
✓ Test 13: Join button shows loading state
✓ Test 14: Room code input auto-uppercases
✓ Test 15: URL join parameter pre-fills code
✓ Test 16: Minimum players required to start
✓ Test 17: Start game with 2 players
✓ Test 18: Submit answers phase
✓ Test 19: Full round - both players submit
✓ Test 20: Leave game returns to home
```
