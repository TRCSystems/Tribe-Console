import { useRef } from "react";
import type { ReceiptData } from "@/types/pos";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Text, Title } from "@/ui/typography";

interface ReceiptProps {
	data: ReceiptData;
	onPrint?: () => void;
	onDownload?: () => void;
}

export function Receipt({ data, onPrint, onDownload }: ReceiptProps) {
	const receiptRef = useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
		} else {
			window.print();
		}
	};

	const handleDownload = () => {
		if (onDownload) {
			onDownload();
		} else {
			// Simple download as text for now
			const receiptText = `
RECEIPT #${data.receiptNumber}
Date: ${data.date}
Phone: ${data.phoneNumber}

ITEMS:
${data.items.map((item) => `${item.name} x${item.quantity} - KES ${(item.price * item.quantity).toLocaleString()}`).join("\n")}

Subtotal: KES ${data.subtotal.toLocaleString()}
Tax: KES ${data.tax.toLocaleString()}
TOTAL: KES ${data.total.toLocaleString()}

Payment: ${data.paymentMethod}
${data.transactionId ? `Transaction ID: ${data.transactionId}` : ""}

Thank you for your business!
      `.trim();

			const blob = new Blob([receiptText], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `receipt-${data.receiptNumber}.txt`;
			a.click();
			URL.revokeObjectURL(url);
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto print:shadow-none print:border-0" ref={receiptRef}>
			<CardContent className="p-6 print:p-4">
				{/* Receipt Header */}
				<div className="text-center border-b border-gray-200 pb-4 mb-4 print:border-b-2">
					<Title as="h2" className="text-xl font-bold text-gray-900">
						DayWorks LTD
					</Title>
					<Text variant="body2" className="text-gray-600">
						Loyalty Engine POS
					</Text>
					<Text variant="caption" className="text-gray-500">
						Nairobi, Kenya
					</Text>
				</div>

				{/* Receipt Info */}
				<div className="space-y-2 mb-4">
					<div className="flex justify-between">
						<Text variant="body2" className="text-gray-600">
							Receipt #
						</Text>
						<Text variant="body2" className="font-semibold">
							{data.receiptNumber}
						</Text>
					</div>
					<div className="flex justify-between">
						<Text variant="body2" className="text-gray-600">
							Date
						</Text>
						<Text variant="body2">{data.date}</Text>
					</div>
					<div className="flex justify-between">
						<Text variant="body2" className="text-gray-600">
							Phone
						</Text>
						<Text variant="body2">{data.phoneNumber}</Text>
					</div>
				</div>

				{/* Items List */}
				<div className="border-y border-gray-200 py-4 my-4">
					<div className="space-y-3">
						{data.items.map((item) => (
							<div key={`item-${item.name}`} className="flex justify-between items-start">
								<div className="flex-1">
									<Text variant="body2" className="font-medium">
										{item.name}
									</Text>
									<Text variant="caption" className="text-gray-500">
										{item.quantity} x KES {item.price.toLocaleString()}
									</Text>
								</div>
								<Text variant="body2" className="font-semibold">
									KES {(item.price * item.quantity).toLocaleString()}
								</Text>
							</div>
						))}
					</div>
				</div>

				{/* Totals */}
				<div className="space-y-2 mb-4">
					<div className="flex justify-between">
						<Text variant="body2" className="text-gray-600">
							Subtotal
						</Text>
						<Text variant="body2">KES {data.subtotal.toLocaleString()}</Text>
					</div>
					<div className="flex justify-between">
						<Text variant="body2" className="text-gray-600">
							Tax (16%)
						</Text>
						<Text variant="body2">KES {data.tax.toLocaleString()}</Text>
					</div>
					<div className="flex justify-between border-t border-gray-200 pt-2">
						<Text variant="body2" className="font-semibold">
							TOTAL
						</Text>
						<Text variant="body2" className="font-bold text-lg">
							KES {data.total.toLocaleString()}
						</Text>
					</div>
				</div>

				{/* Payment Method */}
				<div className="border-t border-gray-200 pt-4 mb-4">
					<div className="flex justify-between">
						<Text variant="body2" className="text-gray-600">
							Payment Method
						</Text>
						<Text variant="body2" className="font-semibold capitalize">
							{data.paymentMethod}
						</Text>
					</div>
					{data.transactionId && (
						<div className="flex justify-between mt-1">
							<Text variant="body2" className="text-gray-600">
								Transaction ID
							</Text>
							<Text variant="caption" className="font-mono">
								{data.transactionId}
							</Text>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="text-center border-t border-gray-200 pt-4">
					<Text variant="caption" className="text-gray-500">
						Thank you for your business!
					</Text>
					<Text variant="caption" className="text-gray-400 block mt-1">
						Contact: +254 700 000 000
					</Text>
				</div>

				{/* Action Buttons - Hidden when printing */}
				<div className="flex gap-3 mt-6 print:hidden">
					<Button onClick={handlePrint} className="flex-1" variant="outline">
						Print Receipt
					</Button>
					<Button onClick={handleDownload} className="flex-1">
						Download Receipt
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
