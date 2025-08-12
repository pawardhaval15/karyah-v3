const MaterialRequest = require('../models/materialRequest');
const MaterialRequestItem = require('../models/materialRequestItem');
const Task = require('../models/task');
const Project = require('../models/project');
const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');

// Submit a new material request with multiple items
exports.createMaterialRequest = async (req, res) => {
  try {
    const { taskId, title, description, urgency, expectedDeliveryDate, items } = req.body;
    const requestedBy = req.user.userId;

    const task = await Task.findByPk(taskId, {
      include: { model: Project, as: 'project' }
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Create main material request
    const requestId = uuidv4();
    const newRequest = await MaterialRequest.create({
      id: requestId,
      taskId,
      projectId: task.projectId,
      requestedBy,
      title: title || 'Material Request',
      description,
      urgency: urgency || 'medium',
      expectedDeliveryDate,
      status: 'pending'
    });

    // Create individual items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const requestItems = items.map(item => ({
        id: uuidv4(),
        materialRequestId: requestId,
        itemName: item.itemName,
        quantityRequested: item.quantityRequested,
        unit: item.unit,
        specifications: item.specifications || item.requirements,
        brand: item.brand,
        model: item.model,
        qualityGrade: item.qualityGrade,
        estimatedUnitCost: item.estimatedUnitCost,
        supplier: item.supplier,
        deliveryDate: item.deliveryDate,
        notes: item.notes,
        status: 'pending'
      }));

      await MaterialRequestItem.bulkCreate(requestItems);
    } else {
      // Handle single item (backward compatibility)
      const { itemName, quantityRequested, unit, requirements } = req.body;
      if (itemName && quantityRequested) {
        await MaterialRequestItem.create({
          id: uuidv4(),
          materialRequestId: requestId,
          itemName,
          quantityRequested: parseFloat(quantityRequested),
          unit: unit || 'pcs',
          specifications: requirements,
          status: 'pending'
        });
      }
    }

    // Fetch the complete request with items
    const completeRequest = await MaterialRequest.findByPk(requestId, {
      include: [
        { model: MaterialRequestItem, as: 'items' },
        { model: Task, attributes: ['name'] },
        { model: User, as: 'requester', attributes: ['name'] }
      ]
    });

    res.status(201).json({ 
      message: 'Material request created successfully', 
      request: completeRequest 
    });
  } catch (error) {
    console.error('Create material request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all requests for a project with items
exports.getRequestsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const requests = await MaterialRequest.findAll({
      where: { projectId },
      include: [
        { 
          model: MaterialRequestItem, 
          as: 'items',
          required: false // LEFT JOIN to include requests even without items
        },
        { model: Task, attributes: ['name'] },
        { model: User, as: 'requester', attributes: ['name'] },
        { model: User, as: 'approver', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Fetch project requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve/Reject individual items or entire request
exports.updateMaterialRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, approvedItems, rejectionReason, notes } = req.body;
    const approvedBy = req.user.userId;

    const request = await MaterialRequest.findByPk(requestId, {
      include: [{ model: MaterialRequestItem, as: 'items' }]
    });
    
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Update main request status
    request.status = status;
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.notes = notes;

    // Update individual items if provided
    if (approvedItems && Array.isArray(approvedItems)) {
      for (const itemUpdate of approvedItems) {
        await MaterialRequestItem.update({
          status: itemUpdate.status,
          quantityApproved: itemUpdate.quantityApproved,
          estimatedUnitCost: itemUpdate.estimatedUnitCost,
          supplier: itemUpdate.supplier,
          deliveryDate: itemUpdate.deliveryDate,
          notes: itemUpdate.notes
        }, {
          where: { id: itemUpdate.itemId }
        });
      }
    }

    await request.save();

    // Calculate total costs
    const updatedRequest = await MaterialRequest.findByPk(requestId, {
      include: [{ model: MaterialRequestItem, as: 'items' }]
    });

    const totalEstimatedCost = updatedRequest.items.reduce((sum, item) => {
      return sum + ((item.quantityApproved || item.quantityRequested) * (item.estimatedUnitCost || 0));
    }, 0);

    updatedRequest.totalEstimatedCost = totalEstimatedCost;
    await updatedRequest.save();

    res.status(200).json({ 
      message: 'Request updated successfully', 
      request: updatedRequest 
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add item to existing request
exports.addItemToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const itemData = req.body;

    const request = await MaterialRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const newItem = await MaterialRequestItem.create({
      id: uuidv4(),
      materialRequestId: requestId,
      ...itemData,
      status: 'pending'
    });

    res.status(201).json({ 
      message: 'Item added successfully', 
      item: newItem 
    });
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update individual item
exports.updateRequestItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updateData = req.body;

    const item = await MaterialRequestItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await item.update(updateData);

    res.status(200).json({ 
      message: 'Item updated successfully', 
      item 
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete item from request
exports.deleteRequestItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await MaterialRequestItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await item.destroy();

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
