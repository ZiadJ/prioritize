export default defineEventHandler(async (event) => {
  try {
    return await handleRefreshToken(event);
  } catch (err: Error | any) {
    console.error(err);
    return createError({
      statusCode: 500,
      message: err.message,
    });
  }
});
