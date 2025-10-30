//[file name]: debug-auth.tsx
//[file content begin]
import { useEffect } from "react";
import { useUserToken } from "@/store/userStore";

export const DebugAuth = () => {
	const { accessToken } = useUserToken();

	useEffect(() => {
		console.log("🛠️ DEBUG - Current token state:", accessToken);

		const stored = localStorage.getItem("userStore");
		if (stored) {
			const parsed = JSON.parse(stored);
			console.log("🛠️ DEBUG - LocalStorage state:", parsed);
		} else {
			console.log("🛠️ DEBUG - No userStore in localStorage");
		}
	}, [accessToken]);

	return null;
};
//[file content end]
