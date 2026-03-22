// src/components/electron/FileImporter.tsx

import { UploadOutlined } from "@ant-design/icons";
import { Button, Modal, message, Progress, Space } from "antd";
import type React from "react";
import { useState } from "react";
import { ElectronFileSystem, useElectron } from "@/utils/electronUtils";

interface FileImporterProps {
	onFileImported: (content: string, fileName: string) => void;
	buttonText?: string;
}

export const FileImporter: React.FC<FileImporterProps> = ({ onFileImported, buttonText = "Import File" }) => {
	const { isAvailable, api } = useElectron();
	const [importing, setImporting] = useState(false);
	const [progress, setProgress] = useState(0);
	const [modalVisible, setModalVisible] = useState(false);

	const handleElectronImport = async () => {
		if (!isAvailable || !api) {
			message.error("Desktop features not available in browser");
			return;
		}

		try {
			setImporting(true);
			setModalVisible(true);
			setProgress(30);

			const content = await ElectronFileSystem.importCSV();

			setProgress(70);

			const fileName = api.basename(content);

			setProgress(100);

			setTimeout(() => {
				onFileImported(content, fileName);
				setModalVisible(false);
				message.success(`File "${fileName}" imported successfully`);
			}, 500);
		} catch (error: any) {
			message.error(`Import failed: ${error.message}`);
		} finally {
			setImporting(false);
			setProgress(0);
		}
	};

	const handleBrowserUpload = () => {
		message.info("Please use the desktop app for file import features");
	};

	if (isAvailable) {
		return (
			<>
				<Button
					type="primary"
					icon={<UploadOutlined />}
					onClick={handleElectronImport}
					loading={importing}
					disabled={importing}
				>
					{buttonText}
				</Button>

				<Modal title="Importing File" open={modalVisible} footer={null} closable={false}>
					<Space direction="vertical" style={{ width: "100%" }}>
						<Progress percent={progress} status="active" />
						<p>Reading file content...</p>
					</Space>
				</Modal>
			</>
		);
	}

	return (
		<Button icon={<UploadOutlined />} onClick={handleBrowserUpload}>
			{buttonText} (Web)
		</Button>
	);
};
