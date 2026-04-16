export default defineEventHandler(async (event) => {
  try {
    return await signOutRequest(event);
  } catch (error: Error | any) {
    return createError({
      statusCode: 500,
      message: error.message,
    });
  }
});
