import { z } from 'zod';
import { deletionShape, idSchema, pageMetaShape } from './common.schema';

const reactionsSchema = z.object({
  likes: z.number().int().nonnegative(),
  dislikes: z.number().int().nonnegative(),
});

export const postSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)),
  reactions: reactionsSchema,
  views: z.number().int().nonnegative(),
  userId: idSchema,
});

export const postsPageSchema = z.object({
  posts: z.array(postSchema),
  ...pageMetaShape,
});

export const partialPostsPageSchema = z.object({
  posts: z.array(z.looseObject({ id: idSchema })),
  ...pageMetaShape,
});

export const createdPostSchema = z.object({
  id: idSchema,
  title: z.string(),
  body: z.string(),
  userId: idSchema,
  tags: z.array(z.string()).optional(),
  reactions: reactionsSchema.optional(),
});

export const updatedPostSchema = postSchema.omit({ views: true });

export const deletedPostSchema = postSchema.extend(deletionShape);

export const tagListSchema = z.array(z.string().min(1)).nonempty();

export type Post = z.infer<typeof postSchema>;
