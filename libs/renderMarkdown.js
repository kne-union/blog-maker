const markdown = require('markdown-it');
const taskLists = require('markdown-it-task-lists');
const mathjax = require('markdown-it-mathjax');
const replaceLink = require('markdown-it-replace-link');
const hljs = require('highlight.js');
const crypto = require('crypto');
const request = require('request-promise');
const { encode } = require('plantuml-encoder');
const fs = require('fs-extra');
const path = require('path');

const renderPlantuml = async ({ code, path: filePath }) => {
  const compressedData = encode('@startuml' + '\n' + code + '\n@enduml');
  const url = `https://www.plantuml.com/plantuml/svg/${compressedData}`;
  await fs.ensureDir(path.dirname(filePath));
  await request(url)
    .then(buffer => fs.writeFile(filePath, buffer))
    .catch(() => {
      console.log(`curl -o ${filePath} ${url};`);
    });
};

const renderMermaid = async ({ code, path: filePath }) => {
  const compressedData = encodeURIComponent(
    Buffer.from(
      JSON.stringify({
        code,
        mermaid: {
          theme: 'default'
        }
      })
    ).toString('base64')
  );
  const url = `https://mermaid.ink/svg/${compressedData}`;
  await fs.ensureDir(path.dirname(filePath));
  await request(`https://mermaid.ink/svg/${compressedData}`)
    .then(async buffer => {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, buffer);
    })
    .catch(() => {
      console.log(`curl -o ${filePath} ${url};`);
    });
};

const renderMarkdown = async (content, options) => {
  const { assetsPath, outputAssetsPath } = Object.assign({}, { assetsPath: '../../assets' }, options);
  const codeList = [];
  const blockRender = md => {
    const otherFence = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, idx, options, env, slf) {
      const token = tokens[idx];
      const code = token.content.trim();
      const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
      let langName = '';

      if (info) {
        langName = info.split(/\s+/g)[0];
      }
      if (['plantuml', 'mermaid'].indexOf(langName) > -1) {
        const md5 = crypto.createHash('md5');
        const filename = md5.update(code).digest('hex') + '.svg';
        codeList.push({
          path: `${outputAssetsPath}/${filename}`,
          type: langName,
          code
        });
        return `<img class="md-render" src="${assetsPath}/${filename}" alt="${langName}" />`;
      }
      return otherFence.call(this, tokens, idx, options, env, slf);
    };
  };

  const md = markdown({
    xhtmlOut: true,
    html: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return (
            '<pre class="hljs"><code>' +
            hljs.highlight(str, {
              language: lang,
              ignoreIllegals: true
            }).value +
            '</code></pre>'
          );
        } catch (e) {
          console.error(e);
        }
      }

      return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
  })
    .use(taskLists)
    .use(mathjax)
    .use(blockRender)
    .use(replaceLink, {
      processHTML: true,
      replaceLink: function (link) {
        if (/^http/.test(link)) {
          return link;
        }
        return (
          assetsPath +
          decodeURIComponent(link)
            .replace(/.*assets/, '')
            .replace(/\\/g, '/')
        );
      }
    });

  let outputHtml = md.render(content);

  await Promise.all(
    codeList.map(item => {
      if (item.type === 'mermaid') {
        return renderMermaid(item);
      }
      if (item.type === 'plantuml') {
        return renderPlantuml(item);
      }
    })
  );

  return outputHtml;
};

module.exports = renderMarkdown;
