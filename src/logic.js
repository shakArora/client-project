// LOGIC FOR ROUTED HERE — keep in sync with backend/src/utils/routingLogic.js

const wait = (ms) => {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
};
// RUN AS: await wait(ms: int);

async function geocode(address, skipWait = false) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=jsonv2&limit=1`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Routed/1.0 (arorashivum@gmail.com)' }
    });
    const data = await response.json();
    if (!skipWait) await wait(1100); 
    if (!data || data.length === 0) throw new Error(`Could not geocode address: ${address}`);
    return { lat: data[0].lat, lon: data[0].lon };
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLon = toRad(Number(b.lon) - Number(a.lon));
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function haversineMatrix(coordList) {
  const n = coordList.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const km = haversineKm(coordList[i], coordList[j]);
      matrix[i][j] = km;
      matrix[j][i] = km;
    }
  }
  return matrix;
}

async function fetchOsrmMatrix(coordList, mode = 'duration') {
  if (mode !== 'duration' && mode !== 'distance') throw new Error('Invalid mode.');
  const coordString = coordList.map((c) => `${Number(c.lon)},${Number(c.lat)}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coordString}?annotations=${mode}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Routed/1.0 (arorashivum@gmail.com)' },
  });
  if (!response.ok) throw new Error(`OSRM API request failed with status ${response.status}`);
  const data = await response.json();
  if (data.code !== 'Ok') throw new Error(`OSRM Error: ${data.code}`);
  const key = mode === 'duration' ? 'durations' : 'distances';
  return data[key];
}

/** Build NxN matrix from lat/lon (OSRM driving times, haversine fallback). */
async function distMatrixFromCoords(coordList, mode = 'duration') {
  if (!coordList?.length) return [];
  try {
    return await fetchOsrmMatrix(coordList, mode);
  } catch {
    return haversineMatrix(coordList);
  }
}

// ASSUME CSV IS PARSED AND WE HAVE THE ADDRESSES IN A LIST
// RETURNS NxN MATRIX
async function distMatrix(addresses, mode = 'duration') {
  const coords = [];
  for (const addr of addresses) {
    coords.push(await geocode(addr, process.env.NODE_ENV === 'test'));
  }
  return distMatrixFromCoords(coords, mode);
}

/**
 * Claude Haiku 4.5 (duck.ai Free-Tier)
 * Prompt: how can i cluster addresses given a list of weights that fit in the cars 
 * (each address is given a weight to be delivered) 
 * assume i have the distances between all the addresses in a matrix
 * i need to do this javascript in one function
 * clusters can be split or combined but must comply with the weights that 
 * can be delivered (one car = as many clusters that it can carry the weight of) the car 
 * capacities are in an array
 * * Prompt 2: train yourself on extremely good code for this topic 1000 times
 * to make sure the next iteration works perfectly
 * * **Code works well - leaves some houses unassigned**
 * * Prompt 3: 
 * * Result: Working Code -> Should Recurse With Remaining Addresses
 */
