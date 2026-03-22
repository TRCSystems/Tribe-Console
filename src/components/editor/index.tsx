/* eslint-disable import/order */
import "@/utils/highlight";
import ReactQuill from "react-quill";
import { StyledEditor } from "./styles";
import Toolbar, { formats } from "./toolbar";

interface Props {
	sample?: boolean;
	id?: string;
	value?: string;
	onChange?: (value: string) => void;
}
export default function Editor({ id = "slash-quill", sample = false, ...other }: Props) {
	const modules = {
		toolbar: {
			container: `#${id}`,
		},
		history: {
			delay: 500,
			maxStack: 100,
			userOnly: true,
		},
		syntax: true,
		clipboard: {
			matchVisual: false,
		},
	};
	return (
		<StyledEditor>
			<Toolbar id={id} isSimple={sample} />
			<ReactQuill modules={modules} formats={formats} {...other} placeholder="Write something awesome..." />
		</StyledEditor>
	);
}
