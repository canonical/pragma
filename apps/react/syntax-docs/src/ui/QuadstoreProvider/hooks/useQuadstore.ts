import { useContext } from "react";
import Context from "../Context.js";

const useQuadstore = () => {
	const context = useContext(Context);
	if (!context) {
		throw new Error(
			"useQuadstore must be used within a QuadstoreProvider component",
		);
	}
	return context;
};

export default useQuadstore;
