import { z } from "zod";
export default defineEventHandler(async (event) => {
  try {
    return await signUpRequest(event);
  } catch (err : Error | any) {
    if (err instanceof z.ZodError ) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Validation error.",
          data: err.errors.map((e) => ({
            field: e.path[0],
            message: e.message,
          })),
        })
      );
    }
    return createError({
      statusCode: 400,
      message: err.message,
    });
  }
});
