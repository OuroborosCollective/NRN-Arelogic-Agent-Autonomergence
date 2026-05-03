// src/helpers/nrn-integration/nrn-action-space.ts

/**
 * Action Space definition for NRN Agents.
 * This defines the possible outputs/actions the agent can take.
 */
export const actionSpace = {
  movement: {
    order: ["up", "down", "left", "right"],
    policyMapping: "argmaxPolicy",
    actionType: "discrete",
    activationName: "softmax"
  },
  abilities: {
    order: ["dash", "shield"],
    policyMapping: "probabilisticSampling",
    actionType: "discrete",
    activationName: "sigmoid"
  }
};