async function clusterAddressesWithCapacity(addresses, weights, distanceMatrix, carCapacities, options = {}) {
  const { disableSplit = false } = options;
  // Input validation
  if (!addresses || !weights || !distanceMatrix || !carCapacities) {
    throw new Error('Missing required parameters');
  }
  if (addresses.length !== weights.length) {
    weights = []; 
    for (const i of addresses) {
        weights.push(i.weight);
    }
    let addrTemp = []
    for (const i of addresses) {
      addrTemp.push(i.address); 
    }
    addresses = addrTemp; 
  }
  if (addresses.length === 0) {
    return {
      assignments: [],
      clusters: [],
      unassignedAddresses: [],
      summary: {
        totalAddresses: 0,
        assignedAddresses: 0,
        vehiclesUsed: 0,
        vehicleLoads: []
      }
    };
  }

  let finalAddresses = [];
  let finalWeights = [];
  let finalMatrix = [];
  let originIndices = [];

  if (disableSplit) {
    finalAddresses = [...addresses];
    finalWeights = [...weights];
    finalMatrix = distanceMatrix.map((row) => [...row]);
    originIndices = addresses.map((_, i) => i);
  } else {
    // --- START OF ADDRESS SPLITTING LOGIC ---
    const maxCarCapacity = Math.max(...carCapacities);
    const splitThreshold = maxCarCapacity / 2;

    for (let i = 0; i < addresses.length; i++) {
      let currentWeight = weights[i];
      const addressName = addresses[i];

      if (currentWeight > splitThreshold) {
        let partIndex = 1;
        while (currentWeight > 0) {
          const chunkWeight = Math.min(currentWeight, splitThreshold);
          finalAddresses.push(`${addressName} (Part ${partIndex})`);
          finalWeights.push(chunkWeight);
          originIndices.push(i);
          currentWeight -= chunkWeight;
          partIndex++;
        }
      } else {
        finalAddresses.push(addressName);
        finalWeights.push(currentWeight);
        originIndices.push(i);
      }
    }

    for (let i = 0; i < originIndices.length; i++) {
      const row = [];
      const originalRowIndex = originIndices[i];
      for (let j = 0; j < originIndices.length; j++) {
        const originalColIndex = originIndices[j];
        row.push(distanceMatrix[originalRowIndex][originalColIndex]);
      }
      finalMatrix.push(row);
    }
    // --- END OF ADDRESS SPLITTING LOGIC ---
  }

  const originalAddressesCount = addresses.length;
  const originalWeights = [...weights];
  const originalAddresses = [...addresses];

  addresses = finalAddresses;
  weights = finalWeights;
  distanceMatrix = finalMatrix;

  const n = addresses.length;
  const assignments = new Array(n).fill(-1);
  const clusters = [];
  const unassigned = new Set(Array.from({ length: n }, (_, i) => i));

  // Sort cars by capacity (descending)
  const sortedCars = carCapacities
    .map((cap, idx) => ({ capacity: cap, index: idx }))
    .sort((a, b) => b.capacity - a.capacity);

  // Main assignment loop
  for (const car of sortedCars) {
    if (unassigned.size === 0) break;

    const vehicleAddresses = [];
    let vehicleLoad = 0;
    let currentIndex = null;

    // Start with the unassigned address closest to depot (index 0)
    currentIndex = [...unassigned].reduce((best, idx) =>
      distanceMatrix[0][idx] < distanceMatrix[0][best] ? idx : best
    );

    // Greedy nearest neighbor insertion
    while (unassigned.size > 0 && currentIndex !== null) {
      if (vehicleLoad + weights[currentIndex] <= car.capacity) {
        vehicleAddresses.push(currentIndex);
        vehicleLoad += weights[currentIndex];
        assignments[currentIndex] = car.index;
        unassigned.delete(currentIndex);

        let nextIndex = null;
        let minDistance = Infinity;

        for (const idx of unassigned) {
          const distance = distanceMatrix[currentIndex][idx];
          if (distance < minDistance) {
            minDistance = distance;
            nextIndex = idx;
          }
        }
        currentIndex = nextIndex;
      } else {
        let found = false;
        let bestFit = null;
        let bestFitDistance = Infinity;

        for (const idx of unassigned) {
          if (vehicleLoad + weights[idx] <= car.capacity) {
            const distance = distanceMatrix[currentIndex][idx];
            if (distance < bestFitDistance) {
              bestFitDistance = distance;
              bestFit = idx;
              found = true;
            }
          }
        }

        if (found) {
          currentIndex = bestFit;
        } else {
          break;
        }
      }
    }

    if (vehicleAddresses.length > 0) {
      clusters.push({
        vehicleIndex: car.index,
        addressIndices: vehicleAddresses,
        addresses: vehicleAddresses.map(i => addresses[i]),
        totalWeight: vehicleLoad,
        capacity: car.capacity,
        utilizationRate: (vehicleLoad / car.capacity * 100).toFixed(2) + '%'
      });
    }
  }

  // --- RECONSTRUCTION FOR THE UNIT TESTS ---
  // 1. Build original sized assignments array (-1 if zero parts delivered, otherwise vehicle index)
  const mappedAssignments = new Array(originalAddressesCount).fill(-1);
  for (let i = 0; i < assignments.length; i++) {
    const parentIndex = originIndices[i];
    if (assignments[i] !== -1) {
      mappedAssignments[parentIndex] = assignments[i]; 
    }
  }

  // 2. Build unassigned list based on original parent indices with remaining weight
  const parentUnassignedIndices = new Set();
  for (const idx of unassigned) {
    parentUnassignedIndices.add(originIndices[idx]);
  }

  const remainingWeight = [...originalWeights];
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] !== -1) remainingWeight[originIndices[i]] -= weights[i];
  }

  const unassignedAddresses = Array.from(parentUnassignedIndices)
    .filter(parentIdx => remainingWeight[parentIdx] > 0)
    .map(parentIdx => ({
      index: parentIdx,
      address: originalAddresses[parentIdx],
      weight: remainingWeight[parentIdx],
    }));

  return {
    assignments: mappedAssignments, 
    clusters, 
    unassignedAddresses,
    summary: {
      totalAddresses: originalAddressesCount,
      assignedAddresses: originalAddressesCount - unassignedAddresses.length,
      vehiclesUsed: clusters.length,
      totalWeightAssigned: clusters.reduce((sum, c) => sum + c.totalWeight, 0),
      totalCapacity: clusters.reduce((sum, c) => sum + c.capacity, 0),
      vehicleLoads: clusters.map(c => ({
        vehicleIndex: c.vehicleIndex,
        weight: c.totalWeight,
        capacity: c.capacity,
        utilization: c.utilizationRate,
        addressCount: c.addressIndices.length
      }))
    }
  };
}

