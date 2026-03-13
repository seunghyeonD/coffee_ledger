'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import {
  requestNotificationPermission,
  disableFCMToken,
  getFCMTokenStatus,
  getNotificationPreferences,
  upsertNotificationPreferences,
} from '@/lib/fcm';

export default function NotificationSettings({ showToast, embedded = false }) {
  const { t } = useTranslation('settings');
  const { user, userRole } = useAuth();
  const { companyId } = useStore();
  const isAdmin = userRole === 'master' || userRole === 'admin';
  const [enabled, setEnabled] = useState(false);
  const [orderEnabled, setOrderEnabled] = useState(true);
  const [lowBalanceEnabled, setLowBalanceEnabled] = useState(true);
  const [threshold, setThreshold] = useState(5000);
  const [permissionState, setPermissionState] = useState('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user || !companyId) return;
    let cancelled = false;

    Promise.all([
      getFCMTokenStatus(user.id, companyId),
      getNotificationPreferences(user.id, companyId),
    ]).then(([tokenStatus, prefs]) => {
      if (cancelled) return;
      setEnabled(tokenStatus?.enabled ?? false);
      if (prefs) {
        setOrderEnabled(prefs.order_registered_enabled ?? true);
        setLowBalanceEnabled(prefs.low_balance_enabled ?? true);
        setThreshold(prefs.low_balance_threshold ?? 5000);
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [user, companyId]);

  const handleToggleNotifications = async () => {
    if (!enabled) {
      const token = await requestNotificationPermission(user.id, companyId);
      if (!token) {
        showToast(t('notification.permissionDenied'));
        return;
      }
      setEnabled(true);
      setPermissionState('granted');
      await savePreferences({ order_registered_enabled: true, low_balance_enabled: true, low_balance_threshold: threshold });
      showToast(t('notification.enabled'));
    } else {
      await disableFCMToken(user.id, companyId);
      setEnabled(false);
      showToast(t('notification.disabled'));
    }
  };

  const savePreferences = async (overrides = {}) => {
    try {
      await upsertNotificationPreferences(user.id, companyId, {
        order_registered_enabled: orderEnabled,
        low_balance_enabled: lowBalanceEnabled,
        low_balance_threshold: threshold,
        ...overrides,
      });
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  };

  const handleOrderToggle = async () => {
    const newVal = !orderEnabled;
    setOrderEnabled(newVal);
    await savePreferences({ order_registered_enabled: newVal });
    showToast(newVal ? t('notification.orderEnabled') : t('notification.orderDisabled'));
  };

  const handleLowBalanceToggle = async () => {
    const newVal = !lowBalanceEnabled;
    setLowBalanceEnabled(newVal);
    await savePreferences({ low_balance_enabled: newVal });
    showToast(newVal ? t('notification.balanceEnabled') : t('notification.balanceDisabled'));
  };

  const handleThresholdChange = async (e) => {
    const val = Number(e.target.value);
    setThreshold(val);
  };

  const handleThresholdBlur = async () => {
    await savePreferences({ low_balance_threshold: threshold });
  };

  const notSupported = typeof window !== 'undefined' && !('Notification' in window);
  const denied = permissionState === 'denied';

  const content = (
    <>
      {notSupported && (
        <div className="notification-warning">
          {t('notification.unsupported')}
        </div>
      )}

      {denied && (
        <div className="notification-warning">
          {t('notification.blocked')}
        </div>
      )}

      <div className="notification-card">
        <div className="notification-row">
          <div>
            <strong>{t('notification.pushNotification')}</strong>
            <p className="notification-desc">{t('notification.pushDesc')}</p>
          </div>
          <button
            className={`toggle-btn ${enabled ? 'active' : ''}`}
            onClick={handleToggleNotifications}
            disabled={notSupported || denied}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {enabled && (
          <>
            <hr className="notification-divider" />

            <div className="notification-row">
              <div>
                <strong>{t('notification.orderNotification')}</strong>
                <p className="notification-desc">{t('notification.orderNotificationDesc')}</p>
              </div>
              <button
                className={`toggle-btn ${orderEnabled ? 'active' : ''}`}
                onClick={handleOrderToggle}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="notification-row">
              <div>
                <strong>{t('notification.balanceNotification')}</strong>
                <p className="notification-desc">
                  {isAdmin
                    ? t('notification.balanceNotificationDescAdmin')
                    : t('notification.balanceNotificationDescUser')}
                </p>
              </div>
              <button
                className={`toggle-btn ${lowBalanceEnabled ? 'active' : ''}`}
                onClick={handleLowBalanceToggle}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {lowBalanceEnabled && (
              <div className="notification-row threshold-row">
                <label>
                  {t('notification.balanceThreshold')}
                  <input
                    type="number"
                    className="threshold-input"
                    value={threshold}
                    onChange={handleThresholdChange}
                    onBlur={handleThresholdBlur}
                    step={1000}
                    min={0}
                  />
                  <span className="threshold-unit">{t('notification.belowWon')}</span>
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="page-section">
      <h2 className="page-title">{t('notification.title')}</h2>
      {content}
    </div>
  );
}
