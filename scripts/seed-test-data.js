'use strict';

process.on('uncaughtException', (error) => {
  if (error.message === 'aborted') {
    return;
  }

  throw error;
});

process.on('unhandledRejection', (error) => {
  if (error && error.message === 'aborted') {
    return;
  }

  throw error;
});

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const categoriesSeed = [
  {
    name: 'Engineering',
    slug: 'engineering',
    description: 'Backend architecture, delivery patterns, and practical engineering notes.',
  },
  {
    name: 'Product',
    slug: 'product',
    description: 'Discovery, roadmap decisions, and product execution tradeoffs.',
  },
  {
    name: 'Platform',
    slug: 'platform',
    description: 'Cloud operations, deployment workflows, and platform reliability.',
  },
];

const tagsSeed = [
  { name: 'Strapi', slug: 'strapi' },
  { name: 'Azure', slug: 'azure' },
  { name: 'CI/CD', slug: 'ci-cd' },
  { name: 'API Design', slug: 'api-design' },
  { name: 'Content Modeling', slug: 'content-modeling' },
  { name: 'Observability', slug: 'observability' },
];

const postsSeed = [
  {
    title: 'Designing a Blog Schema That Survives Real Deployments',
    writtenBy: 'Sam Patterson',
    slug: 'designing-a-blog-schema-that-survives-real-deployments',
    summary:
      'A practical look at modeling posts, tags, sections, and homepage composition without relying on admin-only setup.',
    content:
      '<p>Schema-first content modeling pays off when infrastructure rebuilds are common.</p><p>This post walks through how to keep blog data types explicit, portable, and easy to evolve in Git.</p>',
    publishedDate: '2026-02-12T09:00:00.000Z',
    isFeatured: true,
    category: 'Engineering',
    tags: ['Strapi', 'Content Modeling', 'API Design'],
    featuredImage: 'coffee-beans.jpg',
    thumbnailImage: 'coffee-art.jpg',
  },
  {
    title: 'Why Editorial Pages Need Structured Sections',
    writtenBy: 'Sam Patterson',
    slug: 'why-editorial-pages-need-structured-sections',
    summary:
      'Flexible homepage sections reduce frontend branching and make editorial configuration predictable.',
    content:
      '<p>Editorial teams need freedom, but unrestricted fields create brittle rendering code.</p><p>Structured section components keep the homepage configurable without losing consistency.</p>',
    publishedDate: '2026-02-14T09:00:00.000Z',
    isFeatured: false,
    category: 'Product',
    tags: ['Content Modeling', 'Strapi'],
    featuredImage: 'beautiful-picture.jpg',
    thumbnailImage: 'what-s-inside-a-black-hole.jpg',
  },
  {
    title: 'Running Strapi in CI Without Surprises',
    writtenBy: 'Sam Patterson',
    slug: 'running-strapi-in-ci-without-surprises',
    summary:
      'Environment-driven config, committed schemas, and repeatable checks keep Strapi Cloud deployments predictable.',
    content:
      '<p>CI failures usually come from hidden admin changes or missing secrets.</p><p>Keeping schemas and seed flows in code narrows the gap between local and cloud environments.</p>',
    publishedDate: '2026-02-16T09:00:00.000Z',
    isFeatured: true,
    category: 'Platform',
    tags: ['CI/CD', 'Strapi', 'Azure'],
    featuredImage: 'coffee-shadow.jpg',
    thumbnailImage: 'default-image.png',
  },
  {
    title: 'When to Use Manual Featured Posts Instead of Auto Lists',
    writtenBy: 'Sam Patterson',
    slug: 'when-to-use-manual-featured-posts-instead-of-auto-lists',
    summary:
      'Manual curation is useful for launches, campaigns, and narrative arcs that should not be date-driven.',
    content:
      '<p>Not every homepage should be sorted purely by publish date.</p><p>Manual featured slots let teams support launches and campaigns without changing the default listing rules.</p>',
    publishedDate: '2026-02-18T09:00:00.000Z',
    isFeatured: true,
    category: 'Product',
    tags: ['API Design'],
    featuredImage: 'we-love-pizza.jpg',
    thumbnailImage: 'this-shrimp-is-awesome.jpg',
  },
  {
    title: 'Observability Basics for Content Platforms',
    writtenBy: 'Sam Patterson',
    slug: 'observability-basics-for-content-platforms',
    summary:
      'Metrics, logs, and traces matter even for CMS-backed sites once publishing workflows become business-critical.',
    content:
      '<p>A quiet CMS failure can look like a frontend issue unless telemetry is in place.</p><p>Start with request visibility, publishing audits, and deployment diagnostics.</p>',
    publishedDate: '2026-02-20T09:00:00.000Z',
    isFeatured: false,
    category: 'Platform',
    tags: ['Observability', 'Azure'],
    featuredImage: 'a-bug-is-becoming-a-meme-on-the-internet.jpg',
    thumbnailImage: 'the-internet-s-own-boy.jpg',
  },
  {
    title: 'Practical API Design for Blog Listing Endpoints',
    writtenBy: 'Sam Patterson',
    slug: 'practical-api-design-for-blog-listing-endpoints',
    summary:
      'Small response shapes and explicit filters help blog APIs scale from simple landing pages to richer search experiences.',
    content:
      '<p>Listing endpoints should be predictable before they are clever.</p><p>Consistent filters for category, tag, date, and featured state keep clients simple and cacheable.</p>',
    publishedDate: '2026-02-22T09:00:00.000Z',
    isFeatured: false,
    category: 'Engineering',
    tags: ['API Design', 'Strapi'],
    featuredImage: 'coffee-art.jpg',
    thumbnailImage: 'beautiful-picture.jpg',
  },
];

