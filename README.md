
# blog-maker


### 描述

生成一个博客的描述信息


### 安装

```shell
npm i --save @kne/blog-maker
```


### 概述

用来为一个日志项目生成描述信息

生成结果:

output:

* 原本文件及文件夹
* manifest.json //所有包含.md扩展名的文件的文件列表信息
* folder-tree //解析后的文件夹树结构信息
* manifest-page // 按文件夹分页后的数据

文件命名规则:

1. 文件名以方括号开头并且里面是数字，则会被解析为index，参与文件列表排序
2. 文件名(不包含扩展)以方括号结尾的，则会被解析为author，作为文章作者
3. 文件名不满足以上两点的含有方括号的部分且可以满足[xxx-xxxx]格式的，则会被解析为attributes，会作为文章信息的attributes字段被返回前端

例如:

```text
[1]前端框架搭建-张三[tags-分享,前端][linzp].md
```

会被解析为

```json
{
  "id": "ad53d3cf549f156e878c94f20c955b1d",
  "path": "/blog/前端团队周报/张三/一月/[1]前端框架搭建-张三[tags-分享,前端][linzp].md",
  "title": "前端框架搭建-张三",
  "author": "linzp",
  "index": 1,
  "mtime": "2024-02-29T09:42:21.186Z",
  "attributes": {
    "tags": "分享,前端"
  },
  "label": "前端框架搭建-张三"
}
```

注意: 文章id为文章文件名md5 hex，文件夹id为文件路径md5 hex，所以修改文件名会重新生成文章id，修改路径或者文件夹名称会修改文件夹id


### 示例

#### 示例代码



### API

#### 环境变量

| 属性名         | 说明       | 类型     | 默认值   |
|-------------|----------|--------|-------|
| OUTPUT_PATH | 输出文档的目录  | string | build |
| PAGE_SIZE   | 文章列表分页大小 | number | 20    |

