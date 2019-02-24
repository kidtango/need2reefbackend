import bcrypt from 'bcryptjs';
import getUserId from '../utils/getUserId';
import generateToken from '../utils/generateToken';
import hashPassword from '../utils/hashPassword';
import { concatSeries } from 'async';

const Mutation = {
  async createUser(parent, args, { prisma, response }, info) {
    args.data.email = args.data.email.toLowerCase();
    const password = await hashPassword(args.data.password);
    const user = await prisma.mutation.createUser({
      data: {
        ...args.data,
        password,
        permission: 'USER'
      }
    });

    // console.log(user.id);
    // create aquarium profile for user
    await prisma.mutation.createProfile({
      data: {
        author: {
          connect: {
            id: user.id
          }
        }
      }
    });

    return {
      user,
      token: generateToken(user.id)
    };
  },
  async login(parent, args, { prisma }, info) {
    const user = await prisma.query.user({
      where: {
        email: args.data.email
      }
    });

    if (!user) {
      throw new Error('Unable to login');
    }

    const isMatch = await bcrypt.compare(args.data.password, user.password);

    if (!isMatch) {
      throw new Error('Unable to login');
    }

    return {
      user,
      token: generateToken(user.id)
    };
  },
  async createTank(parent, { data }, { prisma, request }, info) {
    const userId = getUserId(request);

    const tank = await prisma.mutation.createTank(
      {
        data: {
          title: data.title,
          profile: {
            connect: {
              id: data.profileId
            }
          }
        }
      },
      info
    );

    return tank;
  },
  async deleteTank(parent, { id }, { prisma, request }, info) {
    const userId = getUserId(request);

    const where = { id };
    const tank = await prisma.query.tank(
      { where },
      `{ profile { author { id } }}`
    );

    // Check if they own the tank profile
    const ownsTank = tank.profile.author.id === userId;
    if (!ownsTank) {
      throw new Error("You don't have permission to delete this tank profile!");
    }

    return prisma.mutation.deleteTank({ where }, info);
  },
  async createTankPost(parent, { data }, { prisma, request }, info) {
    //Authorize user
    const userId = getUserId(request);
    // Create post
    const tankPost = await prisma.mutation.createTankPost(
      {
        data: {
          body: data.body,
          tank: {
            connect: {
              id: data.tankId
            }
          },
          author: {
            connect: {
              id: userId
            }
          }
        }
      },
      info
    );

    return tankPost;
  },
  async deleteTankPost(parent, { id }, { prisma, request }, info) {
    const userId = getUserId(request);

    //get author of the post
    const where = { id };
    const post = await prisma.query.tankPost({ where }, `{ author { id } }`);

    //Chek if they own tankPost
    const ownsPost = post.author.id === userId;

    if (!ownsPost) {
      throw new Error("You don't have permission to delete this comment!");
    }

    return prisma.mutation.deleteTankPost({ where }, info);
  },
  async updateTankPost(parent, args, { prisma, request }, info) {
    const { postId, body } = args.data;
    const userId = getUserId(request);

    const post = await prisma.query.tankPost(
      { where: { id: postId } },
      `{author { id }}`
    );

    const ownsPost = post.author.id === userId;
    if (!ownsPost) {
      throw new Error("You don't have permission to update this comment!");
    }

    return prisma.mutation.updateTankPost({
      where: {
        id: postId
      },
      data: {
        body
      }
    });
  },
  async createTankReply(parent, { data }, { prisma, request }, info) {
    //Check if user is logged in
    const userId = getUserId(request);
    // Create post
    const tankReply = await prisma.mutation.createTankReply(
      {
        data: {
          body: data.body,
          author: {
            connect: {
              id: userId
            }
          },
          post: {
            connect: {
              id: data.postId
            }
          }
        }
      },
      info
    );

    return tankReply;
  },
  async deleteTankReply(parent, { id }, { prisma, request }, info) {
    // Check if user is logged in
    const userId = getUserId(request);

    const where = { id };

    const reply = await prisma.query.tankReply({ where }, `{ author { id } }`);

    const ownsReply = reply.author.id === userId;

    if (!ownsReply) {
      throw new Error("You don't have permission to delete this reply!");
    }

    return prisma.mutation.deleteTankReply({ where }, info);
  },
  async updateTankReply(parent, args, { prisma, request }, info) {
    // destructuring data
    const { replyId, body } = args.data;

    //Authenticate user
    const userId = getUserId(request);

    // Get reply
    const reply = await prisma.query.tankReply(
      {
        where: { id: replyId }
      },
      `{author { id } }`
    );

    const ownsReply = reply.author.id === userId;

    if (!ownsReply) {
      throw new Error("You don't have permission to delete this reply!");
    }

    return prisma.mutation.updateTankReply(
      {
        where: { id: replyId },
        data: {
          body
        }
      },
      info
    );
  },
  async createTankImage(parent, { data }, { prisma, request }, info) {
    const { tankId, url } = data;

    const userId = getUserId(request);

    const where = { id: tankId };

    const tankProfile = await prisma.query.tank(
      {
        where
      },
      `{profile { author { id }}}`
    );

    const tankAuthorId = tankProfile.profile.author.id;

    const ownsTankProfile = tankAuthorId === userId;

    if (!ownsTankProfile) {
      throw new Error("You don't have permission to edit this profile");
    }

    return prisma.mutation.createTankImage(
      {
        data: {
          url,
          tank: {
            connect: {
              id: tankId
            }
          }
        }
      },
      info
    );
  }
};

export { Mutation as default };

//   async deleteUser(parent, args, { prisma, request }, info) {
//     const userId = getUserId(request);

//     return prisma.mutation.deleteUser(
//       {
//         where: {
//           id: userId
//         }
//       },
//       info
//     );
//   },
//   async updateUser(parent, args, { prisma, request }, info) {
//     constaaaaa userId = getUserId(request);

//     if (typeof args.data.password === 'string') {
//       args.data.password = await hashPassword(args.data.password);
//     }

//     return prisma.mutation.updateUser(
//       {
//         where: {
//           id: userId
//         },
//         data: args.data
//       },
//       info
//     );
//   }
