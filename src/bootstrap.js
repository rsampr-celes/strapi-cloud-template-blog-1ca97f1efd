'use strict';

async function removePublicWebsiteAccess(strapi) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const usersPermissionsService = strapi
    .plugin('users-permissions')
    .service('users-permissions');
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) {
    return;
  }

  await roleService.updateRole(publicRole.id, {
    name: publicRole.name,
    description: publicRole.description,
    permissions: usersPermissionsService.getActions({ defaultEnable: false }),
  });
}

async function removeBlogReaderRole(strapi) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const blogReaderRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'blog-reader' },
  });
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!blogReaderRole || !publicRole) {
    return;
  }

  await roleService.deleteRole(blogReaderRole.id, publicRole.id);
}

module.exports = async ({ strapi }) => {
  await removePublicWebsiteAccess(strapi);
  await removeBlogReaderRole(strapi);
};
