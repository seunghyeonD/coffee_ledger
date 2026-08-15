"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import NotificationSettings from "./NotificationSettings";

export default function SettingsPage({ showToast }) {
  const { t } = useTranslation(["settings", "common", "company"]);
  const {
    signOut,
    clearCompany,
    deleteAccount,
    company,
  } = useAuth();
  const [activeTab, setActiveTab] = useState("notifications");

  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
    document.documentElement.lang = lng;
  };

  const tabs = [
    { key: "notifications", label: t("tabs.notification") },
    { key: "language", label: t("language.title") },
    { key: "contact", label: t("tabs.contact") },
    { key: "company-info", label: t("tabs.company"), mobileOnly: true },
    { key: "account", label: t("tabs.account"), mobileOnly: true },
  ];

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

        {activeTab === "language" && (
          <div className="settings-section">
            <p className="settings-desc">{t("language.description")}</p>
            <div className="language-selector">
              {["ko", "en", "ja"].map((lng) => (
                <button
                  key={lng}
                  className={`language-btn ${currentLang === lng ? "active" : ""}`}
                  onClick={() => handleLanguageChange(lng)}
                >
                  <span className="language-flag">
                    {{ ko: "\uD83C\uDDF0\uD83C\uDDF7", en: "\uD83C\uDDFA\uD83C\uDDF8", ja: "\uD83C\uDDEF\uD83C\uDDF5" }[lng]}
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