function paragraphBlock(text) {
  return [
    {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text,
        },
      ],
    },
  ];
}

async function clearExistingContent(strapi) {
  await strapi.db.query('api::blog-home-page.blog-home-page').deleteMany({ where: {} });
  await strapi.db.query('api::blog-post.blog-post').deleteMany({ where: {} });
  await strapi.db.query('api::tag.tag').deleteMany({ where: {} });
  await strapi.db.query('api::category.category').deleteMany({ where: {} });
}

function getUploadFileData(fileName) {
  const filePath = path.join(__dirname, '..', 'data', 'uploads', fileName);
  const ext = path.extname(fileName);

  return {
    filepath: filePath,
    originalFileName: fileName,
    size: fs.statSync(filePath).size,
    mimetype: mime.lookup(ext || '') || 'application/octet-stream',
  };
}

async function ensureUpload(strapi, fileName) {
  const basename = path.parse(fileName).name;
  const existing = await strapi.db.query('plugin::upload.file').findOne({
    where: { name: basename },
  });

  if (existing) {
    return existing;
  }

  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: {
      fileInfo: {
        name: basename,
        caption: basename,
        alternativeText: basename,
      },
    },
    files: getUploadFileData(fileName),
  });

  return uploaded;
}

async function createCategories(strapi) {
  const created = {};

  for (const category of categoriesSeed) {
    const entry = await strapi.db.query('api::category.category').create({
      data: category,
    });

    created[category.name] = entry;
  }

  return created;
}

async function createTags(strapi) {
  const created = {};

  for (const tag of tagsSeed) {
    const entry = await strapi.db.query('api::tag.tag').create({
      data: tag,
    });

    created[tag.name] = entry;
  }

  return created;
}

