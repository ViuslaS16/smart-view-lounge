import 'dotenv/config';
import path from 'path';

// Note: 'dotenv/config' loads .env from the current working directory.
// Since we run from 'backend/', it will find 'backend/.env'.

import { 
  tuyaHealthCheck, 
  createSessionPin, 
  revokeSessionPin, 
  irAcOn, 
  irAcOff, 
  irProjectorToggle,
  listScenes
} from '../src/services/tuya.service';

/**
 * Tuya Control Integration Test
 * ──────────────────────────────────────────────────────────────────────────
 * This script verifies that the new Device IDs in your .env are working 
 * correctly by triggering live actions.
 */
async function runTests() {
  console.log('🚀 Starting Tuya Integration Tests...');
  console.log('──────────────────────────────────────────────────');

  try {
    // 1. Health Check & Discovery
    console.log('\n[TEST 1] Running Health Check...');
    await tuyaHealthCheck();
    
    // Diagnostic: List all remotes on the IR blaster
    const scenes = await listScenes();
    console.log('\n[DIAGNOSTIC] All remotes found on IR Blaster:');
    scenes.forEach(s => console.log(` - ${s.name}: ${s.id}`));
    console.log('✅ Health Check complete.');

    // 2. Door Lock Test
    console.log('\n[TEST 2] Testing Door Lock (PIN Registration)...');
    const startTime = new Date(Date.now() + 5 * 60 * 1000); // starts in 5 mins
    const endTime = new Date(Date.now() + 65 * 60 * 1000);  // ends in 65 mins
    const { pin, ticketId } = await createSessionPin('TEST-001', startTime, endTime);
    console.log(`✅ PIN Created: ${pin} (Ticket ID: ${ticketId})`);
    
    console.log('[TEST 2.1] Revoking Test PIN...');
    await revokeSessionPin(ticketId);
    console.log('✅ PIN Revoked.');

    // 3. AC Control Test
    console.log('\n[TEST 3] Testing AC (Power ON)...');
    await irAcOn();
    console.log('✅ AC Power ON command sent.');
    
    console.log('Wait 5s...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('[TEST 3.1] Testing AC (Power OFF)...');
    await irAcOff();
    console.log('✅ AC Power OFF command sent.');

    // 4. Projector Control Test
    if (process.env.TUYA_PROJECTOR_REMOTE_ID) {
      console.log('\n[TEST 4] Testing Projector (Power ON)...');
      await irProjectorToggle(false); // ON
      console.log('✅ Projector ON command sent.');

      console.log('Wait 10s (Projectors warm up slow)...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log('[TEST 4.1] Testing Projector (Power OFF)...');
      await irProjectorToggle(true); // OFF (sends power code twice)
      console.log('✅ Projector OFF command sent.');
    } else {
      console.log('\n[SKIPPED] Projector test skipped (TUYA_PROJECTOR_REMOTE_ID not set).');
    }

    console.log('\n──────────────────────────────────────────────────');
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('Please verify the physical devices responded correctly.');

  } catch (err: any) {
    console.error('\n❌ TEST FAILED:');
    console.error(err.message);
    process.exit(1);
  }
}

runTests();
