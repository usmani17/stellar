import { NotFound } from "../pages/NotFound";
import { Route } from "react-router-dom";

function NotFoundRoutes() {
    return (
        <>
            <Route path="*" element={<NotFound />} />
        </>
    );
}

export default NotFoundRoutes;
