const crypto = require('crypto');
const lodash = require('lodash');
const createFileTree = (paths, options) => {
  const { pageSize } = Object.assign({}, { pageSize: 20 }, options);
  const tree = [],
    files = {};
  for (const item of paths) {
    const segments = item.path.split('/').filter(name => !!name);

    let node = tree,
      parentNode;
    segments.forEach((segment, index) => {
      let nextNode = node.find(item => item.label === segment);
      if (!nextNode && index === segments.length - 1) {
        const targetItem = Object.assign({}, item, { label: item.title || segment });
        const list = files[parentNode.id] || [];
        files[parentNode.id] = [...list, targetItem].sort((a, b) => a - b);
        return;
      }
      if (!nextNode && index < segments.length - 1) {
        const md5 = crypto.createHash('md5');
        nextNode = Object.assign(
          {},
          {
            id: md5.update(segments.slice(0, index + 1).join('/')).digest('hex'),
            label: segment,
            children: []
          }
        );
        node.push(nextNode);
      }
      parentNode = nextNode;
      node = nextNode.children;
    });
  }
  return {
    folderTree: tree,
    files: lodash.transform(
      files,
      (result, value, key) => {
        result[key] = lodash.chunk(value, pageSize).map(pageData => {
          return {
            totalCount: value.length,
            pageData
          };
        });
      },
      {}
    )
  };
};

module.exports = createFileTree;
