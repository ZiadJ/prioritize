import prisma from "../../../lib/prisma";
import type { UsersResponse } from "../../types/userTypes";

export default defineEventHandler(async (event): Promise<UsersResponse> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstname: true,
        lastname: true,
        bio: true,
        picture: true,
        isActive: true,
        createdAt: true,
        lastTimeVisit: true,
        isVerified: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      users,
    };
  } catch (error: Error | any) {
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
});