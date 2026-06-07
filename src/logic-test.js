/**
 * GEMINI 3.5 FLASH GENERATED THIS TEST FILE AFTER I PASSED IN THE PACKAGE.JSON FILE, AND THE PROMPT: 
 * "my file is called logic.js
 * make me the test file"
 * RUNS IN THE TERMINAL: $ node logic-test.js
 * SHOULD OUTPUT THE FOLLOWING IN THE TERMINAL IF THE TESTS HAVE BEEN PASSED
🚀 Starting Pure JS ESM Test Suite...
✅ PASSED: geocode() should return lat and lon coordinates for valid addresses
✅ PASSED: geocode() should throw an error if no locations are found
✅ PASSED: distanceFinder() should fetch coordinates and extract OSRM route data
✅ PASSED: clusterAddressesWithCapacity() packs clusters based on weight capacity
✅ PASSED: clusterAddressesWithCapacity() flags packages as unassigned if capacity is missing
✅ PASSED: logic() runs multi-wave clustering without matrix lookup indexing failures

🏁 Pure JS ESM Test Suite Execution Completed.
 */

import assert from 'assert/strict';
// Import your functions from logic.js
import { geocode, distanceFinder, clusterAddressesWithCapacity, logic } from './logic.js';

// ==========================================
// MOCKING FRAMEWORK (Pure JS / ESM)
// ==========================================
const originalFetch = global.fetch;
let fetchMocks = [];

function mockFetchResponse(handler) {
  fetchMocks.push(handler);
}

global.fetch = async (url, options) => {
  if (fetchMocks.length > 0) {
    const handler = fetchMocks.shift();
    return handler(url, options);
  }
  return originalFetch(url, options);
};

function clearMocks() {
  fetchMocks = [];
}

async function runTest(name, testFn) {
  try {
    clearMocks();
    await testFn();
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(error);
  }
}

// ==========================================
// THE TESTS
// ==========================================
async function main() {
  console.log('🚀 Starting Pure JS ESM Test Suite...\n');

  // --- Test 1: geocode() Success ---
  await runTest('geocode() should return lat and lon coordinates for valid addresses', async () => {
    mockFetchResponse((url) => {
      assert.match(url, /openstreetmap\.org/);
      return {
        json: async () => [{ lat: '40.7128', lon: '-74.0060' }]
      };
    });

    const result = await geocode('New York, NY');
    assert.deepEqual(result, { lat: '40.7128', lon: '-74.0060' });
  });

  // --- Test 2: geocode() Failure ---
  await runTest('geocode() should throw an error if no locations are found', async () => {
    mockFetchResponse(() => ({
      json: async () => []
    }));

    await assert.rejects(
      async () => { await geocode('Fake Address'); },
      /Could not geocode address: Fake Address/
    );
  });

  // --- Test 3: distanceFinder() Success ---
  await runTest('distanceFinder() should fetch coordinates and extract OSRM route data', async () => {
    mockFetchResponse(() => ({ json: async () => [{ lat: '40.0', lon: '-70.0' }] }));
    mockFetchResponse(() => ({ json: async () => [{ lat: '41.0', lon: '-71.0' }] }));
    mockFetchResponse((url) => {
      assert.match(url, /project-osrm\.org/);
      return {
        json: async () => ({
          routes: [{ distance: 16093.44, duration: 1200 }]
        })
      };
    });

    const result = await distanceFinder('Point A', 'Point B');
    assert.equal(result.drivingTime, '20 mins');
    assert.equal(result.distance, '10.00 miles (16.09 km)');
  });

  // --- Test 4: clusterAddressesWithCapacity() Basic Bin Packing ---
  await runTest('clusterAddressesWithCapacity() packs clusters based on weight capacity', async () => {
    const addresses = ['House A', 'House B', 'House C'];
    const weights = [10, 20, 15];
    const carCapacities = [30, 20];
    const distanceMatrix = [
      [0, 5, 10],
      [5, 0, 15],
      [10, 15, 0]
    ];

    const result = await clusterAddressesWithCapacity(addresses, weights, distanceMatrix, carCapacities);
    
    assert.equal(result.summary.totalAddresses, 3);
    assert.equal(result.summary.assignedAddresses, 3);
    assert.equal(result.unassignedAddresses.length, 0);
  });

  // --- Test 5: clusterAddressesWithCapacity() Leftovers Handling ---
  await runTest('clusterAddressesWithCapacity() flags packages as unassigned if capacity is missing', async () => {
    const addresses = ['House A', 'House B'];
    const weights = [50, 50];
    const carCapacities = [60];
    const distanceMatrix = [[0, 5], [5, 0]];

    const result = await clusterAddressesWithCapacity(addresses, weights, distanceMatrix, carCapacities);
    
    assert.equal(result.summary.assignedAddresses, 1);
    assert.equal(result.unassignedAddresses.length, 1);
  });

  // --- Test 6: logic() Matrix Slicing Sub-Matrix Map Loop ---
  await runTest('logic() runs multi-wave clustering without matrix lookup indexing failures', async () => {
    const addresses = ['Loc 0', 'Loc 1', 'Loc 2'];
    const amountPerAddress = [25, 25, 25];
    const carCapacities = [30]; 
    
    // Stub out global function to avoid network hits
    const originalDistMatrix = global.distMatrix;
    global.distMatrix = async () => [
      [0, 10, 20],
      [10, 0, 30],
      [20, 30, 0]
    ];

    const originalLog = console.log;
    let logOutputs = [];
    console.log = (msg) => logOutputs.push(msg);

    try {
      await logic(addresses, amountPerAddress, carCapacities);
      const waveLogs = logOutputs.filter(log => typeof log === 'string' && log.includes('ROUTES WAVE'));
      assert.equal(waveLogs.length, 3);
    } finally {
      global.distMatrix = originalDistMatrix;
      console.log = originalLog;
    }
  });

  global.fetch = originalFetch;
  console.log('\n🏁 Pure JS ESM Test Suite Execution Completed.');
}

main();