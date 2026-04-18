export type UserListItem = {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  bio: string;
  picture: string | null;
  isActive: boolean;
  createdAt: Date;
  lastTimeVisit: Date | null;
  isVerified: boolean;
};

export type UsersResponse = {
  users: UserListItem[];
};