/* import { postRouter } from "~/server/api/routers/post";
 */import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "./routers/users";
import { companyRouter } from "./routers/company";
import { invoiceDefaultsRouter } from "./routers/invoice-defaults";
import { invoiceRouter } from "./routers/invoice";
import { customerRouter } from "./routers/customer";
import { invoiceNumberingRouter } from "./routers/invoice-numbering";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  company: companyRouter,
  invoiceDefaults: invoiceDefaultsRouter,
  invoice: invoiceRouter,
  customer: customerRouter,
  invoiceNumbering: invoiceNumberingRouter,

});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
