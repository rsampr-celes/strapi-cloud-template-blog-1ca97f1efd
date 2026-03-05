'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

const defaultPopulate = {
  heroImage: true,
  featuredImage: true,
  thumbnailImage: true,
  category: true,
  tags: true,
  descriptionBlocks: {
    on: {
      'shared.rich-text-block': true,
      'shared.image-block': {
        populate: ['image'],
      },
    },
  },
  topics: {
    populate: ['image'],
  },
};

module.exports = createCoreController('api::blog-post.blog-post', () => ({
  async find(ctx) {
    if (!ctx.query.populate) {
      ctx.query.populate = defaultPopulate;
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    if (!ctx.query.populate) {
      ctx.query.populate = defaultPopulate;
    }

    return super.findOne(ctx);
  },
}));
