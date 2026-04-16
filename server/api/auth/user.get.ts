export default defineEventHandler(async (event) => {
  try {
    const user = await getAtuhUser(event);
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
