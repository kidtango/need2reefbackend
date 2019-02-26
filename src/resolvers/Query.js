import getUserId from '../utils/getUserId';
import { forwardTo } from 'prisma-binding';

const Query = {
  users(parent, args, { prisma }, info) {
    const opArgs = {
      first: args.first,
      skip: args.skip,
      after: args.after,
      orderBy: args.orderBy
    };

    if (args.query) {
      opArgs.where = {
        OR: [
          {
            name_contains: args.query
          }
        ]
      };
    }

    return prisma.query.users(opArgs, info);
  },
  async me(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);

    const me = await prisma.query.user(
      {
        where: {
          id: userId
        }
      },
      info
    );

    return me;
  },
  async profile(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);

    const profile = await prisma.query.profile(
      {
        where: {
          id: args.id
        }
      },
      info
    );

    return profile;
  },
  tankPosts: forwardTo('prisma'),
  tanksConnection: forwardTo('prisma'),
  tankPostsConnection: forwardTo('prisma'),
  feedsConnection: forwardTo('prisma'),
  feedCommentsConnection: forwardTo('prisma')
};

export { Query as default };