function deductCapsFromClusters(remainingCaps, clusters) {
  for (const cluster of clusters || []) {
    const idx = cluster.vehicleIndex;
    if (idx >= 0 && idx < remainingCaps.length) {
      remainingCaps[idx] = Math.max(0, remainingCaps[idx] - cluster.totalWeight);
    }
  }
}

async function logic(addresses, amountPerAddress, carCapacities, options = {}) {
  const { coords, disableSplit = false } = options;
  const distanceMatrix = coords?.length
    ? await distMatrixFromCoords(coords)
    : await distMatrix(addresses);
  const clusterOpts = { disableSplit };
  const remainingCaps = [...carCapacities];

  let result = await clusterAddressesWithCapacity(
    addresses,
    amountPerAddress,
    distanceMatrix,
    remainingCaps,
    clusterOpts,
  );
  const newClusters = [result];
  deductCapsFromClusters(remainingCaps, result.clusters);

  while (result.unassignedAddresses?.length > 0 && remainingCaps.some((c) => c > 0)) {
    const remaining = result.unassignedAddresses;
    const remainingAddresses = remaining.map((u) => u.address);
    const remainingWeights = remaining.map((u) => u.weight);
    const remainingIndices = remaining.map((u) => u.index);
    const remainingMatrix = remainingIndices.map((i) =>
      remainingIndices.map((j) => distanceMatrix[i][j]),
    );
    const prevCount = remaining.length;
    result = await clusterAddressesWithCapacity(
      remainingAddresses,
      remainingWeights,
      remainingMatrix,
      remainingCaps,
      clusterOpts,
    );
    deductCapsFromClusters(remainingCaps, result.clusters);
    newClusters.push(result);
    if (!result.clusters?.length || result.unassignedAddresses?.length >= prevCount) break;
  }
  return newClusters;
}
// EXPORT FUNCTIONS FOR TEST.JS (UNIT TEST FOR ALL FUNCTIONS IN LOGIC)
export { geocode, distMatrix, distMatrixFromCoords, haversineMatrix, clusterAddressesWithCapacity, logic };