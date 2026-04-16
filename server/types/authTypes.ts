export type UserSession = {
  id: number;
  email: string;
  username: string;
};

export type LoginTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserTokens = UserSession & LoginTokens;