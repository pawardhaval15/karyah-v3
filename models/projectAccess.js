const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Project = require('./project');
const User = require('./user');

const ProjectAccess = sequelize.define('ProjectAccess', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => Math.random().toString(36).substr(2, 9).toUpperCase(),
  },
  projectId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  canView: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  canReply: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  canEdit: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
}, {
  tableName: 'ProjectAccesses',
  timestamps: true,
});

// Associations
ProjectAccess.belongsTo(Project, { foreignKey: 'projectId' });
ProjectAccess.belongsTo(User, { foreignKey: 'userId' });

module.exports = ProjectAccess;
