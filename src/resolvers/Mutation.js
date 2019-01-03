import bcrypt from 'bcryptjs';
import getUserId from '../utils/getUserId';
import generateToken from '../utils/generateToken';
import hashPassword from '../utils/hashPassword';

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

    // Check if the own the tank profile
    const ownsTank = tank.profile.author.id === userId;
    if (!ownsTank) {
      throw new Error("You don't have permission to delete this tank profile!");
    }

    return prisma.mutation.deleteTank({ where }, info);
  },
  async createTankPost(parent, args, { prisma, request }, info) {
    //Authorize user
    const userId = getUserId(request);
    // Create post
    const tankPost = await prisma.mutation.createTankPost(
      {
        data: {
          ...args.data
        }
      },
      info
    );

    return tankPost;
  },
  async createTankReply(parent, args, { prisma, request }, info) {
    //Authorize user
    const userId = getUserId(request);
    // Create post
    const tankReply = await prisma.mutation.createTankReply(
      {
        data: {
          ...args.data
        }
      },
      info
    );

    return tankReply;
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
