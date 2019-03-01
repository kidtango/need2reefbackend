import '@babel/polyfill/noConflict';
import server from './server';

// server.express.use(cookieParser());

// decode the JWT so we can user ID on each request
// server.express.use((req, res, next) => {
//   const { token } = req.cookies;
//   if (token) {
//     const { userId } = jwt.verify(token, process.env.JWT_SECRET);
//     // put the userId onto the req for future request to access
//     req.userId = userId;
//   }
//   next();
// });

// server.express.use(async (req, res, next) => {
//   if (!req.userId) return next();
//   const user = await prisma.query.user(
//     { where: { id: req.userId } },
//     '{id, email, name, permission}'
//   );
//   req.user = user;
//   next();
// });

// server.start(
//   {
//     cors: {
//       credentials: true,
//       origin: process.env.FRONTEND_URL
//     }
//   },
//   () => {
//     console.log('The server is up!');
//   }
// );

server.start(
  {
    port: process.env.PORT || 4000
  },
  () => {
    console.log('The server is up!');
  }
);
