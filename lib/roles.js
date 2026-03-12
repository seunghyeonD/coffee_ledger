export const ROLES = {
  MASTER: "master",
  ADMIN: "admin",
  ASSISTANT: "assistant",
  USER: "user",
};

export const ROLE_LABELS = {
  master: "마스터",
  admin: "관리자",
  assistant: "조수",
  user: "유저",
};

// 높은 숫자 = 높은 권한
const ROLE_LEVEL = {
  master: 4,
  admin: 3,
  assistant: 2,
  user: 1,
};

export function hasMinRole(userRole, minRole) {
  return (ROLE_LEVEL[userRole] || 0) >= (ROLE_LEVEL[minRole] || 0);
}

// 각 액션에 필요한 최소 역할
const ACTION_ROLES = {
  // 멤버 관리
  addMember: ROLES.ADMIN,
  updateMember: ROLES.ADMIN,
  deleteMember: ROLES.ADMIN,

  // 매장/메뉴 관리
  addShop: ROLES.ADMIN,
  updateShop: ROLES.ADMIN,
  deleteShop: ROLES.ADMIN,
  addMenu: ROLES.ADMIN,
  updateMenu: ROLES.ADMIN,
  deleteMenu: ROLES.ADMIN,

  // 주문
  addOrder: ROLES.ASSISTANT,
  deleteOrder: ROLES.ASSISTANT,

  // 충전
  addDeposit: ROLES.ASSISTANT,
  deleteDeposit: ROLES.ASSISTANT,

  // 유저 관리
  removeUser: ROLES.MASTER,
  manageRoles: ROLES.MASTER,

  // 수동 알림
  sendNotification: ROLES.ADMIN,
  sendMemberNotification: ROLES.ADMIN,
};

export function canDo(userRole, action) {
  const minRole = ACTION_ROLES[action];
  if (!minRole) return false;
  return hasMinRole(userRole, minRole);
}
