import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import inventoryService, {
	type BatchAddDefaultsSelection,
	type BatchAddDefaultsResponse,
	type ProductDefault,
} from "@/api/services/inventoryService";

export const useProductDefaults = (enabled = true) =>
	useQuery<ProductDefault[]>({
		queryKey: ["product-defaults"],
		queryFn: () => inventoryService.getProductDefaults(),
		enabled,
		staleTime: 5 * 60 * 1000,
	});

export const useBatchAddDefaults = () => {
	const queryClient = useQueryClient();

	return useMutation<BatchAddDefaultsResponse, Error, { selections: BatchAddDefaultsSelection[] }>({
		mutationFn: (payload) => inventoryService.batchAddDefaults(payload),
		onSuccess: () => {
			// Refresh inventory list after adding templates
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
		},
	});
};

export default {
	useProductDefaults,
	useBatchAddDefaults,
};
