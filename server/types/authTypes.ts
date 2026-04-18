export type UserSession = {
	id: string;
	email: string;
	username: string;
};

export type LoginTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserTokens = UserSession & LoginTokens;