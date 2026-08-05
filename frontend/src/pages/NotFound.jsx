import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section container" style={{ textAlign: "center", padding: "100px 20px" }}>
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Go Home
      </Link>
    </section>
  );
}
