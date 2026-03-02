import { getCatDisplayAvatar } from '../services/localAvatarService';
import type { Cat } from '../types/database';
import './MainPage.css';

interface Props {
  cats: Cat[];
  maxCats: number;
  onSelectCat: (cat: Cat) => void;
  onAddCat: () => void;
  onEditCat: (cat: Cat) => void;
  onDeleteCat: (cat: Cat) => void;
  onSignOut: () => void;
}

export function MainPage({
  cats,
  maxCats,
  onSelectCat,
  onAddCat,
  onEditCat,
  onDeleteCat,
  onSignOut,
}: Props) {
  const canAddCat = cats.length < maxCats;

  const handleDelete = (e: React.MouseEvent, cat: Cat) => {
    e.stopPropagation();
    if (window.confirm(`確定要刪除「${cat.cat_name}」嗎？此操作無法復原。`)) {
      onDeleteCat(cat);
    }
  };

  return (
    <div className="main-page">
      <header className="main-header">
        <h1 className="main-title">Meow</h1>
        <p className="main-sub">了解喵喵的內心話</p>
        <button
          type="button"
          className="main-sign-out"
          onClick={onSignOut}
          title="登出"
        >
          登出
        </button>
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
                  編輯
                </button>
                <button
                  type="button"
                  className="main-cat-btn main-cat-btn-delete"
                  onClick={(e) => handleDelete(e, cat)}
                  title="刪除"
                >
                  刪除
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
      </main>
    </div>
  );
}
