import { H3Event, createError } from "h3";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { loginSchema, registerSchema } from "../validation/schemas";
import { UserSession } from "../types/authTypes";
import { compare, hash } from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "generate JWT_SECRET";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "generate REFRESH_SECRET";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
const REMEMBER_ME_REFRESH_TOKEN_TTL = process.env.REMEMBER_ME_REFRESH_TOKEN_TTL || "30d";

/**
 * Request sign up user
 * @param event H3Event
 * @returns  UserTokens user = {id, email, username, accessToken, refreshToken}
 * @throws 401 Invalid email or password
 * @throws 401 Invalid email or password
 */
export const SignInRequest = async (event: H3Event) => {
  const { email, password, remember } = await validateLoginBody(event);
  const user = await getUserByEmail(email);
  await validatePassword(password, user.password);
  const { accessToken, refreshToken } = generateTokens(user.id, remember);
  await clearAndStoreTokens(user.id, accessToken, refreshToken, remember);

  // Retorna la respuesta final
  return {
    message: "Login successful.",
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Sign out user from request
 * @param event H3Event
 * @returns  { message: "You have successfully signed out." }
 * @throws 500 An error occurred while signing out.
 */
export const signOutRequest = async (event: H3Event) => {
  const accessToken = getTokenHeader(event);
  const jwtTokenValidated = await verifyToken(accessToken);
  const tokenData = await prisma.token.findFirst({
    where: { accessToken: accessToken },
  });
  if (!tokenData) {
    throw createError({
      statusCode: 500,
      message: "An error occurred while signing out.",
    });
  }
  await prisma.token.delete({
    where: { id: tokenData.id },
  });
  return { message: "You have successfully signed out." };
};
/**
 * Sign up user from request
 * @param event H3Event
 * @returns  UserSession user = {id, email, username}
 * @throws 400 The email is already in use.
 * @throws 400 The username is already in use.
 */
export const signUpRequest = async (event: H3Event) => {
  const body = await readBody(event);
  registerSchema.parse(body);
  const { email, password, username } = body;
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw createError({
      statusCode: 400,
      message: "The email is already in use.",
    });
  }
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw createError({
      statusCode: 400,
      message: "The username is already in use.",
    });
  }
  const hashedPassword = await hash(password, 10);
  const User = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
    },
  });
  return {
    message: "You have successfully signed up.",
    user: {
      id: User.id,
      email: User.email,
      name: User.name,
    },
  };
};

export const handleRefreshToken = async (event: H3Event) => {
  const body = await readBody(event);
  const { refreshToken } = body;
  if (!refreshToken) {
    return createError({
      statusCode: 400,
      message: "Refresh token is required.",
    });
  }

  const tokenData = await prisma.token.findUnique({
    where: { refreshToken },
  });

  if (!tokenData) {
    return createError({
      statusCode: 400,
      message: "Invalid refresh token.",
    });
  }
  const oldAccessToken = getTokenHeader(event);
  const decode = (await validateRefreshToken(refreshToken)) as JwtPayload;
  const newATkn = returnToken(decode.id);
  await prisma.token.update({
    where: { accessToken: oldAccessToken },
    data: {
      accessToken: newATkn,
    },
  });
  return { accessToken: newATkn };
};

/**
 *  Get user from request
 * @param event H3Event
 * @returns  UserSession user = {id, email, username}
 * @throws 401 Authorization token is missing or invalid
 */
export const getAtuhUser = async (event: H3Event): Promise<UserSession> => {
  const jwtTokenValidated = await verifyToken(getTokenHeader(event));
  return await returnUserJwtPayload(jwtTokenValidated);
};

export const getTokenHeader = (event: H3Event) => {
  const authHeader = event.node.req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      message: "Authorization token is missing or invalid.",
    });
  }
  return authHeader.split(" ")[1];
};

/**
 * Verify token
 * @param token
 * @returns  JwtPayload
 * @throws 401 Token is not in the expected format
 * @throws 401 Invalid or expired token
 */
export const verifyToken = async (tkn: string): Promise<JwtPayload> => {
  try {
    const tokenData = await prisma.token.findFirst({
      where: { accessToken: tkn },
    });
    if (!tokenData) {
      throw createError({
        statusCode: 401,
        message: "unauthorized",
      });
    }
    const decoded = jwt.verify(tkn, JWT_SECRET);
    if (typeof decoded === "object" && decoded !== null) {
      return decoded as JwtPayload;
    }
    throw createError({
      statusCode: 401,
      message: "Token is not in the expected format.",
    });
  } catch (err) {
    throw createError({
      statusCode: 401,
      message: "Invalid or expired token.",
    });
  }
};

/**
 *  Return user jwt payload
 * @param jwtPayload
 * @returns  UserSession user = {id, email, username}
 * @throws 404 User not found
 *
 */
export const returnUserJwtPayload = async (
  jwtPayload: JwtPayload
): Promise<UserSession> => {
  const userId = jwtPayload.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found.",
    });
  }
  return user;
};

/**
 * Read body from request
 * @param event  H3Event
 * @returns  Promise<any> body from request
 * @throws 400 Invalid request body
 */
export const validateLoginBody = async (event: H3Event) => {
  const body = await readBody(event);
  loginSchema.parse(body); // Lanza error si no es válido
  return body;
};

// Busca un usuario por email
export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Invalid email or password.",
    });
  }
  return user;
};

// Valida la contraseña
export const validatePassword = async (password: string, hash: string) => {
  const isValid = await compare(password, hash);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: "Invalid email or password.",
    });
  }
};

// Genera tokens de acceso y de refresco
export const generateTokens = (userId: number, remember?: boolean) => {
  const refreshTtl = remember ? REMEMBER_ME_REFRESH_TOKEN_TTL : REFRESH_TOKEN_TTL;

  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  const refreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, {
    expiresIn: refreshTtl,
  });

  return { accessToken, refreshToken };
};

// Limpia tokens antiguos y almacena los nuevos
export const clearAndStoreTokens = async (
  userId: number,
  accessToken: string,
  refreshToken: string,
  remember?: boolean
) => {
  await prisma.token.deleteMany({
    where: { userId }, // Elimina todos los tokens anteriores
  });

  const ttl = remember
    ? 30 * 24 * 60 * 60 * 1000 // 30 días
    : 7 * 24 * 60 * 60 * 1000; // 7 días

  await prisma.token.create({
    data: {
      userId,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + ttl),
    },
  });
};

export const returnToken = (id: number): string => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
};

export const returnRefreshToken = (id: number): string => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
};

export const validateRefreshToken = async (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    return decoded;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw createError({
        statusCode: 401,
        message: "Refresh token has expired.",
      });
    }
    throw createError({
      statusCode: 401,
      message: "Invalid refresh token.",
    });
  }
};
