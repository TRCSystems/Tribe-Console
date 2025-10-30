//[file name]: userStore.ts
//[file content begin]
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserInfo, UserToken } from "#/entity";
import userService, { type SignInReq } from "@/api/services/userService";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;
	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (token: UserToken) => void;
		clearUserInfoAndToken: () => void;
	};
};

const useUserStore = create<UserStore>()(
	persist(
		(set) => ({
			userInfo: {},
			userToken: {},
			actions: {
				setUserInfo: (userInfo) => {
					set({ userInfo });
				},
				setUserToken: (userToken) => {
					set({ userToken });
				},
				clearUserInfoAndToken() {
					set({ userInfo: {}, userToken: {} });
				},
			},
		}),
		{
			name: "userStore",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				userInfo: state.userInfo,
				userToken: state.userToken,
			}),
		},
	),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () => useUserStore((state) => state.userInfo?.permissions ?? []);
export const useUserRoles = () => useUserStore((state) => state.userInfo?.roles ?? []);
export const useUserActions = () => useUserStore((state) => state.actions);

export const useSignIn = () => {
	const { setUserToken, setUserInfo } = useUserActions();

	const signInMutation = useMutation({
		mutationFn: userService.signin,
	});

	const signIn = async (data: SignInReq) => {
		const signInPromise = signInMutation.mutateAsync(data);

		toast.promise(signInPromise, {
			loading: "Logging in...",
			success: (res) => {
				const { user, accessToken, refreshToken } = res;
				setUserToken({ accessToken, refreshToken });
				setUserInfo(user);
				return "Login successful!";
			},
			error: (err) => {
				return err?.message || "Login failed. Please try again.";
			},
		});

		return signInPromise;
	};

	return signIn;
};

export default useUserStore;
//[file content end]
