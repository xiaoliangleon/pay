(function() {
  'use strict';

  const isChapterPage = document.body.classList.contains('reader-page');
  const jsonPath = isChapterPage ? '../chapters.json' : 'chapters.json';

  let chaptersData = null;

  function loadChapters() {
    if (chaptersData) return Promise.resolve(chaptersData);
    return fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        chaptersData = data;
        return data;
      })
      .catch(err => {
        console.error('加载章节数据失败:', err);
      });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 章节跳转下拉框
  function bindChapterJump() {
    const select = document.getElementById('chapterJumpSelect');
    if (!select) return;

    loadChapters().then(data => {
      if (!data || !data.chapters) return;

      const currentId = String(document.body.dataset.chapter || '');
      select.innerHTML = '<option value="" disabled>跳转章节</option>';

      data.chapters.forEach(ch => {
        const path = isChapterPage ? './' + ch.slug + '.html' : 'chapter/' + ch.slug + '.html';
        const option = document.createElement('option');
        option.value = path;
        option.textContent = '第 ' + ch.id + ' 章 · ' + ch.chapterTitle;
        if (String(ch.id) === currentId) option.selected = true;
        select.appendChild(option);
      });
    });

    select.addEventListener('change', function() {
      if (select.value) window.location.href = select.value;
    });
  }

  // 回到顶部
  function bindBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 键盘导航：左右箭头翻章
  function bindKeyboardNav() {
    if (!isChapterPage) return;
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      const body = document.body;
      const prevSlug = body.dataset.prev;
      const nextSlug = body.dataset.next;

      if (e.key === 'ArrowLeft' && prevSlug) {
        window.location.href = './' + prevSlug + '.html';
      } else if (e.key === 'ArrowRight' && nextSlug) {
        window.location.href = './' + nextSlug + '.html';
      }
    });
  }

  function init() {
    bindChapterJump();
    bindBackToTop();
    bindKeyboardNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
