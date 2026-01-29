// src/api/services/userService.ts - FINAL VERSION
import { loyaltyApiClient } from "../apiClient";

export interface SignInReq {
	username: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}

export interface CreateUserReq {
	username: string;
	password: string;
	role: string;
	status: string;
	merchantId?: string;
}

export interface SignInRes {
	status: string;
	message: string;
	respObject: {
		key: string;
		value: string;
	};
}

export interface ApiResponse<T = any> {
	status: string;
	message: string;
	respObject?: T;
}

export interface UpdateUserDto {
	id: string;
	attributeName: string;
	attributeValue: string;
}

export enum UserApi {
	SignIn = "/login",
	SignUp = "/user/add",
	Update = "/user/update",
	GetById = "/user/get/by-id",
	GetAll = "/user/get/all",
	GetByRole = "/user/get/by-role",
}

const signin = (data: SignInReq) => loyaltyApiClient.post<SignInRes>({ url: UserApi.SignIn, data });

const signup = (data: SignUpReq) => loyaltyApiClient.post<SignInRes>({ url: UserApi.SignUp, data });

const logout = () => loyaltyApiClient.get({ url: "/logout" });

const getUserById = (userId: number) =>
	loyaltyApiClient.get<ApiResponse>({
		url: `${UserApi.GetById}/${userId}`,
	});

const getAllUsers = () =>
	loyaltyApiClient.get<ApiResponse>({
		url: UserApi.GetAll,
	});

// FIXED: Correct implementation using POST with role in request body
const getUsersByRole = (role: string) =>
	loyaltyApiClient.post<ApiResponse>({
		url: UserApi.GetByRole,
		data: role,
		headers: {
			"Content-Type": "application/json",
		},
	});

const updateUser = (data: UpdateUserDto) =>
	loyaltyApiClient.put<ApiResponse>({
		url: UserApi.Update,
		data,
	});

const createUser = (data: CreateUserReq) =>
	loyaltyApiClient.post<ApiResponse>({
		url: UserApi.SignUp,
		data,
	});

export default {
	signin,
	signup,
	logout,
	getUserById,
	getAllUsers,
	getUsersByRole,
	updateUser,
	createUser,
};
