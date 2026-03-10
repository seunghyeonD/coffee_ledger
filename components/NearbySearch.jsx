'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

function loadKakaoSDK() {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      resolve();
      return;
    }
    // 이미 스크립트 태그가 있으면 제거 후 재로드
    const existing = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => resolve());
      } else {
        reject(new Error('카카오맵 초기화 실패. JavaScript 키를 확인해주세요.'));
      }
    };
    script.onerror = (e) => {
      console.error('Kakao SDK load error:', e);
      reject(new Error('카카오맵 SDK 로드 실패. 키 또는 도메인 설정을 확인해주세요.'));
    };
    document.head.appendChild(script);
  });
}

export default function NearbySearch({ onSelect, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [radius, setRadius] = useState(3000);

  const searchCafes = useCallback((lat, lng, r) => {
    const kakao = window.kakao;
    const places = new kakao.maps.services.Places();
    const coords = new kakao.maps.LatLng(lat, lng);

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    places.keywordSearch('카페', (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        setCafes(data);
        const bounds = new kakao.maps.LatLngBounds();

        data.forEach((place) => {
          const pos = new kakao.maps.LatLng(place.y, place.x);
          const marker = new kakao.maps.Marker({ map: mapInstance.current, position: pos });

          kakao.maps.event.addListener(marker, 'click', () => {
            setSelected(place);
          });

          const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${place.place_name}</div>`,
          });

          kakao.maps.event.addListener(marker, 'mouseover', () => {
            infowindow.open(mapInstance.current, marker);
          });
          kakao.maps.event.addListener(marker, 'mouseout', () => {
            infowindow.close();
          });

          markersRef.current.push(marker);
          bounds.extend(pos);
        });

        bounds.extend(coords);
        mapInstance.current.setBounds(bounds);
      } else {
        setCafes([]);
      }
      setLoading(false);
    }, {
      location: coords,
      radius: r,
      size: 15,
      sort: kakao.maps.services.SortBy.DISTANCE,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadKakaoSDK();

        if (!navigator.geolocation) {
          setError('위치 정보를 사용할 수 없습니다.');
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mounted) return;
            const { latitude, longitude } = pos.coords;
            const kakao = window.kakao;
            const coords = new kakao.maps.LatLng(latitude, longitude);

            const map = new kakao.maps.Map(mapRef.current, {
              center: coords,
              level: 5,
            });
            mapInstance.current = map;

            // 내 위치 마커
            new kakao.maps.Marker({
              map,
              position: coords,
              image: new kakao.maps.MarkerImage(
                'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
                new kakao.maps.Size(24, 35)
              ),
            });

            searchCafes(latitude, longitude, radius);
          },
          () => {
            if (!mounted) return;
            setError('위치 권한을 허용해주세요.');
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } catch (e) {
        if (!mounted) return;
        setError(e.message);
        setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [searchCafes, radius]);

  const handleSelect = () => {
    if (selected) {
      onSelect({
        name: selected.place_name,
        address: selected.road_address_name || selected.address_name,
        phone: selected.phone,
        url: selected.place_url,
      });
    }
  };

  return (
    <div className="nearby-overlay">
      <div className="nearby-container">
        <div className="nearby-header">
          <h2>주변 카페 찾기</h2>
          <button className="btn-close" onClick={onClose}>{'\u00D7'}</button>
        </div>

        <div className="nearby-controls">
          <select
            className="select-input"
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
          >
            <option value={1000}>1km 이내</option>
            <option value={3000}>3km 이내</option>
            <option value={5000}>5km 이내</option>
            <option value={10000}>10km 이내</option>
          </select>
          <span className="nearby-count">{cafes.length}개 카페 발견</span>
        </div>

        {error && <div className="nearby-error">{error}</div>}

        <div className="nearby-body">
          <div className="nearby-map" ref={mapRef}>
            {loading && <div className="nearby-map-loading">지도 로딩 중...</div>}
          </div>

          <div className="nearby-list">
            {cafes.map((cafe, i) => (
              <button
                key={cafe.id || i}
                className={`nearby-item ${selected?.id === cafe.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelected(cafe);
                  if (mapInstance.current) {
                    mapInstance.current.setCenter(
                      new window.kakao.maps.LatLng(cafe.y, cafe.x)
                    );
                    mapInstance.current.setLevel(3);
                  }
                }}
              >
                <div className="nearby-item-name">{cafe.place_name}</div>
                <div className="nearby-item-addr">{cafe.road_address_name || cafe.address_name}</div>
                <div className="nearby-item-meta">
                  {cafe.distance && <span>{(cafe.distance / 1000).toFixed(1)}km</span>}
                  {cafe.phone && <span>{cafe.phone}</span>}
                </div>
              </button>
            ))}
            {!loading && cafes.length === 0 && !error && (
              <div className="empty-state">주변에 카페가 없습니다.</div>
            )}
          </div>
        </div>

        {selected && (
          <div className="nearby-footer">
            <div className="nearby-selected-name">{selected.place_name}</div>
            <button className="btn btn-primary" onClick={handleSelect}>
              이 카페를 업체로 추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
