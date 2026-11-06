import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <p>
      Page not found. <Link to="/">Go home</Link>
    </p>
  );
}
