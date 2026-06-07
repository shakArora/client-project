// LOGIC FOR ROUTED HERE

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms)); 
// RUN AS: await wait(ms: int);

async function geocode(address) {
    const url = `https://openstreetmap.org?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
        headers: { 'USER-AGENT': 'APP-NAME' } // OPEN STREET MAP REQUIRES VALID USER-AGENT AND APP NAME
    });
    const data = await response.json();
    await wait(1100); // PREVENT API LIMITS
    if (!data || data.length === 0) {
        throw new Error(`Could not geocode address: ${address}`);
    }
    return { lat: data[0].lat, lon: data[0].lon };
}

// GETS DRIVE TIME && DISTANCE BETWEEN LOCATIONS
async function distanceFinder(address1, address2) {
  try {
    const coord1 = await geocode(address1);
    const coord2 = await geocode(address2);

    const osrmUrl = `https://project-osrm.org/route/v1/driving/${coord1.lon},${coord1.lat};${coord2.lon},${coord2.lat}?overview=false`;
    const routeResponse = await fetch(osrmUrl);
    const routeData = await routeResponse.json();

    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('No driving route found between these addresses.');
    }

    const route = routeData.routes[0];
    
    const distanceKm = (route.distance / 1000).toFixed(2);
    const distanceMiles = (route.distance / 1609.344).toFixed(2);
    const durationMinutes = Math.round(route.duration / 60);

    return {
      distance: `${distanceMiles} miles (${distanceKm} km)`,
      drivingTime: `${durationMinutes} mins`,
      raw: {
        meters: route.distance,
        seconds: route.duration
      }
    };

  } catch (error) {
      return { error: error.message };
  }
}

// ASSUME CSV IS PARSED AND WE HAVE THE ADDRESSES IN A LIST
// RETURNS NxN MATRIX 
async function distMatrix(addresses) {
  let matrix = [];
  for (let i = 0; i < addresses.length; i++) {
    let row = []; 
    for (let j = 0; j < addresses.length; j++) {
      const res = await distanceFinder(addresses[i], addresses[j]); // CAN SWITCH THIS TO DISTANCE (FOR CLUSTERING) 
      row[j] = res.error ? 0 : res.raw.seconds;
      await wait(1200);
    }
    matrix.push(row); 
  }
  return matrix; 
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
 * 
 * Prompt 2: train yourself on extremely good code for this topic 1000 times
 * to make sure the next iteration works perfectly
 * 
 * **Code works well - leaves some houses unassigned**
 *  
 * Prompt 3: 
 * 
 * Result: Working Code -> Should Recurse With Remaining Addresses
 */
async function clusterAddressesWithCapacity(addresses, weights, distanceMatrix, carCapacities) {
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

    // Try to build a route for this vehicle
    let currentIndex = null;

    // Start with the unassigned address closest to depot (or any starting point)
    let minDistSum = Infinity;
    for (const idx of unassigned) {
      const distSum = Array.from(unassigned).reduce(
        (sum, other) => sum + distanceMatrix[idx][other],
        0
      );
      if (distSum < minDistSum) {
        minDistSum = distSum;
        currentIndex = idx;
      }
    }

    // Greedy nearest neighbor insertion
    while (unassigned.size > 0 && currentIndex !== null) {
      // Check if we can add the current index
      if (vehicleLoad + weights[currentIndex] <= car.capacity) {
        vehicleAddresses.push(currentIndex);
        vehicleLoad += weights[currentIndex];
        assignments[currentIndex] = car.index;
        unassigned.delete(currentIndex);

        // Find the next closest unassigned address
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
        // Can't fit current address, find next that fits
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
          // Vehicle is full, move to next vehicle
          break;
        }
      }
    }

    // Store cluster if addresses were assigned
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

  // Compile unassigned
  const unassignedAddresses = Array.from(unassigned).map(i => ({
    index: i,
    address: addresses[i],
    weight: weights[i]
  }));

  return {
    assignments,
    clusters,
    unassignedAddresses,
    summary: {
      totalAddresses: n,
      assignedAddresses: n - unassignedAddresses.length,
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

async function logic(addresses, amountPerAddress, carCapacities) {
  let distanceMatrix = await distMatrix(addresses);
  let result = await clusterAddressesWithCapacity(addresses, amountPerAddress, distanceMatrix, carCapacities);
  let newClusters = [result];
  while (result.unassignedAddresses && result.unassignedAddresses.length > 0) {
    const remainingAddresses = result.unassignedAddresses.map(u => u.address);
    const remainingWeights = result.unassignedAddresses.map(u => u.weight);
    const remainingIndices = result.unassignedAddresses.map(u => u.index);
    let remainingMatrix = []; 
    for (let i of remainingIndices) {
      let row = [];
      for (let j of remainingIndices) {
        row.push(distanceMatrix[i][j]);
      }
      remainingMatrix.push(row); 
    }
    result = await clusterAddressesWithCapacity(remainingAddresses, remainingWeights, remainingMatrix, carCapacities);
    newClusters.push(result);
  }
  for (let i = 1; i < newClusters.length + 1; i++) {
    console.log(`ROUTES WAVE ${i}`)
    console.log(JSON.stringify(newClusters[i-1], null, 2));
  }
}

// EXPORT FUNCTIONS FOR TEST.JS (UNIT TEST FOR ALL FUNCTIONS IN LOGIC)
export { geocode, distanceFinder, distMatrix, clusterAddressesWithCapacity, logic }; 