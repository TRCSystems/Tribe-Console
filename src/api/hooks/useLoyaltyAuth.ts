// src/api/hooks/useLoyaltyAuth.ts
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useUserActions } from "@/store/userStore";
import authService from "../services/authService";

export const useLoyaltyLogin = () => {
	const navigate = useNavigate();
	const { setUserToken, setUserInfo } = useUserActions();

	const loginMutation = useMutation({
		mutationFn: authService.loyaltyLogin,
		onSuccess: (data: any) => {
			const accessToken = data?.accessToken || data?.token;
			const refreshToken = data?.refreshToken;
			const userInfo = data?.user || data;

			if (accessToken) {
				setUserToken({ accessToken, refreshToken });
			}

			if (userInfo?.id && userInfo?.username) {
				setUserInfo({
					id: userInfo.id,
					username: userInfo.username,
					email: userInfo.email || "",
					role: userInfo.role || "USER",
				});
			}

			toast.success("Login successful!");
			navigate("/workbench");
		},
		onError: (error: Error) => {
			toast.error(`Login failed: ${error.message}`);
		},
	});

	const loyaltyLogin = async (username: string, password: string) => {
		return loginMutation.mutateAsync({ username, password });
	};

	return {
		loyaltyLogin,
		isLoading: loginMutation.isPending,
		error: loginMutation.error,
	};
};
