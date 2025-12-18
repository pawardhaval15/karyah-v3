export const WORKFLOW_DATA = {
  PROCUREMENT: {
    id: "PROCUREMENT", // Added ID for easier reference
    name: "Procurement",
    stages: [
      { id: "DESIGN", name: "Design Pending" },
      { id: "MATERIAL_SELECTION", name: "Material Selection" },
      { id: "ORDER", name: "Order Pending" },
      { id: "ACCOUNTS", name: "Accounts Pending" },
      { id: "DISPATCH", name: "Dispatch" },
      { id: "DELIVERY", name: "Delivery" },
      { id: "INSTALLATION", name: "Installation" },
    ],
  },
  INTERIOR_DESIGN: {
    id: "INTERIOR_DESIGN", // Added ID for easier reference
    name: "Interior Design",
    stages: [
      { id: "DRAFTING", name: "Drafting Plan" },
      { id: "APPROVED_PLAN", name: "Approved Plan" },
      { id: "THEME", name: "Themed Plan" },
      { id: "CIVIL", name: "Civil" },
      { id: "ELECTRICAL", name: "Electrical" },
      { id: "PLUMBING", name: "Plumbing" },
      { id: "ACP", name: "ACP" },
      { id: "PAINTING", name: "Painting" },
      { id: "FURNISHING", name: "Furnishing" },
      { id: "POP", name: "POP" },
    ],
  },
};

// Helper to get all Workflow types as an array (for Dropdowns)
export const getWorkflowTypes = () => Object.values(WORKFLOW_DATA);

// Helper to get stages based on a workflow ID (e.g., 'PROCUREMENT')
export const getStagesByWorkflow = (workflowId) => {
  return WORKFLOW_DATA[workflowId]?.stages || [];
};