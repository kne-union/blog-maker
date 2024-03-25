#!/usr/bin/env node

const { glob } = require('glob');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const last = require('lodash/last');
const createFileTree = require('./libs/createFileTree');
const renderMarkdown = require('./libs/renderMarkdown');

(async () => {
  const appDir = process.cwd();
  const output = process.env.OUTPUT_PATH || path.resolve(appDir, 'build');
  const filesPath = await glob('**/*.md', { ignore: ['node_modules/**/*', 'public/**/*', 'build/**/*'], cwd: appDir }),
    downloadErrorList = [];
  await fs.emptyDir(output);
  await fs.emptyDir(path.resolve(output, 'manifest-pages'));
  await fs.emptyDir(path.resolve(output, 'manifest-pages', 'html'));
  const fileList = await Promise.all(
    filesPath.map(async item => {
      const md5 = crypto.createHash('md5');
      let filename = path.basename(item, path.extname(item)),
        author,
        index = 0;
      const match = filename.match(/\[.+?]/g);
      const attr = {};
      if (match && /^\[\d+]$/.test(match[0])) {
        filename = filename.replace(match[0], '');
        index = parseInt(match[0].slice(1, -1));
        match.splice(0, 1);
      }
      if (match && last(match) && filename.endsWith(last(match))) {
        filename = filename.replace(last(match), '');
        author = last(match).slice(1, -1);
        match.splice(match.length - 1, 1);
      }

      match &&
        match.forEach(str => {
          const attrMatch = str.match(/^\[(.*)-(.*)]$/);
          if (attrMatch && attrMatch.length >= 3) {
            attr[attrMatch[1]] = attrMatch[2];
            filename = filename.replace(attrMatch[0], '');
          }
        });

      const { mtime } = await fs.stat(item);

      const { outputHtml: htmlContent, downloadError } = await renderMarkdown(await fs.readFile(item, 'utf8'), {
        outputAssetsPath: path.resolve(output, 'assets')
      });

      downloadErrorList.push(...downloadError);

      const htmlFileName = (() => {
        const md5 = crypto.createHash('md5');
        return md5.update(htmlContent).digest('hex') + '.html';
      })();
      await fs.writeFile(path.resolve(output, 'manifest-pages', 'html', htmlFileName), htmlContent);
      return Object.assign(
        {},
        {
          id: md5.update(item).digest('hex'),
          path: '/' + item.split(path.sep).join('/'),
          htmlPath: '/manifest-pages/html/' + htmlFileName,
          title: filename,
          author,
          index,
          mtime,
          attributes: attr
        }
      );
    })
  );

  // 构建文件树
  const PAGE_SIZE = parseInt(process.env.PAGE_SIZE);
  const { folderTree, files } = createFileTree(fileList, { pageSize: Number.isInteger(PAGE_SIZE) ? PAGE_SIZE : 20 });

  //输出构建文件
  await Promise.all(
    filesPath.map(async file => {
      const dir = path.join(output, path.dirname(file));
      await fs.ensureDir(dir);
      await fs.copy(file, path.join(output, file));
    })
  );
  (await fs.exists('assets')) && (await fs.copy('assets', path.resolve(output, 'assets')));

  await fs.writeJson(path.resolve(output, 'manifest.json'), fileList);
  await fs.writeJson(path.resolve(output, 'manifest-pages', 'folder-tree.json'), folderTree);
  await Promise.all(
    Object.keys(files).map(async id => {
      await fs.emptyDir(path.resolve(output, 'manifest-pages', id));
      await Promise.all(files[id].map((data, index) => fs.writeJson(path.resolve(output, 'manifest-pages', id, `${index}.json`), data)));
    })
  );

  downloadErrorList.length > 0 && (await fs.writeFile(path.resolve(output, 'download-shell.sh'), downloadErrorList.map(({ filePath, url }) => `curl -o "${filePath}" "${url}"`).join(';\n')));
})().catch(e => {
  throw e;
});