async function createPosts(strapi, categoriesByName, tagsByName) {
  const created = {};

  for (const post of postsSeed) {
    const featuredImage = await ensureUpload(strapi, post.featuredImage);
    const thumbnailImage = await ensureUpload(strapi, post.thumbnailImage);

    const draftEntry = await strapi.documents('api::blog-post.blog-post').create({
      data: {
        title: post.title,
        topic: post.title,
        slug: post.slug,
        summary: post.summary,
        writtenBy: post.writtenBy,
        heroImage: featuredImage.id,
        descriptionBlocks: [
          {
            __component: 'shared.rich-text-block',
            content: paragraphBlock(`${post.title} opens with a structured editorial introduction.`),
          },
          {
            __component: 'shared.image-block',
            image: featuredImage.id,
            caption: `${post.title} hero illustration`,
            altText: post.title,
          },
          {
            __component: 'shared.rich-text-block',
            content: paragraphBlock('The body can now alternate text and media blocks without forcing a single rich-text field.'),
          },
        ],
        topics: [
          {
            title: 'Key takeaway',
            content: paragraphBlock(post.summary),
            image: thumbnailImage.id,
          },
          {
            title: 'Implementation note',
            content: paragraphBlock('Repeatable topic sections give editors a predictable way to add grouped detail with optional supporting imagery.'),
          },
        ],
        conclusion: paragraphBlock('This sample post now exercises the blog detail schema with mixed description content, repeatable topic sections, and dedicated hero media.'),
        content: post.content,
        publishedDate: post.publishedDate,
        isFeatured: post.isFeatured,
        featuredImage: featuredImage.id,
        thumbnailImage: thumbnailImage.id,
        category: categoriesByName[post.category].documentId,
        tags: post.tags.map((tagName) => tagsByName[tagName].documentId),
      },
    });

    await strapi.documents('api::blog-post.blog-post').publish({
      documentId: draftEntry.documentId,
    });

    created[post.slug] = draftEntry;
  }

  return created;
}

async function createHomePage(strapi, categoriesByName, tagsByName, postsBySlug) {
  const featuredPosts = [
    postsBySlug['designing-a-blog-schema-that-survives-real-deployments'].documentId,
    postsBySlug['running-strapi-in-ci-without-surprises'].documentId,
    postsBySlug['when-to-use-manual-featured-posts-instead-of-auto-lists'].documentId,
  ];

  await strapi.documents('api::blog-home-page.blog-home-page').create({
    data: {
      heroMode: 'manual',
      manualLatestPost: postsBySlug['running-strapi-in-ci-without-surprises'].documentId,
      featuredPosts,
      sections: [
        {
          title: 'Engineering Picks',
          description: 'Posts filtered from the Engineering category.',
          sourceType: 'category',
          category: categoriesByName.Engineering.documentId,
          maxItems: 4,
          sortBy: 'dateDesc',
        },
        {
          title: 'Tagged: Strapi',
          description: 'Posts tagged for Strapi-specific content.',
          sourceType: 'tag',
          tag: tagsByName.Strapi.documentId,
          maxItems: 4,
          sortBy: 'dateDesc',
        },
        {
          title: 'Editor Selection',
          description: 'Manually curated posts for the current campaign.',
          sourceType: 'manual',
          manualPosts: [
            postsBySlug['designing-a-blog-schema-that-survives-real-deployments'].documentId,
            postsBySlug['practical-api-design-for-blog-listing-endpoints'].documentId,
            postsBySlug['observability-basics-for-content-platforms'].documentId,
          ],
          maxItems: 3,
          sortBy: 'dateDesc',
        },
        {
          title: 'Latest Posts',
          description: 'Most recent published posts across the site.',
          sourceType: 'latest',
          maxItems: 6,
          sortBy: 'dateDesc',
        },
      ],
    },
  });
}

async function seed() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await clearExistingContent(app);
    const categoriesByName = await createCategories(app);
    const tagsByName = await createTags(app);
    const postsBySlug = await createPosts(app, categoriesByName, tagsByName);
    await createHomePage(app, categoriesByName, tagsByName, postsBySlug);

    console.log('Seeded blog test data successfully.');
  } finally {
    try {
      await app.destroy();
    } catch (error) {
      if (error.message !== 'aborted') {
        throw error;
      }
    }
  }
}

seed().catch((error) => {
  console.error('Failed to seed blog test data.');
  console.error(error);
  process.exit(1);
});
