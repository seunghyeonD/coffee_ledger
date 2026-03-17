"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/api-fetch";
import { canDo, getRoleLabel } from "@/lib/roles";
import NotificationSettings from "./NotificationSettings";

export default function SettingsPage({ showToast }) {
  const { t } = useTranslation(["settings", "common", "company"]);
  const {
    signOut,
    clearCompany,
    userRole,
    getCompanyMembers,
    updateMemberRole,
    updateMemberName,
    removeMember,
    deleteAccount,
    user,
    company,
  } = useAuth();
  const [activeTab, setActiveTab] = useState("notifications");
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [notiTitle, setNotiTitle] = useState("");
  const [notiBody, setNotiBody] = useState("");
  const [sendingNoti, setSendingNoti] = useState(false);

  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
    document.documentElement.lang = lng;
  };

  const tabs = [
    { key: "notifications", label: t("tabs.notification") },
    ...(canDo(userRole, "manageRoles")
      ? [{ key: "roles", label: t("tabs.roles") }]
      : []),
    ...(canDo(userRole, "sendNotification")
      ? [{ key: "send-noti", label: t("tabs.broadcast") }]
      : []),
    { key: "language", label: t("language.title") },
    { key: "contact", label: t("tabs.contact") },
    { key: "company-info", label: t("tabs.company"), mobileOnly: true },
    { key: "account", label: t("tabs.account"), mobileOnly: true },
  ];

  useEffect(() => {
    if (activeTab === "roles" && canDo(userRole, "manageRoles")) {
      loadMembers();
    }
  }, [activeTab]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getCompanyMembers();
      setCompanyMembers(data);
    } catch (e) {
      showToast(t("roles.loadFailed"));
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await updateMemberRole(targetUserId, newRole);
      setCompanyMembers((prev) =>
        prev.map((m) =>
          m.userId === targetUserId ? { ...m, role: newRole } : m,
        ),
      );
      showToast(t("roles.roleChanged"));
    } catch (e) {
      showToast(
        t("common:error", {
          message: e.message || t("roles.roleChangeFailed"),
        }),
      );
    }
  };

  const handleNameSave = async (targetUserId) => {
    if (!editingName) return;
    try {
      await updateMemberName(targetUserId, editingName.name);
      setCompanyMembers((prev) =>
        prev.map((m) =>
          m.userId === targetUserId ? { ...m, name: editingName.name } : m,
        ),
      );
      setEditingName(null);
      showToast(t("roles.nameChanged"));
    } catch (e) {
      showToast(
        t("common:error", {
          message: e.message || t("roles.nameChangeFailed"),
        }),
      );
    }
  };

  const handleRemoveMember = async (targetUserId, email) => {
    if (!confirm(t("roles.confirmRemoveUser", { email }))) return;
    try {
      await removeMember(targetUserId);
      setCompanyMembers((prev) =>
        prev.filter((m) => m.userId !== targetUserId),
      );
      showToast(t("roles.userRemoved"));
    } catch (e) {
      showToast(
        t("common:error", {
          message: e.message || t("roles.userRemoveFailed"),
        }),
      );
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notiTitle.trim() || !notiBody.trim()) return;
    setSendingNoti(true);
    try {
      const res = await authFetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "manual",
          companyId: company?.id,
          data: { title: notiTitle.trim(), body: notiBody.trim() },
        }),
      });
      const result = await res.json();
      showToast(t("broadcast.sent", { count: result.sent || 0 }));
      setNotiTitle("");
      setNotiBody("");
    } catch (e) {
      showToast(t("broadcast.sendFailed"));
    } finally {
      setSendingNoti(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t("account.confirmDelete"))) return;
    if (!confirm(t("account.confirmDeleteFinal"))) return;
    try {
      await deleteAccount();
    } catch (e) {
      showToast(t("account.deleteFailed"));
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const roleKeys = ["master", "admin", "assistant", "user"];

  return (
    <div className="settings-page">
      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? "active" : ""} ${tab.mobileOnly ? "mobile-only-tab" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {activeTab === "notifications" && (
          <NotificationSettings showToast={showToast} embedded />
        )}

        {activeTab === "roles" && canDo(userRole, "manageRoles") && (
          <div className="settings-section">
            <p className="settings-desc">{t("roles.description")}</p>
            {loadingMembers ? (
              <div className="empty-state">{t("roles.loading")}</div>
            ) : (
              <div className="role-management-list">
                {companyMembers.map((m) => {
                  const isMe = m.userId === user?.id;
                  const isEditing = editingName?.userId === m.userId;
                  return (
                    <div key={m.userId} className="role-management-item">
                      <div className="role-member-info">
                        {isEditing ? (
                          <div className="role-name-edit">
                            <input
                              type="text"
                              className="role-name-input"
                              value={editingName.name}
                              onChange={(e) =>
                                setEditingName({
                                  ...editingName,
                                  name: e.target.value,
                                })
                              }
                              placeholder={t("roles.namePlaceholder")}
                              autoFocus
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleNameSave(m.userId)
                              }
                            />
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleNameSave(m.userId)}
                            >
                              {t("common:save")}
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => setEditingName(null)}
                            >
                              {t("common:cancel")}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="role-member-name-row">
                              <span className="role-member-name">
                                {m.name || t("roles.noName")}
                              </span>
                              <button
                                className="role-edit-name-btn"
                                onClick={() =>
                                  setEditingName({
                                    userId: m.userId,
                                    name: m.name || "",
                                  })
                                }
                              >
                                {t("common:edit")}
                              </button>
                            </div>
                            <span className="role-member-email">{m.email}</span>
                            {isMe && (
                              <span className="role-member-me">
                                {t("roles.me")}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="role-member-actions">
                        <select
                          className="role-select"
                          value={m.role}
                          onChange={(e) =>
                            handleRoleChange(m.userId, e.target.value)
                          }
                          disabled={isMe}
                        >
                          {roleKeys.map((key) => (
                            <option key={key} value={key}>
                              {getRoleLabel(key)}
                            </option>
                          ))}
                        </select>
                        {!isMe && canDo(userRole, "removeUser") && (
                          <button
                            className="role-remove-btn"
                            onClick={() =>
                              handleRemoveMember(m.userId, m.email)
                            }
                            title={t("roles.removeFromCompany")}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "send-noti" && canDo(userRole, "sendNotification") && (
          <div className="settings-section">
            <p className="settings-desc">{t("broadcast.description")}</p>
            <form
              onSubmit={handleSendNotification}
              className="manual-noti-form"
            >
              <div className="form-group">
                <label>{t("broadcast.titleLabel")}</label>
                <input
                  type="text"
                  value={notiTitle}
                  onChange={(e) => setNotiTitle(e.target.value)}
                  placeholder={t("broadcast.titlePlaceholder")}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t("broadcast.bodyLabel")}</label>
                <textarea
                  value={notiBody}
                  onChange={(e) => setNotiBody(e.target.value)}
                  placeholder={t("broadcast.bodyPlaceholder")}
                  rows={3}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingNoti}
                style={{ width: "100%" }}
              >
                {sendingNoti ? t("broadcast.sending") : t("broadcast.send")}
              </button>
            </form>
          </div>
        )}

        {activeTab === "language" && (
          <div className="settings-section">
            <p className="settings-desc">{t("language.description")}</p>
            <div className="language-selector">
              {["ko", "en"].map((lng) => (
                <button
                  key={lng}
                  className={`language-btn ${currentLang === lng ? "active" : ""}`}
                  onClick={() => handleLanguageChange(lng)}
                >
                  <span className="language-flag">
                    {lng === "ko"
                      ? "\uD83C\uDDF0\uD83C\uDDF7"
                      : "\uD83C\uDDFA\uD83C\uDDF8"}
                  </span>
                  <span>{t(`language.${lng}`)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "company-info" && (
          <div className="settings-section">
            <div className="company-info-card">
              <div className="company-info-row">
                <span className="company-info-label">
                  {t("companyInfo.companyName")}
                </span>
                <span className="company-info-value">{company?.name}</span>
              </div>
              <div className="company-info-row">
                <span className="company-info-label">
                  {t("companyInfo.inviteCode")}
                </span>
                <span className="company-info-value company-info-code">
                  {company?.invite_code}
                </span>
              </div>
            </div>
            <p className="settings-desc">{t("companyInfo.inviteCodeDesc")}</p>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="settings-section">
            <p className="settings-desc">{t("contact.description")}</p>
            <a
              href="mailto:dww7541@gmail.com"
              className="btn-settings-action"
              style={{
                textAlign: "center",
                display: "block",
                textDecoration: "none",
              }}
            >
              {t("contact.sendEmail")}
            </a>
            <p
              className="settings-desc"
              style={{ marginTop: 12, fontSize: 13 }}
            >
              {t("contact.email")}: dww7541@gmail.com
            </p>
            <div
              style={{
                marginTop: 32,
                paddingTop: 16,
                borderTop: "1px solid var(--border-color, #eee)",
              }}
            >
              <p className="settings-desc">{t("account.deleteDescription")}</p>
              <button
                className="btn-settings-action danger"
                onClick={handleDeleteAccount}
              >
                {t("account.deleteAccount")}
              </button>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="settings-section">
            <button className="btn-settings-action" onClick={clearCompany}>
              {t("company:switchCompany")}
            </button>
            <button
              className="btn-settings-action danger"
              onClick={handleSignOut}
            >
              {t("common:logout")}
            </button>
            <div
              style={{
                marginTop: 32,
                paddingTop: 16,
                borderTop: "1px solid var(--border-color, #eee)",
              }}
            >
              <p className="settings-desc">{t("account.deleteDescription")}</p>
              <button
                className="btn-settings-action danger"
                onClick={handleDeleteAccount}
              >
                {t("account.deleteAccount")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
