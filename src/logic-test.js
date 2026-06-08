import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  geocode, 
  distanceFinder, 
  distMatrix, 
  clusterAddressesWithCapacity, 
  logic 
} from './logic.js';

test('Routing and Clustering Logic Suite', async (t) => {
  
  const originalFetch = globalThis.fetch;
  
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ==========================================
  // 1. GEOCODE FUNCTION TEST
  // ==========================================
  await t.test('geocode() - should resolve coordinates from valid API response', async () => {
    globalThis.fetch = async (url) => {
      assert.ok(url.includes('openstreetmap.org'));
      return {
        json: async () => [{ lat: '40.7128', lon: '-74.0060' }]
      };
    };

    const coords = await geocode('New York City');
    assert.deepEqual(coords, { lat: '40.7128', lon: '-74.0060' });
  });

  await t.test('geocode() - should throw error when no results found', async () => {
    globalThis.fetch = async () => ({
      json: async () => []
    });

    await assert.rejects(
      async () => await geocode('Fake Address 123'),
      /Could not geocode address/
    );
  });

  // ==========================================
  // 2. DISTANCE FINDER FUNCTION TEST
  // ==========================================
  await t.test('distanceFinder() - should calculate route properties perfectly', async () => {
    let mockFetchCallCount = 0;
    
    globalThis.fetch = async (url) => {
      mockFetchCallCount++;
      if (url.includes('openstreetmap.org')) {
        return { json: async () => [{ lat: '10', lon: '20' }] };
      }
      if (url.includes('project-osrm.org')) {
        return {
          json: async () => ({
            routes: [{ distance: 16093.44, duration: 1200 }]
          })
        };
      }
    };

    const res = await distanceFinder('Addr1', 'Addr2');
    
    assert.equal(mockFetchCallCount, 3);
    assert.equal(res.distance, '10.00 miles (16.09 km)');
    assert.equal(res.drivingTime, '20 mins');
    assert.equal(res.raw.meters, 16093.44);
  });

  // ==========================================
  // 3. DIST MATRIX FUNCTION TEST
  // ==========================================
  await t.test('distMatrix() - should compile NxN duration matrix', async () => {
    globalThis.fetch = async (url) => {
      if (url.includes('openstreetmap.org')) return { json: async () => [{ lat: '1', lon: '1' }] };
      if (url.includes('project-osrm.org')) return { json: async () => ({ routes: [{ distance: 1000, duration: 60 }] }) };
    };

    const addresses = ['Point A', 'Point B'];
    const matrix = await distMatrix(addresses);

    assert.equal(matrix.length, 2);
    assert.equal(matrix[0].length, 2);
    assert.equal(matrix[0][0], 60);
  });

  // ==========================================
  // 4. CLUSTER ADDRESSES WITH CAPACITY TEST
  // ==========================================
  await t.test('clusterAddressesWithCapacity() - handles virtual weight splits cleanly', async () => {
    const addresses = ['House 1', 'House 2', 'House 3'];
    const amountPerAddress = [20, 38, 10];
    const carCapacities = [8, 16];
    
    const distanceMatrix = [
      [0, 5, 10],
      [5, 0, 15],
      [10, 15, 0]
    ];

    const result = await clusterAddressesWithCapacity(addresses, amountPerAddress, distanceMatrix, carCapacities);

    assert.equal(result.assignments.length, addresses.length);
    assert.equal(result.summary.totalAddresses, 3);
    
    const clusterWithParts = result.clusters.some(c => c.addresses.some(a => a.includes('(Part')));
    assert.ok(clusterWithParts);
  });

  // ==========================================
  // 5. BULLETPROOF FAST LOGIC RECURSION TEST
  // ==========================================
  await t.test('logic() - recursive loop should handle remaining unassigned assets instantly', async () => {
    const originalLog = console.log;
    let consoleOutputs = [];
    console.log = (msg) => consoleOutputs.push(msg);

    // Bypassing network fetch operations
    globalThis.fetch = async (url) => {
      if (url.includes('openstreetmap.org')) return { json: async () => [{ lat: '1', lon: '1' }] };
      if (url.includes('project-osrm.org')) return { json: async () => ({ routes: [{ distance: 5000, duration: 300 }] }) };
    };

    // --- QUICK TIMEOUT BYPASS ---
    // Safely shadow/bypass global setTimeout configuration for this local thread test
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (cb) => cb(); 

    const addresses = ['House A', 'House B'];
    const weights = [30, 10]; 
    const cars = [40]; 

    try {
      // Runs smoothly and finishes instantly with zero millisecond delays
      await logic(addresses, weights, cars);
      
      const totalWaveslogged = consoleOutputs.filter(line => line.includes('ROUTES WAVE')).length;
      assert.ok(totalWaveslogged >= 1, 'Logic loop should complete safely and output waves');
    } finally {
      console.log = originalLog;
      globalThis.setTimeout = originalSetTimeout; // Clean restore
    }
  });
});