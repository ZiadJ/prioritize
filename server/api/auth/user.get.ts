export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthUser(event);
    return {
      user,
    };
  } catch (error : Error | any) {
    return createError({
      statusCode: 500,
      message: error.message,
    });
  }
});
