import { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  open: boolean;
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export function ApiKeyModal({ open, apiKey, onSave, onClose }: ApiKeyModalProps) {
  const [key, setKey] = useState(apiKey);

  useEffect(() => {
    setKey(apiKey);
  }, [apiKey, open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>GraphHopper API Key</h3>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
          在 <a href="https://www.graphhopper.com/" target="_blank" rel="noreferrer">graphhopper.com</a> 注册免费账户获取 API Key（每日 500 次免费调用）。
        </p>
        <input
          type="text"
          className="modal__input"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="输入 GraphHopper API Key"
          autoFocus
        />
        <div className="modal__actions">
          <button className="btn btn--secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              onSave(key.trim());
              onClose();
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
