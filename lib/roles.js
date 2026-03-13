import i18n from '@/lib/i18n';

export const ROLES = {
  MASTER: "master",
  ADMIN: "admin",
  ASSISTANT: "assistant",
  USER: "user",
};

export const getRoleLabel = (role) => i18n.t(`roles:${role}`);

// For backward compatibility
export const ROLE_LABELS = new Proxy({}, {
  get: (_, role) => getRoleLabel(role),
});

const ROLE_LEVEL = {
  master: 4,
  admin: 3,
  assistant: 2,
  user: 1,
};

export function hasMinRole(userRole, minRole) {
  return (ROLE_LEVEL[userRole] || 0) >= (ROLE_LEVEL[minRole] || 0);
}

const ACTION_ROLES = {
  addMember: ROLES.ADMIN,
  updateMember: ROLES.ADMIN,
  deleteMember: ROLES.ADMIN,
  addShop: ROLES.ADMIN,
  updateShop: ROLES.ADMIN,
  deleteShop: ROLES.ADMIN,
  addMenu: ROLES.ADMIN,
  updateMenu: ROLES.ADMIN,
  deleteMenu: ROLES.ADMIN,
  addOrder: ROLES.ASSISTANT,
  deleteOrder: ROLES.ASSISTANT,
  addDeposit: ROLES.ASSISTANT,
  deleteDeposit: ROLES.ASSISTANT,
  removeUser: ROLES.MASTER,
  manageRoles: ROLES.MASTER,
  sendNotification: ROLES.ADMIN,
  sendMemberNotification: ROLES.ADMIN,
};

export function canDo(userRole, action) {
  const minRole = ACTION_ROLES[action];
  if (!minRole) return false;
  return hasMinRole(userRole, minRole);
}
