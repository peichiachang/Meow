import { useState } from 'react';
import { getCatDisplayAvatar } from '../services/localAvatarService';
import type { Cat } from '../types/database';
import { ConfirmDialog } from './ConfirmDialog';
import { BUYMEACOFFEE_USERNAME } from '../config';
import './MainPage.css';

interface Props {
  cats: Cat[];
  maxCats: number;
  onSelectCat: (cat: Cat) => void;
  onAddCat: () => void;
  onEditCat: (cat: Cat) => void;
  onDeleteCat: (cat: Cat) => void;
  onSignOut: () => void;
  userId?: string;
}

export function MainPage({
  cats,
  maxCats,
  onSelectCat,
  onAddCat,
  onEditCat,
  onDeleteCat,
  onSignOut,
  userId,
}: Props) {
  const canAddCat = cats.length < maxCats;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState<Cat | null>(null);

  const handleDelete = (e: React.MouseEvent, cat: Cat) => {
    e.stopPropagation();
    setCatToDelete(cat);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (catToDelete) {
      onDeleteCat(catToDelete);
      setCatToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setCatToDelete(null);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="main-page">
      <header className="main-header">
        <div className="main-header-bar">
          {userId && (
            <div
              style={{
                fontSize: '10px',
                color: '#78716c',
                marginRight: '8px',
                padding: '4px 8px',
                background: '#f5f5f4',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
              onClick={() => {
                navigator.clipboard.writeText(userId);
                alert('User ID 已複製到剪貼簿！');
              }}
              title="點擊複製 User ID"
            >
              ID: {userId.substring(0, 8)}...
            </div>
          )}
          <button
            type="button"
            className="main-sign-out"
            onClick={onSignOut}
            title="登出"
          >
            登出
          </button>
        </div>
        <h1 className="main-title">Meow</h1>
        <p className="main-sub">了解喵喵的內心話</p>
      </header>

      <main className="main-content">
        <div className="main-cats">
          {cats.map((cat) => (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              className="main-cat-card"
              onClick={() => onSelectCat(cat)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCat(cat);
                }
              }}
            >
              <span className="main-cat-avatar">
                {(() => {
                  const avatarUrl = getCatDisplayAvatar(cat);
                  return avatarUrl ? (
                    <img src={avatarUrl} alt={cat.cat_name} />
                  ) : (
                    <span className="main-cat-avatar-placeholder">🐱</span>
                  );
                })()}
              </span>
              <span className="main-cat-name">{cat.cat_name}</span>
              <span className="main-cat-action">和 {cat.cat_name} 聊天</span>
              <div className="main-cat-card-actions">
                <button
                  type="button"
                  className="main-cat-btn main-cat-btn-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCat(cat);
                  }}
                  title="編輯"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#78716c"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className="main-cat-btn main-cat-btn-delete"
                  onClick={(e) => handleDelete(e, cat)}
                  title="刪除"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#f24545"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="main-add-cat"
          onClick={onAddCat}
          disabled={!canAddCat}
          title={canAddCat ? '新增一隻貓咪' : '已達貓咪數量上限'}
        >
          + 新增貓咪
        </button>

        {BUYMEACOFFEE_USERNAME && (
          <div className="main-donation-section">
            <a
              href={`https://www.buymeacoffee.com/${BUYMEACOFFEE_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="main-donation-btn"
              title="支持開發者"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
              </svg>
              <span>支持開發者</span>
            </a>
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="確認刪除"
        message={catToDelete ? `確定要刪除「${catToDelete.cat_name}」嗎？此操作無法復原，所有對話記錄也會一併刪除。` : ''}
        confirmText="確認刪除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
