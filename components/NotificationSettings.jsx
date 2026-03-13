'use client';

import { useState, useEffect } from 'react';
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

    // fcm_tokens.enabled로 알림 토글 상태 결정
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
      // 알림 활성화
      const token = await requestNotificationPermission(user.id, companyId);
      if (!token) {
        showToast('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
        return;
      }
      setEnabled(true);
      setPermissionState('granted');
      await savePreferences({ order_registered_enabled: true, low_balance_enabled: true, low_balance_threshold: threshold });
      showToast('알림이 활성화되었습니다.');
    } else {
      // 알림 비활성화 (토큰 유지, enabled=false)
      await disableFCMToken(user.id, companyId);
      setEnabled(false);
      showToast('알림이 비활성화되었습니다.');
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
    showToast(newVal ? '주문 알림이 켜졌습니다.' : '주문 알림이 꺼졌습니다.');
  };

  const handleLowBalanceToggle = async () => {
    const newVal = !lowBalanceEnabled;
    setLowBalanceEnabled(newVal);
    await savePreferences({ low_balance_enabled: newVal });
    showToast(newVal ? '잔액 부족 알림이 켜졌습니다.' : '잔액 부족 알림이 꺼졌습니다.');
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
          이 브라우저는 푸시 알림을 지원하지 않습니다.
        </div>
      )}

      {denied && (
        <div className="notification-warning">
          알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.
        </div>
      )}

      <div className="notification-card">
        <div className="notification-row">
          <div>
            <strong>푸시 알림</strong>
            <p className="notification-desc">주문 등록, 잔액 부족 시 푸시 알림을 받습니다.</p>
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
                <strong>주문 등록 알림</strong>
                <p className="notification-desc">새로운 주문이 등록되면 알림을 받습니다.</p>
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
                <strong>잔액 부족 알림</strong>
                <p className="notification-desc">
                  {isAdmin
                    ? '멤버 잔액이 설정 금액 이하일 때 관리자 알림을 받습니다.'
                    : '내 잔액이 설정 금액 이하일 때 충전 요청 알림을 받습니다.'}
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
                  잔액 임계값
                  <input
                    type="number"
                    className="threshold-input"
                    value={threshold}
                    onChange={handleThresholdChange}
                    onBlur={handleThresholdBlur}
                    step={1000}
                    min={0}
                  />
                  <span className="threshold-unit">원 이하</span>
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
      <h2 className="page-title">알림 설정</h2>
      {content}
    </div>
  );
}
