export const WORKFLOW_DATA = {
  PROCUREMENT: {
    id: "PROCUREMENT",
    name: "Procurement",
    stages: [
      {
        id: "REQUIREMENT_LIST", name: "Requirement List Pending", order: 1,
      },
      {
        id: "QUOTATION_PENDING", name: "Quotation Pending", order: 2,
      },
      {
        id: "ORDER_PENDING", name: "Order Pending", order: 3,
      },
      {
        id: "PAYMENT_PENDING", name: "Payment Pending", order: 4,
      },
      {
        id: "DISPATCH_PENDING", name: "Dispatch Pending", order: 5,
      },
      {
        id: "DELIVERY_PENDING", name: "Delivery Pending", order: 6,
      },
      {
        id: "DELIVERED", name: "Delivered", order: 7,
      },
    ],
  },

  INTERIOR_DESIGN: {
    id: "INTERIOR_DESIGN",
    name: "Interior Design",
    stages: [
      {
        id: "DRAFT_PLANS", name: "Draft Plans Pending", order: 1,
      },
      {
        id: "THEME_PLANS", name: "Theme Plans Pending", order: 2,
      },
      {
        id: "CIVIL_MAISON_PLANS", name: "Civil (Maison) Plans Pending", order: 3,
      },
      {
        id: "PLUMBING_PLANS", name: "Plumbing Plans Pending", order: 4,
      },
      {
        id: "ELECTRICAL_PLANS", name: "Electrical Plans Pending", order: 5,
      },
      {
        id: "FURNITURE_PLANS", name: "Furniture Plans Pending", order: 6,
      },
      {
        id: "FURNISHING_PLANS", name: "Furnishing Plans Pending", order: 7,
      },
      {
        id: "FACADE_PLANS", name: "Facade Plans Pending", order: 8,
      },
      {
        id: "OTHER_PLANS", name: "Other Plans Pending", order: 9,
      },
    ],
  },
};


// Helper to get all Workflow types as an array (for Dropdowns)
export const getWorkflowTypes = () => Object.values(WORKFLOW_DATA);

// Helper to get stages based on a workflow ID (e.g., 'PROCUREMENT')
export const getStagesByWorkflow = (workflowId) => {
  return WORKFLOW_DATA[workflowId]?.stages || [];
};