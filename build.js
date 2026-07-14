const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 配置
const NOVEL_DIR = '/workspace/novel_project/07_drafts/chapters';
const SITE_DIR = __dirname;
const TEMPLATE_DIR = path.join(SITE_DIR, 'templates');
const OUTPUT_DIR = SITE_DIR;

// 小说元信息
const NOVEL_META = {
  title: '废柴网管，月陨觉醒引力血脉',
  subtitle: '被分手后，我在三星堆捡到月球碎片，觉醒上古血脉',
  author: '（个人创作）',
  description: '26 岁的初中辍学 IT 网管潇亮，被分手后到成都三星堆散心，意外在鸭子河捡到一块黑色月球碎片，从此觉醒引力控制与超强学习能力。他一边在都市中扮猪吃老虎，一边沿着《周易》《山海经》等古籍线索，揭开上古天人族、不周山与大洪水的真相。',
  tags: ['都市异能', '扮猪吃老虎', '山海经', '草根逆袭', '上古神话'],
  totalChapters: 50,
  currentChapters: 0
};

// 读取模板
function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATE_DIR, name), 'utf8');
}

// 解析章节
function parseChapters() {
  const files = fs.readdirSync(NOVEL_DIR)
    .filter(f => /^ch\d+\.md$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/ch(\d+)/)[1]);
      const nb = parseInt(b.match(/ch(\d+)/)[1]);
      return na - nb;
    });

  const chapters = [];
  for (const file of files) {
    const filePath = path.join(NOVEL_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    
    // 解析标题
    let title = '';
    let titleLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('# ')) {
        title = line.replace(/^#\s*/, '');
        titleLineIndex = i;
        break;
      }
    }
    
    // 提取章编号和章名
    let chapterNum = parseInt(file.match(/ch(\d+)/)[1]);
    let chapterTitle = title;
    const match = title.match(/^第\s*(\d+)\s*章\s*[·\s]\s*(.+)$/);
    if (match) {
      chapterNum = parseInt(match[1]);
      chapterTitle = match[2].trim();
    }
    
    // 内容（去掉标题行）
    const contentLines = lines.slice(titleLineIndex + 1).filter(l => l.trim() !== '');
    const contentMarkdown = lines.slice(titleLineIndex + 1).join('\n');
    const contentHtml = marked.parse(contentMarkdown);
    const plainText = contentMarkdown
      .replace(/[#*`_\[\]\(\)!]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 摘要：取前 120 字
    const summary = plainText.slice(0, 120) + (plainText.length > 120 ? '……' : '');
    
    chapters.push({
      id: chapterNum,
      file: file,
      slug: String(chapterNum).padStart(3, '0'),
      fullTitle: title,
      chapterTitle: chapterTitle,
      summary: summary,
      contentMarkdown: contentMarkdown,
      contentHtml: contentHtml,
      plainText: plainText,
      wordCount: plainText.length
    });
  }
  
  return chapters;
}

// 生成 chapters.json
function generateChaptersJson(chapters) {
  const data = {
    meta: {
      ...NOVEL_META,
      currentChapters: chapters.length
    },
    chapters: chapters.map(c => ({
      id: c.id,
      slug: c.slug,
      fullTitle: c.fullTitle,
      chapterTitle: c.chapterTitle,
      summary: c.summary,
      wordCount: c.wordCount,
      plainText: c.plainText
    }))
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'chapters.json'), JSON.stringify(data, null, 2), 'utf8');
}

// 生成章节页
function generateChapterPages(chapters, indexTemplate, chapterTemplate) {
  const total = chapters.length;
  
  for (let i = 0; i < total; i++) {
    const ch = chapters[i];
    const prev = i > 0 ? chapters[i - 1] : null;
    const next = i < total - 1 ? chapters[i + 1] : null;
    
    // 构建上一章/下一章导航
    let navHtml = '<div class="chapter-nav">';
    if (prev) {
      navHtml += `<a class="btn-prev" href="chapter/${prev.slug}.html">← 上一章：${prev.chapterTitle}</a>`;
    } else {
      navHtml += `<span class="btn-disabled">← 上一章</span>`;
    }
    navHtml += `<a class="btn-catalog" href="index.html">目录</a>`;
    if (next) {
      navHtml += `<a class="btn-next" href="chapter/${next.slug}.html">下一章：${next.chapterTitle} →</a>`;
    } else {
      navHtml += `<span class="btn-disabled">下一章 →</span>`;
    }
    navHtml += '</div>';
    
    const html = chapterTemplate
      .replace(/\{\{SITE_TITLE\}\}/g, NOVEL_META.title)
      .replace(/\{\{CHAPTER_TITLE\}\}/g, ch.fullTitle)
      .replace(/\{\{CHAPTER_SLUG\}\}/g, ch.slug)
      .replace(/\{\{CHAPTER_ID\}\}/g, String(ch.id))
      .replace(/\{\{CHAPTER_CONTENT\}\}/g, ch.contentHtml)
      .replace(/\{\{CHAPTER_NAV\}\}/g, navHtml)
      .replace(/\{\{PREV_SLUG\}\}/g, prev ? prev.slug : '')
      .replace(/\{\{NEXT_SLUG\}\}/g, next ? next.slug : '');
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'chapter', `${ch.slug}.html`), html, 'utf8');
  }
}

// 生成首页
function generateIndexPage(chapters, indexTemplate) {
  const total = chapters.length;
  const chapterListHtml = chapters.map(ch => {
    return `
      <li class="chapter-item">
        <a href="chapter/${ch.slug}.html" class="chapter-link">
          <span class="chapter-num">第 ${ch.id} 章</span>
          <span class="chapter-name">${ch.chapterTitle}</span>
          <span class="chapter-summary">${ch.summary}</span>
        </a>
      </li>
    `;
  }).join('');
  
  const tagsHtml = NOVEL_META.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
  
  const html = indexTemplate
    .replace(/\{\{SITE_TITLE\}\}/g, NOVEL_META.title)
    .replace(/\{\{SITE_SUBTITLE\}\}/g, NOVEL_META.subtitle)
    .replace(/\{\{SITE_AUTHOR\}\}/g, NOVEL_META.author)
    .replace(/\{\{SITE_DESCRIPTION\}\}/g, NOVEL_META.description)
    .replace(/\{\{SITE_TAGS\}\}/g, tagsHtml)
    .replace(/\{\{CURRENT_CHAPTERS\}\}/g, String(total))
    .replace(/\{\{TOTAL_CHAPTERS\}\}/g, String(NOVEL_META.totalChapters))
    .replace(/\{\{CHAPTER_LIST\}\}/g, chapterListHtml);
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html, 'utf8');
}

// 复制静态资源
function copyAssets() {
  const srcAssets = path.join(SITE_DIR, 'assets');
  const destAssets = path.join(OUTPUT_DIR, 'assets');
  
  function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDir(srcAssets, destAssets);
}

// 主流程
function main() {
  console.log('开始构建《上古引力》阅读站...');
  
  const chapters = parseChapters();
  console.log(`解析到 ${chapters.length} 章`);
  
  const indexTemplate = readTemplate('index.html');
  const chapterTemplate = readTemplate('chapter.html');
  
  generateChaptersJson(chapters);
  console.log('已生成 chapters.json');
  
  generateIndexPage(chapters, indexTemplate);
  console.log('已生成 index.html');
  
  generateChapterPages(chapters, indexTemplate, chapterTemplate);
  console.log(`已生成 ${chapters.length} 个章节页面`);
  
  copyAssets();
  console.log('已复制静态资源');
  
  console.log('构建完成！');
}

main();
