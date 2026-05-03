// src/helpers/nrn-integration/nrn-state-space.ts

/**
 * State Space definition for NRN Agents.
 * This defines what features the agent observes in the game world.
 */
export const stateSpace = [
  {
    type: "relativePosition",
    keys: {
      entity1: "agent",
      entity2: "objective",
      maxDistance: "500"
    }
  },
  {
    type: "normalize",
    keys: {
      value: "energy"
    },
    setup: {
      mean: 50,
      stdev: 20
    }
  }
];
