//[file name]: userService.ts
//[file content begin]
// src/api/services/userService.ts - UPDATED FOR ACTUAL API RESPONSE
import type { UserInfo, UserToken } from "#/entity";
import { loyaltyApiClient } from "../apiClient";

export interface SignInReq {
	username: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}

// UPDATED: Match the actual API response structure
export interface SignInRes {
	status: string;
	message: string;
	respObject: {
		key: string;
		value: string; // This is the JWT token
	};
}

export enum UserApi {
	SignIn = "/login",
	SignUp = "/user/add",
	Logout = "/logout",
	Refresh = "/refresh",
	User = "/user",
}

const signin = (data: SignInReq) => loyaltyApiClient.post<SignInRes>({ url: UserApi.SignIn, data });
const signup = (data: SignUpReq) => loyaltyApiClient.post<SignInRes>({ url: UserApi.SignUp, data });
const logout = () => loyaltyApiClient.get({ url: UserApi.Logout });
const findById = (id: string) => loyaltyApiClient.get<UserInfo[]>({ url: `${UserApi.User}/${id}` });

export default {
	signin,
	signup,
	findById,
	logout,
};
//[file content end]
