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
  },
  async createFeed(parent, { data }, { prisma, request }, info) {
    //Authenticate user
    const userId = getUserId(request);

    const feed = await prisma.mutation.createFeed(
      {
        data: {
          author: {
            connect: {
              id: userId
            }
          },
          message: data.message,
          images: {
            create: {
              url: data.url
            }
          }
        }
      },
      info
    );

    return feed;
  },
  async deleteFeed(parent, { id }, { prisma, request }, info) {
    const userId = getUserId(request);

    const where = { id };
    const feed = await prisma.query.feed(
      {
        where
      },
      `{ author { id }}`
    );

    const ownsFeed = feed.author.id === userId;
    if (!ownsFeed) {
      throw new Error("You don't have permission to delete this feed!");
    }

    return prisma.mutation.deleteFeed({ where }, info);
  },
  async createFeedComment(parent, { data }, { prisma, request }, info) {
    //authenticate the user
    const userId = getUserId(request);
    //need: AuthorID, FeedID,

    const comment = await prisma.mutation.createFeedComment(
      {
        data: {
          body: data.body,
          author: {
            connect: {
              id: userId
            }
          },
          feed: {
            connect: {
              id: data.feedId
            }
          }
        }
      },
      info
    );

    return comment;
  },

  async deleteFeedComment(parent, { id }, { prisma, request }, info) {
    const userId = getUserId(request);

    //Get author for the feed comment
    const where = { id };
    const feedComment = await prisma.query.feedComment(
      { where },
      `{author { id }}`
    );
    // Check if user owns feed comment
    const ownsFeedComment = feedComment.author.id === userId;

    if (!ownsFeedComment) {
      throw new Error("You don't have permission to delete this comment!");
    }

    return prisma.mutation.deleteFeedComment({ where }, info);
  },
  async updateFeedComment(parent, { data }, { prisma, request }, info) {
    const { body, feedCommentId } = data;

    const userId = getUserId(request);

    //Get author for the feed comment
    const feedComment = await prisma.query.feedComment(
      { where: { id: feedCommentId } },
      `{author { id }}`
    );

    //Check if user owns feed comment
    const ownsFeedComment = feedComment.author.id === userId;

    if (!ownsFeedComment) {
      throw new Error("You don't have permission to update this comment!");
    }

    return prisma.mutation.updateFeedComment(
      {
        where: { id: feedCommentId },
        data: {
          body
        }
      },
      info
    );
  },

  async createFeedCommentReply(parent, { data }, { prisma, request }, info) {
    const userId = getUserId(request);

    const reply = await prisma.mutation.createFeedCommentReply({
      data: {
        author: {
          connect: {
            id: userId
          }
        },
        comment: {
          connect: {
            id: data.commentId
          }
        },
        body: data.body
      }
    });

    return reply;
  },
  async deleteFeedCommentReply(parent, { id }, { prisma, request }, info) {
    const userId = getUserId(request);

    const where = { id };
    // Get reply for feed comment
    const commentReply = await prisma.query.feedCommentReply(
      { where },
      `{author { id}}`
    );

    const ownsCommentReply = userId === commentReply.author.id;

    if (!ownsCommentReply) {
      throw new Error("You don't have permission to delete this reply!");
    }

    return prisma.mutation.deleteFeedCommentReply({ where }, info);
  },
  async updateFeedCommentReply(parent, { data }, { prisma, request }, info) {
    const { body, feedCommentReplyId } = data;

    const userId = getUserId(request);

    //Get author for the feed comment
    const feedCommentReply = await prisma.query.feedCommentReply(
      { where: { id: feedCommentReplyId } },
      `{author { id }}`
    );

    //Check if user owns feed comment
    const ownsFeedCommentReply = feedCommentReply.author.id === userId;

    if (!ownsFeedCommentReply) {
      throw new Error("You don't have permission to update this comment!");
    }

    return prisma.mutation.updateFeedCommentReply(
      {
        where: { id: feedCommentReplyId },
        data: {
          body
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
