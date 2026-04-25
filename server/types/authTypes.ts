export type UserSession = {
	id: string
	email: string
	username: string
	communityId: number | null
	role: string
}

export type LoginTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserTokens = UserSession & LoginTokens;