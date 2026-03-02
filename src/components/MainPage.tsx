import type { Cat } from '../types/database';
import './MainPage.css';

interface Props {
  cats: Cat[];
  maxCats: number;
  onSelectCat: (cat: Cat) => void;
  onAddCat: () => void;
  onSignOut: () => void;
}

export function MainPage({
  cats,
  maxCats,
  onSelectCat,
  onAddCat,
  onSignOut,
}: Props) {
  const canAddCat = cats.length < maxCats;

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
            <button
              key={cat.id}
              type="button"
              className="main-cat-card"
              onClick={() => onSelectCat(cat)}
            >
              <span className="main-cat-avatar">
                {cat.avatar_url ? (
                  <img src={cat.avatar_url} alt={cat.cat_name} />
                ) : (
                  <span className="main-cat-avatar-placeholder">🐱</span>
                )}
              </span>
              <span className="main-cat-name">{cat.cat_name}</span>
              <span className="main-cat-action">和 {cat.cat_name} 聊天</span>
            </button>
          ))}
        </div>

        {canAddCat && (
          <button
            type="button"
            className="main-add-cat"
            onClick={onAddCat}
          >
            + 新增貓咪
          </button>
        )}
      </main>
    </div>
  );
}
