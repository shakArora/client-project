import test from 'node:test';
import assert from 'node:assert/strict';

// Set the testing variable BEFORE importing module logic to disable throttle stalls
process.env.NODE_ENV = 'test';

import { geocode, distMatrix, clusterAddressesWithCapacity, logic } from './logic.js';

test('Routed Logistics Engine Unit Test Suite', async (t) => {
  const originalFetch = globalThis.fetch;

  // Intercept and cleanly simulate production endpoints
  t.beforeEach(() => {
    globalThis.fetch = async (url) => {
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ lat: '40.7128', lon: '-74.0060' }]
        };
      }
      if (url.includes('router.project-osrm.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            code: 'Ok',
            durations: [
              [0, 15, 30],
              [15, 0, 15],
              [30, 15, 0]
            ],
            distances: [
              [0, 1000, 2000],
              [1000, 0, 1000],
              [2000, 1000, 0]
            ]
          })
        };
      }
      return { ok: false, status: 404 };
    };
  });

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ==========================================
  // 1. GEOCODE TEST
  // ==========================================
  await t.test('geocode() - should resolve valid geographic objects instantly', async () => {
    const coords = await geocode('New York City');
    assert.deepEqual(coords, { lat: '40.7128', lon: '-74.0060' });
  });

  await t.test('geocode() - should throw explicit exception when endpoint data is empty', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => []
    });

    await assert.rejects(
      async () => await geocode('Unknown Ghost Location'),
      /Could not geocode address/
    );
  });

  // ==========================================
  // 2. DISTMATRIX TEST
  // ==========================================
  await t.test('distMatrix() - should process elements into symmetric array matrices', async () => {
    const targetAddresses = ['Location A', 'Location B', 'Location C'];
    const matrix = await distMatrix(targetAddresses, 'duration');
    assert.equal(matrix.length, 3);
    assert.equal(matrix[0][1], 15);
    assert.equal(matrix[2][0], 30);
  });

  // ==========================================
  // 3. CLUSTERADDRESSESWITHCAPACITY TEST
  // ==========================================
  await t.test('clusterAddressesWithCapacity() - should split split-threshold weights cleanly', async () => {
    const addresses = ['House 1', 'House 2'];
    const weights = [50, 10]; 
    const carCapacities = [2, 0, 1]; // splitThreshold will be 15
    const mockMatrix = [
      [0, 5],
      [5, 0]
    ];

    const report = await clusterAddressesWithCapacity(addresses, weights, mockMatrix, carCapacities);
    
    // Total original entities remains unchanged in output track lengths
    assert.equal(report.assignments.length, 2);
    assert.equal(report.summary.totalAddresses, 2);
    
    // Large items are split to parts
    const splitFound = report.clusters.some(c => c.addresses.some(a => a.includes('(Part')));
    assert.ok(splitFound, 'Should find split virtual part entities inside active clusters');
  });

  // ==========================================
  // 4. RECURSIVE ROUTING ENGINE SYSTEM WAVES
  // ==========================================
  await t.test('logic() - should recursively process leftover structural inventory items across waves', async () => {
    const items = ['Customer A', 'Customer B', 'Customer C'];
    const massWeights = [25, 25, 25];
    const fleetCars = [30]; // Each wave can only take one single asset comfortably

    const routeWaves = await logic(items, massWeights, fleetCars);

    // Verifies that a high weight layout forces sequence wave recursion
    assert.ok(routeWaves.length > 1, 'Pipeline should stack extra recursive routing matrices smoothly');
    assert.equal(routeWaves[0].summary.totalAddresses, 3);
  });
});