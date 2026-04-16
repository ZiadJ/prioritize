export default defineEventHandler(async (event) => {
  // catch errors from SignInRequest
  try {
    return await SignInRequest(event);
  } catch (error: Error | any) {
    return createError({
      statusCode: 500,
      message: error.message,
    });
  }
});
